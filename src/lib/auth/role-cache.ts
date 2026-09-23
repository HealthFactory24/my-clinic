// src/lib/auth/role-cache.ts

/**
 * Module-scoped role lookup cache.
 *
 * Extracted from `auth.ts` so that:
 *   - the `customSession` plugin can serve role lookups without a DB round-trip
 *   - `authRepository.updateUserRole` (and any future user-write path) can
 *     invalidate a specific user's entry the moment their role changes
 *
 * No `setInterval` — sweep lazily on `getCachedRole` / `setCachedRole` so that
 * importing this module in tests or in a short-lived process can't leak a
 * timer that keeps the event loop alive.
 */

import type { Role } from "#/lib/db/schema/index.ts";

export const ROLE_TTL = 30_000; // 30 seconds
export const MAX_CACHE_SIZE = 1000;

type CacheEntry = {
	role: Role;
	clinicId: string | null;
	timestamp: number;
};

const cache = new Map<string, CacheEntry>();

/**
 * Drop entries whose age exceeds ROLE_TTL.
 * Called lazily from get/set rather than on a timer.
 */
function dropExpired(now: number): void {
	for (const [key, entry] of cache) {
		if (now - entry.timestamp > ROLE_TTL) {
			cache.delete(key);
		}
	}
}

/**
 * On overflow, drop the oldest 20% of entries (insertion order is not
 * meaningful here, so sort by timestamp).
 */
function dropOldest20(): void {
	const entries = [...cache.entries()].toSorted(
		(a, b) => a[1].timestamp - b[1].timestamp
	);
	const dropCount = Math.max(1, Math.floor(entries.length * 0.2));
	for (let i = 0; i < dropCount; i += 1) {
		const entry = entries[i];
		if (entry) cache.delete(entry[0]);
	}
}

/**
 * Sweep expired entries and, if still oversized, drop the oldest 20%.
 * Exposed so `auth.ts` can call it deterministically inside `customSession`.
 */
export function sweepRoleCache(): void {
	const now = Date.now();
	dropExpired(now);
	if (cache.size > MAX_CACHE_SIZE) {
		dropOldest20();
	}
}

export function getCachedRole(
	userId: string
): { role: Role; clinicId: string | null } | null {
	sweepRoleCache();

	const entry = cache.get(userId);
	if (!entry) return null;
	if (Date.now() - entry.timestamp > ROLE_TTL) {
		cache.delete(userId);
		return null;
	}
	return { role: entry.role, clinicId: entry.clinicId };
}

export function setCachedRole(
	userId: string,
	role: Role,
	clinicId: string | null
): void {
	sweepRoleCache();

	cache.set(userId, {
		role,
		clinicId,
		timestamp: Date.now()
	});

	if (cache.size > MAX_CACHE_SIZE) {
		dropOldest20();
	}
}

export function invalidateRoleCache(userId: string): void {
	cache.delete(userId);
}

export function invalidateRoleCacheAll(): void {
	cache.clear();
}
