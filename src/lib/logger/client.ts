// src/lib/logger/client.ts
//
// Browser-side logging facade.
//
// Design contract:
//   1. ZERO pino work at module load. `pino` is type-only-imported; the
//      runtime factory is loaded via `import("pino")` on first real use.
//   2. ZERO pino work unless logging is explicitly enabled. Default is
//      `enabled: false`, so importing this module in an app that never
//      calls `initLog({ enabled: true })` costs only boolean checks.
//   3. Every `log.*` call short-circuits when the logger is not yet
//      initialized. Safe to import and call from anywhere, including SSR.

import type { Logger, LoggerOptions } from "pino";

export const LOG_SERVICES = Object.freeze({
	DEFAULT: "default",
	SERVER: "server",
	WEB_CLIENT: "web__client",
	WEB_SERVER: "web__server"
});

export type LogService = (typeof LOG_SERVICES)[keyof typeof LOG_SERVICES];

export type HttpLogDrainOptions = {
	drain?: {
		credentials?: "omit" | "same-origin" | "include";
		endpoint: string;
		[key: string]: unknown;
	};
	[key: string]: unknown;
};

type ClientLoggerConfig = {
	batchedTransport?: HttpLogDrainOptions;
	console?: boolean;
	enabled?: boolean;
	minLevel?: LoggerOptions["level"];
	pretty?: boolean;
	service?: string;
};

type LogEvent = Record<string, unknown>;
type DispatchLevel = "debug" | "error" | "info" | "warn";

const DEFAULT_CLIENT_LOGGER_CONFIG = {
	service: LOG_SERVICES.DEFAULT
} satisfies ClientLoggerConfig;

// ─── Module state ───────────────────────────────────────────────────────────

let isInitialized = false;
let identityContext: LogEvent = {};
let loggerInstance: Logger | null = null;

// ─── Guards ─────────────────────────────────────────────────────────────────

function isBrowserRuntime(): boolean {
	return typeof window !== "undefined" && typeof document !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function getNumericProp(
	obj: Record<string, unknown>,
	key: string
): number | undefined {
	const value = obj[key];
	return typeof value === "number" ? value : undefined;
}

function getArrayProp(
	obj: Record<string, unknown>,
	key: string
): unknown[] | undefined {
	const value = obj[key];
	return Array.isArray(value) ? value : undefined;
}

// ─── Pino loading (dynamic, cached) ─────────────────────────────────────────
//
// Deferred until `initLog` actually builds a logger. The cached promise
// makes repeated `initLog` calls idempotent and cheap.

type PinoFactory = (options: LoggerOptions) => Logger;

let pinoFactoryPromise: Promise<PinoFactory> | null = null;

async function loadPinoFactory(): Promise<PinoFactory> {
	if (!pinoFactoryPromise) {
		pinoFactoryPromise = import("pino").then(mod => {
			// pino ships as CJS with a default export; some bundlers surface it
			// as `.default`, others as `.pino`, others as the namespace itself.
			const candidate =
				(mod as { default?: unknown }).default ??
				(mod as { pino?: unknown }).pino ??
				mod;

			if (typeof candidate !== "function") {
				throw new TypeError(
					"pino did not resolve to a callable factory (expected default export)"
				);
			}

			return candidate as PinoFactory;
		});
	}
	return pinoFactoryPromise;
}

// ─── initLog ────────────────────────────────────────────────────────────────

/**
 * Initialize browser logging with pino.
 *
 * No-op (and no pino import) unless `enabled` is explicitly `true`. Also a
 * no-op on the server — this module is client-only.
 *
 * `async` because the pino factory is dynamically imported. `await` the
 * returned promise if you need a hard guarantee that logging is live before
 * your first call; otherwise fire-and-forget (early calls are dropped).
 */
export async function initLog(config: ClientLoggerConfig = {}): Promise<void> {
	if (!isBrowserRuntime()) return;
	if (isInitialized) return;
	if (config.enabled !== true) return;

	const minLevel = config.minLevel ?? "info";

	const browserConfig: LoggerOptions["browser"] = {
		asObject: true
	};

	if (config.console === false) {
		browserConfig.transmit = {
			level: minLevel,
			send: () => {
				// Suppress console output when console === false.
			}
		};
	}

	const drainConfig = config.batchedTransport?.drain;
	if (drainConfig?.endpoint) {
		const { endpoint, credentials } = drainConfig;
		browserConfig.transmit = {
			level: minLevel,
			send: (level: string, logEvent: unknown) => {
				const eventRecord = isRecord(logEvent) ? logEvent : {};
				const body = JSON.stringify({
					level,
					time: getNumericProp(eventRecord, "ts") ?? Date.now(),
					messages: getArrayProp(eventRecord, "messages")
				});

				if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
					navigator.sendBeacon(endpoint, body);
					return;
				}

				void fetch(endpoint, {
					body,
					credentials,
					headers: { "Content-Type": "application/json" },
					keepalive: true,
					method: "POST"
				}).catch(() => {
					// Best-effort; a dropped log line is not worth surfacing to the user.
				});
			}
		};
	}

	const pino = await loadPinoFactory();

	loggerInstance = pino({
		base: { service: config.service ?? DEFAULT_CLIENT_LOGGER_CONFIG.service },
		browser: browserConfig,
		enabled: true,
		level: minLevel
	});

	isInitialized = true;
}

