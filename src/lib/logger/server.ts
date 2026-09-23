// src/lib/logger/server.ts

import * as fs from "node:fs/promises";

import type { Level } from "pino"; // or wherever your `Level` type comes from
import pino, { type Logger } from "pino";

export type LogFields = Record<string, unknown>;

const LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

function isLevel(value: unknown): value is Level {
	return (
		typeof value === "string" && (LEVELS as readonly string[]).includes(value)
	);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
export interface StructuredLogger {
	debug: (message: string, fields?: LogFields) => void;
	error: (message: string, error?: Error, fields?: LogFields) => void;
	info: (message: string, fields?: LogFields) => void;
	warn: (message: string, fields?: LogFields) => void;
}

// --- NEW FUNCTION: Get error log level ---
export function getErrorLogLevel(
	error: unknown
): "debug" | "info" | "warn" | "error" {
	if (error instanceof Error && "code" in error) {
		switch (error.code) {
			case "UNAUTHORIZED":
			case "FORBIDDEN":
				return "warn";
			case "BAD_REQUEST":
			case "NOT_FOUND":
			case "CONFLICT":
				return "info";
			case "INTERNAL_SERVER_ERROR":
				return "error";
			default:
				return "error";
		}
	}

	if (error instanceof Error) {
		if (error.name === "ValidationError") {
			return "warn";
		}
		if (
			error.name === "DatabaseError" ||
			error.name === "PrismaClientKnownRequestError"
		) {
			return "error";
		}
	}

	return "error";
}

export function createStructuredLogger(logger: Logger): StructuredLogger {
	return {
		info: (message: string, fields?: LogFields) =>
			logger.info({ ...fields, msg: message }),
		error: (message: string, error?: Error, fields?: LogFields) =>
			logger.error({ ...fields, err: error, msg: message }),
		warn: (message: string, fields?: LogFields) =>
			logger.warn({ ...fields, msg: message }),
		debug: (message: string, fields?: LogFields) =>
			logger.debug({ ...fields, msg: message })
	};
}

export function logPerformance(
	logger: Logger,
	operation: string,
	startTime: number,
	metadata?: Record<string, unknown>
) {
	const duration = performance.now() - startTime;
	logger.info({
		event: "performance",
		operation,
		durationMs: duration,
		...metadata
	});

	if (duration > 1000) {
		logger.warn({
			event: "slow_operation",
			operation,
			durationMs: duration,
			...metadata
		});
	}
}

export const createLogger = (name: string, level: Level = "info") =>
	pino({
		name,
		level,
		redact: {
			paths: [
				// Auth credentials
				"password",
				"passwordHash",
				"pinHash",
				"token",
				"accessToken",
				"refreshToken",
				"authorization",
				"apiKey",
				"secret",
				// Wildcard auth credentials (one level deep)
				"*.password",
				"*.passwordHash",
				"*.pinHash",
				"*.token",
				"*.accessToken",
				"*.refreshToken",
				"*.authorization",
				"*.apiKey",
				"*.secret",
				// Contact / identity PII
				"*.email",
				"*.phone",
				"*.address",
				// Clinical PHI
				"*.mrn",
				"*.dateOfBirth",
				"*.allergies",
				"*.diagnosis",
				"*.chiefComplaint",
				// Full patient/user objects — redact the whole subtree
				"patient",
				"patient.*",
				"patients",
				"patients.*",
				// HTTP headers
				"headers.authorization",
				"headers.cookie"
			],
			censor: "[REDACTED]"
		},
		formatters: {
			level: (label: string) => ({ level: label }),
			bindings: (bindings: pino.Bindings) => ({
				pid: bindings.pid,
				host: bindings.hostname,
				env: process.env.NODE_ENV,
				service: name
			})
		},
		timestamp: pino.stdTimeFunctions.isoTime
	});

export class LoggerManager {
	private static instance: LoggerManager | undefined;
	private readonly loggers: Map<string, Logger> = new Map();
	private readonly logLevelFile = "./log-level.json";

	private constructor() {}

	static getInstance(): LoggerManager {
		if (!LoggerManager.instance) {
			LoggerManager.instance = new LoggerManager();
		}
		return LoggerManager.instance;
	}

	getLogger(name: string): Logger {
		const existing = this.loggers.get(name);
		if (existing) return existing;

		const logger = createLogger(name, "info");
		this.loggers.set(name, logger);

		void this.getLogLevel(name).then(level => {
			logger.level = level;
		});

		return logger;
	}
	async setLogLevel(name: string, level: Level): Promise<void> {
		const logger = this.loggers.get(name);
		if (logger) {
			logger.level = level;
		}
		const levels = await this.getAllLogLevels();
		levels[name] = level;
		await fs.writeFile(
			this.logLevelFile,
			JSON.stringify(levels, null, 2),
			"utf8"
		);
	}

	private async getLogLevel(name: string): Promise<Level> {
		try {
			const levels = await this.getAllLogLevels();
			return levels[name] ?? "info";
		} catch {
			return "info";
		}
	}

	private async getAllLogLevels(): Promise<Record<string, Level>> {
		try {
			const raw = await fs.readFile(this.logLevelFile, "utf8");
			const parsed: unknown = JSON.parse(raw);
			if (!isPlainObject(parsed)) return {};

			const result: Record<string, Level> = {};
			for (const [key, value] of Object.entries(parsed)) {
				if (isLevel(value)) result[key] = value;
			}
			return result;
		} catch {
			return {};
		}
	}
}

export type TraceContext = {
	traceId: string;
	requestId: string;
	userId?: string;
};

export function createTraceLogger(
	logger: Logger,
	context: TraceContext
): Logger {
	return logger.child({
		traceId: context.traceId,
		requestId: context.requestId,
		userId: context.userId
	});
}

export function attachTraceContext(
	req: Request,
	logger: Logger
): { logger: Logger; traceId: string } {
	const traceId = req.headers.get("x-trace-id") || crypto.randomUUID();
	const requestId = crypto.randomUUID();

	const traceLogger = createTraceLogger(logger, {
		traceId,
		requestId
	});

	return { logger: traceLogger, traceId };
}

// SENSITIVE_PATHS is used by redactSensitiveData() for manual redaction of
// arbitrary plain objects before they reach any log sink. Keep it in sync with
// the pino `redact.paths` list above.
const SENSITIVE_PATHS = [
	// Auth credentials
	"password",
	"passwordHash",
	"pinHash",
	"token",
	"accessToken",
	"refreshToken",
	"authorization",
	"api_key",
	"apiKey",
	"secret",
	"credit_card",
	"ssn",
	// Wildcard auth credentials
	"*.password",
	"*.passwordHash",
	"*.pinHash",
	"*.token",
	"*.accessToken",
	"*.refreshToken",
	"*.authorization",
	"*.apiKey",
	"*.secret",
	// HTTP specifics
	"headers.authorization",
	"headers.cookie",
	"body.password",
	"body.token",
	// Contact / identity PII
	"*.email",
	"*.phone",
	"*.address",
	// Clinical PHI
	"*.mrn",
	"*.dateOfBirth",
	"*.allergies",
	"*.diagnosis",
	"*.chiefComplaint"
];
export function redactSensitiveData(data: unknown): unknown {
	if (!isPlainObject(data)) {
		return data;
	}

	const result: Record<string, unknown> = { ...data };

	for (const [key, value] of Object.entries(result)) {
		if (
			SENSITIVE_PATHS.some((pattern: string) => {
				const regex = new RegExp(pattern.replace(/\*/g, ".*"));
				return regex.test(key);
			})
		) {
			result[key] = "[REDACTED]";
		} else if (isPlainObject(value) || Array.isArray(value)) {
			result[key] = redactSensitiveData(value);
		}
	}

	return result;
}

// Singleton exports
export const loggerManager = LoggerManager.getInstance();
export const rootLogger = loggerManager.getLogger("app");

// Enhanced logger with child support
export const logger = {
	child: (bindings: Record<string, unknown>) => rootLogger.child(bindings),
	info: (message: string | Record<string, unknown>, fields?: LogFields) => {
		if (typeof message === "string") {
			rootLogger.info({ ...fields, msg: message });
		} else {
			rootLogger.info({ ...message, ...fields });
		}
	},
	error: (
		message: string | Record<string, unknown>,
		error?: Error,
		fields?: LogFields
	) => {
		if (typeof message === "string") {
			rootLogger.error({ ...fields, err: error, msg: message });
		} else {
			rootLogger.error({ ...message, err: error, ...fields });
		}
	},
	warn: (message: string | Record<string, unknown>, fields?: LogFields) => {
		if (typeof message === "string") {
			rootLogger.warn({ ...fields, msg: message });
		} else {
			rootLogger.warn({ ...message, ...fields });
		}
	},
	debug: (message: string | Record<string, unknown>, fields?: LogFields) => {
		if (typeof message === "string") {
			rootLogger.debug({ ...fields, msg: message });
		} else {
			rootLogger.debug({ ...message, ...fields });
		}
	}
};
