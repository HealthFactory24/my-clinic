// src/hooks/errors.ts

import { toast } from "sonner";

/**
 * Normalize a server-thrown error into `{ code, message }`.
 *
 * TanStack Start serializes thrown Errors; the client sees an object with a
 * `message` field. We map the known server-side strings to stable codes so
 * callers can branch on `code` without string matching.
 */
export function normalizeServerError(err: unknown): {
	code: string;
	message: string;
} {
	let message = "Something went wrong";

	if (err instanceof Error) {
		message = err.message || message;
	} else if (typeof err === "string") {
		message = err;
	} else if (typeof err === "object" && err !== null && "message" in err) {
		const maybeMessage = (err as Record<string, unknown>).message;
		if (typeof maybeMessage === "string") {
			message = maybeMessage;
		}
	}

	const trimmed = message.trim();

	if (trimmed === "Unauthorized") {
		return { code: "UNAUTHORIZED", message: trimmed };
	}
	if (trimmed.startsWith("Forbidden: Requires")) {
		return { code: "FORBIDDEN", message: trimmed };
	}
	if (trimmed === "FORBIDDEN") {
		return { code: "FORBIDDEN", message: trimmed };
	}
	if (/not found$/i.test(trimmed)) {
		return { code: "NOT_FOUND", message: trimmed };
	}
	if (trimmed === "Clinic ID is required") {
		return { code: "NO_CLINIC", message: trimmed };
	}
	if (trimmed === "Invalid email or password") {
		return { code: "BAD_CREDENTIALS", message: trimmed };
	}
	if (trimmed === "User with this email already exists") {
		return { code: "EMAIL_IN_USE", message: trimmed };
	}

	return { code: "UNKNOWN", message: trimmed || "Something went wrong" };
}

/**
 * Returns a callback that fires a base-ui error toast for a normalized error.
 *
 * The returned function is stable across renders because it closes over
 * nothing mutable — safe to use in `onError` without memoization.
 */
export function useMutationErrorToast(): (err: unknown) => void {
	return (err: unknown) => {
		const { message } = normalizeServerError(err);
		toast.error(message);
	};
}