// ─── Argument normalization ─────────────────────────────────────────────────

type NormalizedCall = {
	event: LogEvent;
	message: string | undefined;
	/** Extra positional args forwarded to pino after the message. */
	extra: unknown[];
};

/**
 * Normalize the supported call shapes into a single tuple pino can consume:
 *
 *   log.info()                       → ({ ...identity }, undefined)
 *   log.info("msg")                  → ({ ...identity }, "msg")
 *   log.info({ k: v }, "msg")        → ({ ...identity, k: v }, "msg")
 *   log.info({ k: v }, "msg", 1, 2)  → ({ ...identity, k: v }, "msg", [1, 2])
 *   log.error(err)                   → ({ err, ...identity }, undefined)
 *   log.error(err, "msg")            → ({ err, ...identity }, "msg")
 */
function normalize(args: unknown[]): NormalizedCall | null {
	const [first, second, ...extra] = args;

	if (first === undefined) {
		return { event: identityContext, message: undefined, extra: [] };
	}

	if (first instanceof Error) {
		const message = typeof second === "string" ? second : undefined;
		const rest =
			typeof second === "string"
				? extra
				: [second, ...extra].filter(v => v !== undefined);
		return { event: { err: first, ...identityContext }, message, extra: rest };
	}

	if (isRecord(first)) {
		const message = typeof second === "string" ? second : undefined;
		const rest =
			typeof second === "string"
				? extra
				: [second, ...extra].filter(v => v !== undefined);
		return {
			event: { ...identityContext, ...first },
			message,
			extra: rest
		};
	}

	if (typeof first === "string") {
		if (second === undefined) {
			return { event: identityContext, message: first, extra: [] };
		}
		// pino's `logger.info(msg, ...interpolationValues)` form. We do not
		// support printf interpolation, so treat subsequent args as opaque
		// extras that pino will still receive.
		return {
			event: identityContext,
			message: first,
			extra: [second, ...extra]
		};
	}

	// Unknown leading arg — log it as an opaque event so nothing is lost.
	return {
		event: { ...identityContext, value: first },
		message: undefined,
		extra: []
	};
}

// ─── Dispatch ───────────────────────────────────────────────────────────────
//
// Single chokepoint enforcing "no pino work unless initialized".

function logAt(level: DispatchLevel, args: unknown[]): void {
	// The hot-path guard. Everything below this line only runs once
	// `initLog({ enabled: true })` has resolved.
	if (!isInitialized) return;
	const logger = loggerInstance;
	if (!logger) return;

	const call = normalize(args);
	if (!call) return;

	const { event, message, extra } = call;

	if (message === undefined) {
		logger[level](event);
		return;
	}
	if (extra.length === 0) {
		logger[level](event, message);
		return;
	}
	// pino's variadic form: `logger.info(event, message, ...args)`.
	logger[level](event, message, ...extra);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Browser logging API. All methods are no-ops until
 * `initLog({ enabled: true })` has resolved.
 */
export const log = {
	debug: (...args: unknown[]): void => logAt("debug", args),
	error: (...args: unknown[]): void => logAt("error", args),
	info: (...args: unknown[]): void => logAt("info", args),
	warn: (...args: unknown[]): void => logAt("warn", args)
} as const satisfies Record<DispatchLevel, (...args: unknown[]) => void>;

// ─── Identity context ───────────────────────────────────────────────────────

/** Attach user/session context to future browser log events. */
export function setIdentity(identity: LogEvent): void {
	if (!isBrowserRuntime()) return;
	identityContext = { ...identity };
}

/** Clear browser identity context. */
export function clearIdentity(): void {
	if (!isBrowserRuntime()) return;
	identityContext = {};
}
