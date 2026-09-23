export const SERVER_ERROR_CODES = {
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	VALIDATION: 400,
	CONFLICT: 409,
	INTERNAL: 500
} as const;

export type ServerErrorCode = keyof typeof SERVER_ERROR_CODES;

/**
 * Safely narrows an object to one that is known to contain `key`.
 *
 * No type assertion is required, so this is compatible with
 * `typescript/no-unsafe-type-assertion`.
 */
function hasOwn<T extends object, K extends PropertyKey>(
	value: T,
	key: K
): value is T & Record<K, unknown> {
	return Object.hasOwn(value, key);
}

/**
 * The single error class thrown by every server function.
 *
 * `status` defaults to the canonical HTTP status for `code`, so callers
 * only pass it when they need to override it for a specific case.
 */
export class ServerError extends Error {
	public readonly code: ServerErrorCode;
	public readonly status: number;
	/** Optional structured details (field-level validation errors, etc.). */
	public readonly details?: unknown;

	constructor(code: ServerErrorCode, message: string, details?: unknown) {
		super(message);

		this.name = "ServerError";
		this.code = code;
		this.status = SERVER_ERROR_CODES[code];
		this.details = details;

		// Required for `instanceof` to survive transpilation to ES5.
		Object.setPrototypeOf(this, ServerError.prototype);
	}

	/** Serialize to a plain object for the TanStack Start wire format. */
	toJSON(): {
		code: ServerErrorCode;
		message: string;
		status: number;
		details?: unknown;
	} {
		return {
			code: this.code,
			message: this.message,
			status: this.status,
			details: this.details
		};
	}
}

/**
 * Type guard for a deserialized `ServerError` shape.
 *
 * TanStack Start serializes thrown errors to `{ message, ... }` objects,
 * and we can't rely on `instanceof` across the server/client boundary —
 * so the client checks the shape instead.
 */
export function isServerErrorShape(value: unknown): value is {
	code: ServerErrorCode;
	message: string;
	status: number;
} {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	if (
		!hasOwn(value, "code") ||
		!hasOwn(value, "message") ||
		!hasOwn(value, "status")
	) {
		return false;
	}

	const code = value.code;
	const message = value.message;
	const status = value.status;

	return (
		typeof code === "string" &&
		Object.hasOwn(SERVER_ERROR_CODES, code) &&
		typeof message === "string" &&
		typeof status === "number"
	);
}
