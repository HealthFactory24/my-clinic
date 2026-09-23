// src/lib/compose-refs.ts
import * as React from "react";

function isEventLike(value: unknown): value is { defaultPrevented: boolean } {
	return (
		typeof value === "object" &&
		value !== null &&
		"defaultPrevented" in value &&
		typeof value.defaultPrevented === "boolean"
	);
}

/**
 * A utility to compose multiple event handlers into a single event handler.
 * Run originalEventHandler first, then ourEventHandler unless prevented.
 */
function composeEventHandlers<E>(
	originalEventHandler?: (event: E) => void,
	ourEventHandler?: (event: E) => void,
	{ checkForDefaultPrevented = true } = {}
) {
	return function handleEvent(event: E) {
		originalEventHandler?.(event);

		if (
			!checkForDefaultPrevented ||
			!(isEventLike(event) && event.defaultPrevented)
		) {
			return ourEventHandler?.(event);
		}
		return undefined;
	};
}

/**
 * Adapted from the common compose-refs pattern used by primitive UI libraries.
 */

type PossibleRef<T> = React.Ref<T> | undefined;

/**
 * Set a given ref to a given value.
 * This utility takes care of different types of refs: callback refs and RefObject(s).
 *
 * Returns whatever the callback ref returns, so the caller can decide whether
 * to install a React 19 ref cleanup. ReactObject refs return `undefined`.
 */
function setRef<T>(ref: PossibleRef<T>, value: T): (() => void) | undefined {
	if (typeof ref === "function") {
		// Coerce the return of ref(value) to ensure it satisfies (() => void) | undefined
		return ref(value) ?? undefined;
	}

	if (ref !== null && ref !== undefined) {
		ref.current = value;
	}

	return undefined;
}
/**
 * A utility to compose multiple refs together.
 * Accepts callback refs and RefObject(s).
 *
 * The returned function always returns `void | (() => void)`. When no composed
 * ref registered a cleanup callback, it returns nothing — React treats that
 * as "no cleanup", which is correct.
 */
function composeRefs<T>(...refs: Array<PossibleRef<T>>): React.RefCallback<T> {
	return node => {
		let hasCleanup = false;
		const cleanups = refs.map(ref => {
			const cleanup = setRef(ref, node);
			if (!hasCleanup && typeof cleanup === "function") {
				hasCleanup = true;
			}
			return cleanup;
		});

		// React <19 will log an error to the console if a callback ref returns a
		// value. We don't use ref cleanups internally so this will only happen if a
		// user's ref callback returns a value, which we only expect if they are
		// using the cleanup functionality added in React 19.
		if (hasCleanup) {
			return () => {
				for (let i = 0; i < cleanups.length; i += 1) {
					const cleanup = cleanups[i];
					if (typeof cleanup === "function") {
						cleanup();
					} else {
						setRef(refs[i], null);
					}
				}
			};
		}

		// No cleanup registered — return `undefined` explicitly so this branch
		// matches the `() => void` return type of the `hasCleanup` branch.
		return undefined;
	};
}

/**
 * A custom hook that composes multiple refs.
 * Accepts callback refs and RefObject(s).
 */
function useComposedRefs<T>(
	...refs: Array<PossibleRef<T>>
): React.RefCallback<T> {
	return React.useCallback(node => composeRefs(...refs)(node), [refs]);
}

export { composeEventHandlers, composeRefs, useComposedRefs };
