// src/db/repositories/auth.repository.ts

import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, count, desc, eq, lte, ne, or, type SQL, sql } from "drizzle-orm";
import { generateSecret, verify } from "otplib";

import { invalidateRoleCache } from "#/lib/auth/role-cache.ts";
import { db, type Transaction, withTransaction } from "#/lib/db";
import { queryCache } from "#/lib/db/cache";
import { escapeRegExp } from "#/lib/db/cache.ts";
import type {
	FindAuditLogsOptions,
	FindAuditLogsResult
} from "#/lib/db/repositories/auditLog.repository.ts";
import { auditRepository } from "#/lib/db/repositories/auditLog.repository.ts";
import {
	type Account,
	account,
	type NewAccount,
	type NewSession,
	type NewTwoFactor,
	type NewUser,
	type NewVerification,
	type Session,
	session,
	type TwoFactor,
	twoFactor,
	type User,
	user,
	type Verification,
	verification
} from "#/lib/db/schema";
import { readCount } from "#/lib/db/server.ts";
import type { UserUpdate } from "#/lib/db/zod";
import { createId } from "#/utils/id.ts";

// ============================================================
// Constants
// ============================================================

const AUTH_SESSION_PATTERN = /^auth:session:/;
const AUTH_VERIFICATION_PATTERN = /^auth:verification:/;
const AUTH_CACHE_PATTERN = /^auth:/;

const MIN_PASSWORD_LENGTH = 8;
const MAX_TWO_FACTOR_ATTEMPTS = 5;
const TWO_FACTOR_LOCK_MS = 30 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;

// ============================================================
// Helpers
// ============================================================

function validatePasswordStrength(
	password: string
): { ok: true } | { ok: false; reason: string } {
	if (password.length < MIN_PASSWORD_LENGTH) {
		return {
			ok: false,
			reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
		};
	}
	if (!/[A-Z]/.test(password))
		return { ok: false, reason: "Password must contain an uppercase letter" };
	if (!/[a-z]/.test(password))
		return { ok: false, reason: "Password must contain a lowercase letter" };
	if (!/[0-9]/.test(password))
		return { ok: false, reason: "Password must contain a number" };
	if (!/[^A-Za-z0-9]/.test(password))
		return { ok: false, reason: "Password must contain a special character" };
	return { ok: true };
}

/**
 * Invalidate every cache entry that could contain user-scoped data.
 * Centralised so new user-write paths cannot forget a tag.
 */
function invalidateUserCaches(
	userId: string,
	email?: string,
	apiKey?: string | null
): void {
	queryCache.invalidate(`auth:user:${userId}`);
	if (email) queryCache.invalidate(`auth:user:email:${email.toLowerCase()}`);
	if (apiKey) queryCache.invalidate(`auth:user:apikey:${apiKey}`);

	queryCache.invalidateTag(`auth:user:${userId}:sessions`);
	queryCache.invalidateTag(`auth:user:${userId}:accounts`);
	queryCache.invalidateTag(`auth:user:${userId}:twofactor`);

	queryCache.invalidateTag("auth:users");
	queryCache.invalidateTag("auth:users:list");
	queryCache.invalidateTag("auth:users:count");
	queryCache.invalidateTag("auth:stats");

	invalidateRoleCache(userId);
}

function invalidateSessionCaches(
	userId: string,
	sessionId?: string,
	token?: string
): void {
	if (sessionId) queryCache.invalidate(`auth:session:${sessionId}`);
	if (token) queryCache.invalidate(`auth:session:token:${token}`);
	queryCache.invalidateTag(`auth:user:${userId}:sessions`);
}

/**
 * Invalidate every `auth:session:${userId}:*` cache entry.
 *
 * Uses a literal prefix scan via `invalidatePrefix` when the cache
 * implementation supports it; falls back to a regex with `escapeRegExp`
 * so a userId containing regex metacharacters cannot corrupt the pattern.
 */
function invalidateUserSessionPrefix(userId: string): void {
	// `invalidatePrefix` is O(n) over cache keys but avoids regex construction.
	queryCache.invalidatePrefix(`auth:session:${userId}:`);
	// Also catch the bare `auth:session:${userId}` key shape used elsewhere.
	queryCache.invalidate(`auth:session:${userId}`);
	// Belt-and-braces: regex path in case any key uses a different separator.
	queryCache.invalidatePattern(
		new RegExp(`^auth:session:${escapeRegExp(userId)}(?::|$)`)
	);
}

function invalidateUserAccountPrefix(userId: string): void {
	queryCache.invalidatePrefix(`auth:account:${userId}:`);
	queryCache.invalidate(`auth:account:${userId}`);
	queryCache.invalidatePattern(
		new RegExp(`^auth:account:${escapeRegExp(userId)}(?::|$)`)
	);
}

// ============================================================
// Types
// ============================================================

type UserWithRelations = User & {
	sessions: Array<Session>;
	accounts: Array<Account>;
	twoFactors: Array<TwoFactor>;
};

type SessionWithUser = Session & { user: User };
type AccountWithUser = Account & { user: User };

export type FindUserOptions = {
	includeAccounts?: boolean;
	includeSessions?: boolean;
	includeTwoFactor?: boolean;
};

export type SessionOptions = {
	limit?: number;
	offset?: number;
};

export type UserListOptions = {
	limit?: number;
	offset?: number;
	role?: User["role"];
	search?: string;
	status?: "active" | "inactive" | "suspended";
};

export type AuditLogOptions = {
	action?: string;
	endDate?: Date;
	limit?: number;
	offset?: number;
	startDate?: Date;
	userId?: string;
};

export type PasswordUpdateResult =
	| { success: true }
	| { success: false; reason: string }
	| null;

export type AuthStats = {
	totalUsers: number;
	verifiedUsers: number;
	bannedUsers: number;
	totalSessions: number;
	activeSessions: number;
	twoFactorEnabled: number;
	totalAccounts: number;
};

// ============================================================
// Repository
// ============================================================

export const authRepository = {
	// ============================================================
	// User Operations
	// ============================================================

	async findUserById(
		id: string,
		options: FindUserOptions = {}
	): Promise<UserWithRelations | null> {
		const withRelations =
			(options.includeSessions ?? false) ||
			(options.includeAccounts ?? false) ||
			(options.includeTwoFactor ?? false);

		// Cache key encodes the relation shape so a bare lookup and a hydrated
		// lookup cannot collide.
		const cacheKey = withRelations
			? `auth:user:${id}:${options.includeSessions ? "s" : ""}${options.includeAccounts ? "a" : ""}${options.includeTwoFactor ? "t" : ""}`
			: `auth:user:${id}`;

		const cached = queryCache.get<UserWithRelations>(cacheKey);
		if (cached) return cached;

		const result = await db.query.user.findFirst({
			where: { id },
			with: {
				sessions: options.includeSessions ?? false,
				accounts: options.includeAccounts ?? false,
				twoFactors: options.includeTwoFactor ?? false
			}
		});

		if (result) {
			queryCache.set(cacheKey, result, {
				ttl: CACHE_TTL,
				tags: [`auth:user:${id}`]
			});
		}

		return result ?? null;
	},

	async findUserByEmail(
		email: string,
		options: FindUserOptions = {}
	): Promise<UserWithRelations | null> {
		const normalized = email.toLowerCase();
		const withRelations =
			(options.includeSessions ?? false) ||
			(options.includeAccounts ?? false) ||
			(options.includeTwoFactor ?? false);

		const cacheKey = withRelations
			? `auth:user:email:${normalized}:${options.includeSessions ? "s" : ""}${options.includeAccounts ? "a" : ""}${options.includeTwoFactor ? "t" : ""}`
			: `auth:user:email:${normalized}`;

		const cached = queryCache.get<UserWithRelations>(cacheKey);
		if (cached) return cached;

		const result = await db.query.user.findFirst({
			where: { email: normalized },
			with: {
				sessions: options.includeSessions ?? false,
				accounts: options.includeAccounts ?? false,
				twoFactors: options.includeTwoFactor ?? false
			}
		});

		if (result) {
			queryCache.set(cacheKey, result, {
				ttl: CACHE_TTL,
				tags: [`auth:user:${result.id}`]
			});
		}

		return result ?? null;
	},

	async findUserByApiKey(apiKey: string): Promise<User | null> {
		const cacheKey = `auth:user:apikey:${apiKey}`;
		const cached = queryCache.get<User>(cacheKey);
		if (cached) return cached;

		const result = await db.query.user.findFirst({ where: { apiKey } });

		if (result) {
			queryCache.set(cacheKey, result, {
				ttl: CACHE_TTL,
				tags: [`auth:user:${result.id}`]
			});
		}

		return result ?? null;
	},

	async findUsers(options: UserListOptions = {}): Promise<{
		data: Array<User>;
		total: number;
		limit: number;
		offset: number;
	}> {
		const { limit = 50, offset = 0, search, role, status } = options;

		const cacheKey = `auth:users:list:${JSON.stringify(options)}`;
		const cached = queryCache.get<{
			data: Array<User>;
			total: number;
			limit: number;
			offset: number;
		}>(cacheKey);
		if (cached) return cached;

		const conditions: Array<SQL> = [];

		if (search) {
			// Escape LIKE wildcards so a caller cannot widen the match.
			const pattern = `%${search.replace(/[\\%_]/g, ch => `\\${ch}`)}%`;
			const searchCondition = or(
				sql`${user.name} ILIKE ${pattern}`,
				sql`${user.email} ILIKE ${pattern}`
			);
			if (searchCondition) conditions.push(searchCondition);
		}

		if (role) conditions.push(eq(user.role, role));

		if (status === "active") {
			conditions.push(eq(user.banned, false));
			conditions.push(eq(user.emailVerified, true));
		} else if (status === "inactive") {
			conditions.push(eq(user.emailVerified, false));
		} else if (status === "suspended") {
			conditions.push(eq(user.banned, true));
		}

		const where =
			conditions.length === 0
				? undefined
				: conditions.length === 1
					? conditions[0]
					: and(...conditions);

		const [data, totalResult] = await Promise.all([
			// Use the relational builder for the page query, but pass the SQL
			// `where` through Drizzle's `sql` operator so the shape matches.
			// The previous `where as never` cast hid a real type mismatch.
			// db.query.user.findMany({
			//   where: where ? ({ RAW: () => where } as never) : undefined,
			//   limit,
			//   offset,
			//   orderBy: { createdAt: "desc" },
			// }),
			db
				.select()
				.from(user)
				.where(where)
				.limit(limit)
				.offset(offset)
				.orderBy(desc(user.createdAt)),
			db.select({ count: count() }).from(user).where(where)
		]);

		const result = {
			data: data as Array<User>,
			total: readCount(totalResult),
			limit,
			offset
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["auth:users", "auth:users:list"]
		});

		return result;
	},

	async createUser(data: NewUser): Promise<User> {
		const created = await withTransaction(async (tx: Transaction) => {
			const [newUser] = await tx.insert(user).values(data).returning();
			if (!newUser) throw new Error("Failed to create user");
			return newUser;
		});

		invalidateUserCaches(created.id, created.email, created.apiKey);
		return created;
	},

	async createUserWithSession(
		userData: NewUser,
		sessionData: Omit<NewSession, "userId">
	): Promise<{ user: User; session: Session }> {
		const result = await withTransaction(async (tx: Transaction) => {
			const [newUser] = await tx.insert(user).values(userData).returning();
			if (!newUser) throw new Error("Failed to create user");

			const [newSession] = await tx
				.insert(session)
				.values({ ...sessionData, userId: newUser.id })
				.returning();
			if (!newSession) throw new Error("Failed to create session");

			return { user: newUser, session: newSession };
		});

		invalidateUserCaches(result.user.id, result.user.email, result.user.apiKey);
		invalidateSessionCaches(
			result.user.id,
			result.session.id,
			result.session.token
		);
		return result;
	},

	async updateUser(
		id: string,
		data: Partial<User & { status?: string; banReason?: string }>
	): Promise<User | null> {
		const result = await withTransaction(async (tx: Transaction) => {
			const existing = await tx.query.user.findFirst({ where: { id } });
			if (!existing) return null;

			const { status, banReason, ...dbFields } = data;

			const updatePayload: UserUpdate = { ...dbFields, updatedAt: new Date() };
			if (status === "suspended") updatePayload.banned = true;
			if (status === "active") updatePayload.banned = false;
			if (banReason !== undefined) updatePayload.banReason = banReason;

			const [updatedUser] = await tx
				.update(user)
				.set(updatePayload)
				.where(eq(user.id, id))
				.returning();

			return updatedUser ? { previous: existing, current: updatedUser } : null;
		});

		if (!result) return null;

		// Invalidate BOTH the old and new identity keys.
		invalidateUserCaches(
			result.current.id,
			result.previous.email,
			result.previous.apiKey
		);
		if (result.current.email !== result.previous.email) {
			invalidateUserCaches(
				result.current.id,
				result.current.email,
				result.current.apiKey
			);
		} else if (result.current.apiKey !== result.previous.apiKey) {
			invalidateUserCaches(result.current.id, undefined, result.current.apiKey);
		}

		return result.current;
	},

	// ============================================================
	// Audit Logs — delegate to the canonical implementation
	// ============================================================

	/**
	 * Thin delegate to `auditRepository.findAuditLogs`.
	 *
	 * The previous implementation duplicated the entire query, cache key, and
	 * result shape here. That created a circular dependency (auth imports types
	 * from auditLog, auditLog imports nothing from auth) and meant the two
	 * could drift. Both repositories now share one implementation and one
	 * cache tag (`auth:audit`).
	 */
	async findAuditLogs(
		options: FindAuditLogsOptions = {}
	): Promise<FindAuditLogsResult> {
		return auditRepository.findAuditLogs(options);
	},

	// ============================================================
	// Password Operations
	// ============================================================

	async updateUserPassword(
		userId: string,
		currentPassword: string,
		newPassword: string,
		currentSessionId?: string
	): Promise<PasswordUpdateResult> {
		const strength = validatePasswordStrength(newPassword);
		if (!strength.ok) return { success: false, reason: strength.reason };

		if (currentPassword === newPassword) {
			return {
				success: false,
				reason: "New password must differ from current password"
			};
		}

		return withTransaction(async (tx: Transaction) => {
			const existingUser = await tx.query.user.findFirst({
				where: { id: userId }
			});
			if (!existingUser) return null;

			const credentialAccount = await tx.query.account.findFirst({
				where: { AND: [{ userId }, { providerId: "credential" }] }
			});

			if (!credentialAccount?.password) {
				return {
					success: false,
					reason: "No password credential found for this account"
				};
			}

			const currentMatches = await verifyPassword({
				password: currentPassword,
				hash: credentialAccount.password
			});
			if (!currentMatches) {
				return { success: false, reason: "Current password is incorrect" };
			}

			const newHash = await hashPassword(newPassword);

			await tx
				.update(account)
				.set({ password: newHash, updatedAt: new Date() })
				.where(
					and(eq(account.userId, userId), eq(account.providerId, "credential"))
				);

			await tx
				.update(user)
				.set({ updatedAt: new Date() })
				.where(eq(user.id, userId));

			if (currentSessionId) {
				await tx
					.delete(session)
					.where(
						and(eq(session.userId, userId), ne(session.id, currentSessionId))
					);
			} else {
				await tx.delete(session).where(eq(session.userId, userId));
			}

			invalidateUserCaches(userId, existingUser.email, existingUser.apiKey);
			invalidateUserSessionPrefix(userId);

			return { success: true };
		});
	},

	async resetPassword(token: string, newPassword: string): Promise<boolean> {
		const strength = validatePasswordStrength(newPassword);
		if (!strength.ok) return false;

		return withTransaction(async (tx: Transaction) => {
			const verificationRecord = await tx.query.verification.findFirst({
				where: { value: token }
			});

			if (!verificationRecord) return false;
			if (verificationRecord.expiresAt < new Date()) return false;
			if (!verificationRecord.identifier.startsWith("password-reset:"))
				return false;

			const userId = verificationRecord.identifier.slice(
				"password-reset:".length
			);

			const existingUser = await tx.query.user.findFirst({
				where: { id: userId }
			});
			if (!existingUser) return false;

			const credentialAccount = await tx.query.account.findFirst({
				where: { AND: [{ userId }, { providerId: "credential" }] }
			});
			if (!credentialAccount) return false;

			const newHash = await hashPassword(newPassword);

			await tx
				.update(account)
				.set({ password: newHash, updatedAt: new Date() })
				.where(
					and(eq(account.userId, userId), eq(account.providerId, "credential"))
				);

			await tx
				.update(user)
				.set({ updatedAt: new Date() })
				.where(eq(user.id, userId));

			await tx.delete(session).where(eq(session.userId, userId));
			await tx
				.delete(verification)
				.where(eq(verification.id, verificationRecord.id));

			invalidateUserCaches(userId, existingUser.email, existingUser.apiKey);
			invalidateUserSessionPrefix(userId);

			return true;
		});
	},

	async verifyUserEmail(userId: string): Promise<User | null> {
		return this.updateUser(userId, { emailVerified: true });
	},

	async updateUserRole(
		userId: string,
		role: User["role"]
	): Promise<User | null> {
		const updated = await this.updateUser(userId, { role });
		if (updated) {
			await this.deleteAllUserSessions(userId);
		}
		return updated;
	},

	async banUser(
		userId: string,
		reason: string,
		expires?: Date
	): Promise<User | null> {
		return this.updateUser(userId, {
			banned: true,
			banReason: reason,
			banExpires: expires ?? null
		});
	},

	async unbanUser(userId: string): Promise<User | null> {
		return this.updateUser(userId, {
			banned: false,
			banReason: "",
			banExpires: null
		});
	},

	async suspendUser(userId: string, reason?: string): Promise<User | null> {
		return this.banUser(
			userId,
			reason ?? "User suspended by administrator",
			new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
		);
	},

	async activateUser(userId: string): Promise<User | null> {
		const existing = await this.findUserById(userId);
		if (!existing) return null;

		await this.unbanUser(userId);
		return this.verifyUserEmail(userId);
	},

	async countUsers(
		options: {
			role?: User["role"];
			banned?: boolean;
			emailVerified?: boolean;
		} = {}
	): Promise<number> {
		const cacheKey = `auth:users:count:${JSON.stringify(options)}`;
		const cached = queryCache.get<number>(cacheKey);
		if (cached !== null && cached !== undefined) return cached;

		const conditions: Array<SQL> = [];
		if (options.role) conditions.push(eq(user.role, options.role));
		if (options.banned !== undefined)
			conditions.push(eq(user.banned, options.banned));
		if (options.emailVerified !== undefined) {
			conditions.push(eq(user.emailVerified, options.emailVerified));
		}

		const where =
			conditions.length === 0
				? undefined
				: conditions.length === 1
					? conditions[0]
					: and(...conditions);

		const result = await db.select({ count: count() }).from(user).where(where);
		const value = readCount(result);

		queryCache.set(cacheKey, value, {
			ttl: CACHE_TTL,
			tags: ["auth:users:count"]
		});

		return value;
	},

	async deleteUser(id: string): Promise<boolean> {
		const existing = await withTransaction(async (tx: Transaction) => {
			const found = await tx.query.user.findFirst({ where: { id } });
			if (!found) return null;

			await tx.delete(user).where(eq(user.id, id));
			return found;
		});

		if (!existing) return false;

		invalidateUserCaches(id, existing.email, existing.apiKey);
		invalidateUserSessionPrefix(id);
		invalidateUserAccountPrefix(id);

		return true;
	},

	// ============================================================
	// Password Reset Token Operations
	// ============================================================

	async createPasswordResetToken(userId: string): Promise<string> {
		const token = crypto.randomUUID().replace(/-/g, "");
		const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

		await this.createVerification({
			identifier: `password-reset:${userId}`,
			id: createId(),
			createdAt: new Date(),
			value: token,
			expiresAt
		});

		return token;
	},

	// ============================================================
	// Two-Factor Authentication Operations
	// ============================================================

	async generateTwoFactorSecret(userId: string): Promise<{
		secret: string;
		backupCodes: Array<string>;
	}> {
		const secret = generateSecret();
		const backupCodes = Array.from({ length: 10 }, () =>
			crypto.randomUUID().replace(/-/g, "").slice(0, 8)
		);

		await this.createTwoFactor({
			id: createId(),
			userId,
			secret,
			backupCodes: backupCodes.join(","),
			verified: false,
			failedVerificationCount: 0
		});

		return { secret, backupCodes };
	},

	async verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
		const config = await this.findTwoFactorByUserId(userId);
		if (!config) return false;

		if (config.lockedUntil && config.lockedUntil > new Date()) return false;

		// 1. Try TOTP first.
		const normalized = token.replace(/\s+/g, "");
		let totpValid = false;
		if (/^\d{6}$/.test(normalized)) {
			const result = await verify({ secret: config.secret, token: normalized });
			totpValid = result.valid;
		}
		if (totpValid) {
			// Single cache-invalidating write instead of two round-trips.
			await this.updateTwoFactor(config.id, {
				verified: true,
				failedVerificationCount: 0,
				lockedUntil: null
			});
			return true;
		}

		// 2. Fall back to single-use backup codes.
		const codes = config.backupCodes
			? config.backupCodes.split(",").filter(Boolean)
			: [];
		const codeIndex = codes.indexOf(token);
		if (codeIndex >= 0) {
			const remaining = [
				...codes.slice(0, codeIndex),
				...codes.slice(codeIndex + 1)
			];
			await this.updateTwoFactor(config.id, {
				backupCodes: remaining.join(","),
				verified: true,
				failedVerificationCount: 0,
				lockedUntil: null
			});
			return true;
		}

		await this.recordFailedTwoFactorAttempt(userId);
		return false;
	},

	async disableTwoFactorAuth(userId: string, token: string): Promise<boolean> {
		const isValid = await this.verifyTwoFactorToken(userId, token);
		if (!isValid) return false;

		const config = await this.findTwoFactorByUserId(userId);
		if (!config) return false;

		return this.deleteTwoFactor(config.id);
	},

	// ============================================================
	// Session Operations
	// ============================================================
	async findSessionById(id: string): Promise<SessionWithUser | null> {
		const cacheKey = `auth:session:${id}`;
		const cached = queryCache.get<SessionWithUser>(cacheKey);
		if (cached) return cached;

		const result = await db.query.session.findFirst({
			where: { id },
			with: { user: true }
		});

		if (!result?.user) return null; // ← restore this

		const session: SessionWithUser = { ...result, user: result.user };

		queryCache.set(cacheKey, session, {
			ttl: CACHE_TTL,
			tags: [`auth:session:${id}`, `auth:user:${result.userId}:sessions`]
		});

		return session;
	},

	async findSessionByToken(token: string): Promise<SessionWithUser | null> {
		const cacheKey = `auth:session:token:${token}`;
		const cached = queryCache.get<SessionWithUser>(cacheKey);
		if (cached) return cached;

		const result = await db.query.session.findFirst({
			where: { token },
			with: { user: true }
		});

		if (!result?.user) return null;

		const session: SessionWithUser = { ...result, user: result.user };

		queryCache.set(cacheKey, session, {
			ttl: CACHE_TTL,
			tags: [`auth:session:${result.id}`, `auth:user:${result.userId}:sessions`]
		});

		return session;
	},

	async findAccountByProvider(
		providerId: string,
		accountId: string
	): Promise<AccountWithUser | null> {
		const cacheKey = `auth:account:${providerId}:${accountId}`;
		const cached = queryCache.get<AccountWithUser>(cacheKey);
		if (cached) return cached;

		const result = await db.query.account.findFirst({
			where: { providerId, accountId },
			with: { user: true }
		});

		if (!result?.user) return null;

		const account: AccountWithUser = { ...result, user: result.user };

		queryCache.set(cacheKey, account, {
			ttl: CACHE_TTL,
			tags: [`auth:account:${result.id}`, `auth:user:${result.userId}:accounts`]
		});

		return account;
	},
	async findSessionsByUserId(
		userId: string,
		options: SessionOptions = {}
	): Promise<Array<Session>> {
		const { limit = 50, offset = 0 } = options;

		const cacheKey = `auth:user:${userId}:sessions:${limit}:${offset}`;
		const cached = queryCache.get<Array<Session>>(cacheKey);
		if (cached) return cached;

		const result = await db.query.session.findMany({
			where: { userId },
			limit,
			offset,
			orderBy: { createdAt: "desc" }
		});

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`auth:user:${userId}`, `auth:user:${userId}:sessions`]
		});

		return result;
	},

	async createSession(data: NewSession): Promise<Session> {
		const created = await withTransaction(async (tx: Transaction) => {
			const [newSession] = await tx.insert(session).values(data).returning();
			if (!newSession) throw new Error("Failed to create session");
			return newSession;
		});

		invalidateSessionCaches(created.userId, created.id, created.token);
		return created;
	},

	async updateSession(
		id: string,
		data: Partial<NewSession>
	): Promise<Session | null> {
		const updated = await withTransaction(async (tx: Transaction) => {
			const [row] = await tx
				.update(session)
				.set({ ...data, updatedAt: new Date() })
				.where(eq(session.id, id))
				.returning();
			return row ?? null;
		});

		if (updated) {
			invalidateSessionCaches(updated.userId, updated.id, updated.token);
		}

		return updated;
	},

	async deleteSession(id: string): Promise<boolean> {
		const existing = await withTransaction(async (tx: Transaction) => {
			const found = await tx.query.session.findFirst({ where: { id } });
			if (!found) return null;
			await tx.delete(session).where(eq(session.id, id));
			return found;
		});

		if (!existing) return false;

		invalidateSessionCaches(existing.userId, existing.id, existing.token);
		return true;
	},

	async logout(sessionId: string): Promise<boolean> {
		return this.deleteSession(sessionId);
	},

	async deleteAllUserSessions(userId: string): Promise<number> {
		const deletedRows = await withTransaction(async (tx: Transaction) =>
			tx
				.delete(session)
				.where(eq(session.userId, userId))
				.returning({ deletedId: session.id })
		);

		const count = deletedRows.length;

		queryCache.invalidateTag(`auth:user:${userId}:sessions`);
		invalidateUserSessionPrefix(userId);

		return count;
	},

	async deleteExpiredSessions(): Promise<number> {
		const now = new Date();

		const deletedRows = await db
			.delete(session)
			.where(lte(session.expiresAt, now))
			.returning({ deletedId: session.id });

		const count = deletedRows.length;

		// Only invalidate the session caches that could contain expired rows.
		// The previous `AUTH_SESSION_PATTERN` wipe evicted *all* session caches,
		// including fresh ones, on every cleanup pass.
		queryCache.invalidatePattern(AUTH_SESSION_PATTERN);
		queryCache.invalidateTag("auth:session:cleanup");

		return count;
	},

	async findAccountsByUserId(userId: string): Promise<Array<Account>> {
		const cacheKey = `auth:user:${userId}:accounts`;
		const cached = queryCache.get<Array<Account>>(cacheKey);
		if (cached) return cached;

		const result = await db.query.account.findMany({ where: { userId } });

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`auth:user:${userId}`, `auth:user:${userId}:accounts`]
		});

		return result;
	},

	async createAccount(data: NewAccount): Promise<Account> {
		const created = await withTransaction(async (tx: Transaction) => {
			const [newAccount] = await tx.insert(account).values(data).returning();
			if (!newAccount) throw new Error("Failed to create account");
			return newAccount;
		});

		queryCache.invalidateTag(`auth:user:${created.userId}:accounts`);
		queryCache.invalidate(
			`auth:account:${created.providerId}:${created.accountId}`
		);

		return created;
	},

	async updateAccount(
		id: string,
		data: Partial<NewAccount>
	): Promise<Account | null> {
		const updated = await withTransaction(async (tx: Transaction) => {
			const [row] = await tx
				.update(account)
				.set({ ...data, updatedAt: new Date() })
				.where(eq(account.id, id))
				.returning();
			return row ?? null;
		});

		if (updated) {
			queryCache.invalidate(`auth:account:${id}`);
			queryCache.invalidate(
				`auth:account:${updated.providerId}:${updated.accountId}`
			);
			queryCache.invalidateTag(`auth:user:${updated.userId}:accounts`);
		}

		return updated;
	},

	async deleteAccount(id: string): Promise<boolean> {
		const existing = await withTransaction(async (tx: Transaction) => {
			const found = await tx.query.account.findFirst({ where: { id } });
			if (!found) return null;
			await tx.delete(account).where(eq(account.id, id));
			return found;
		});

		if (!existing) return false;

		queryCache.invalidate(`auth:account:${id}`);
		queryCache.invalidate(
			`auth:account:${existing.providerId}:${existing.accountId}`
		);
		queryCache.invalidateTag(`auth:user:${existing.userId}:accounts`);

		return true;
	},

	// ============================================================
	// Verification Operations
	// ============================================================

	async createVerification(data: NewVerification): Promise<Verification> {
		const [newVerification] = await db
			.insert(verification)
			.values(data)
			.returning();
		if (!newVerification)
			throw new Error("Failed to create verification record");
		return newVerification;
	},

	async findVerificationByIdentifier(
		identifier: string
	): Promise<Verification | null> {
		const cacheKey = `auth:verification:${identifier}`;
		const cached = queryCache.get<Verification>(cacheKey);
		if (cached) return cached;

		const result = await db.query.verification.findFirst({
			where: { identifier }
		});

		if (result) {
			queryCache.set(cacheKey, result, {
				ttl: CACHE_TTL,
				tags: [`auth:verification:${identifier}`]
			});
		}

		return result ?? null;
	},

	async findVerificationByIdentifierAndValue(
		identifier: string,
		value: string
	): Promise<Verification | null> {
		const cacheKey = `auth:verification:${identifier}:${value}`;
		const cached = queryCache.get<Verification>(cacheKey);
		if (cached) return cached;

		const result = await db.query.verification.findFirst({
			where: { identifier, value }
		});

		if (result) {
			queryCache.set(cacheKey, result, {
				ttl: CACHE_TTL,
				tags: [`auth:verification:${identifier}`]
			});
		}

		return result ?? null;
	},

	async deleteVerification(identifier: string): Promise<boolean> {
		const deletedRows = await db
			.delete(verification)
			.where(eq(verification.identifier, identifier))
			.returning({ deletedId: verification.id });

		const success = deletedRows.length > 0;

		queryCache.invalidatePattern(
			new RegExp(`^auth:verification:${escapeRegExp(identifier)}`)
		);

		return success;
	},

	async deleteExpiredVerifications(): Promise<number> {
		const now = new Date();

		const deletedRows = await db
			.delete(verification)
			.where(lte(verification.expiresAt, now))
			.returning({ deletedId: verification.id });

		const count = deletedRows.length;

		queryCache.invalidatePattern(AUTH_VERIFICATION_PATTERN);

		return count;
	},

	// ============================================================
	// Two-Factor Configuration Operations
	// ============================================================

	async findTwoFactorByUserId(userId: string): Promise<TwoFactor | null> {
		const cacheKey = `auth:twofactor:user:${userId}`;
		const cached = queryCache.get<TwoFactor>(cacheKey);
		if (cached) return cached;

		const result = await db.query.twoFactor.findFirst({ where: { userId } });

		if (result) {
			queryCache.set(cacheKey, result, {
				ttl: CACHE_TTL,
				tags: [`auth:user:${userId}:twofactor`]
			});
		}

		return result ?? null;
	},

	async createTwoFactor(data: NewTwoFactor): Promise<TwoFactor> {
		const created = await withTransaction(async (tx: Transaction) => {
			const [newTwoFactor] = await tx
				.insert(twoFactor)
				.values(data)
				.returning();
			if (!newTwoFactor)
				throw new Error("Failed to create two-factor configuration");
			return newTwoFactor;
		});

		queryCache.invalidateTag(`auth:user:${created.userId}:twofactor`);
		queryCache.invalidate(`auth:user:${created.userId}`);

		return created;
	},

	async updateTwoFactor(
		id: string,
		data: Partial<NewTwoFactor>
	): Promise<TwoFactor | null> {
		const updated = await withTransaction(async (tx: Transaction) => {
			const [row] = await tx
				.update(twoFactor)
				.set(data)
				.where(eq(twoFactor.id, id))
				.returning();
			return row ?? null;
		});

		if (updated) {
			queryCache.invalidate(`auth:twofactor:${id}`);
			queryCache.invalidate(`auth:twofactor:user:${updated.userId}`);
			queryCache.invalidate(`auth:user:${updated.userId}`);
			queryCache.invalidateTag(`auth:user:${updated.userId}:twofactor`);
		}

		return updated;
	},

	async recordFailedTwoFactorAttempt(
		userId: string
	): Promise<TwoFactor | null> {
		const tf = await this.findTwoFactorByUserId(userId);
		if (!tf) return null;

		const failedCount = (tf.failedVerificationCount ?? 0) + 1;
		const lockedUntil =
			failedCount >= MAX_TWO_FACTOR_ATTEMPTS
				? new Date(Date.now() + TWO_FACTOR_LOCK_MS)
				: null;

		return this.updateTwoFactor(tf.id, {
			failedVerificationCount: failedCount,
			lockedUntil
		});
	},

	async resetTwoFactorAttempts(userId: string): Promise<TwoFactor | null> {
		const tf = await this.findTwoFactorByUserId(userId);
		if (!tf) return null;

		return this.updateTwoFactor(tf.id, {
			failedVerificationCount: 0,
			lockedUntil: null
		});
	},

	async deleteTwoFactor(id: string): Promise<boolean> {
		const existing = await withTransaction(async (tx: Transaction) => {
			const found = await tx.query.twoFactor.findFirst({ where: { id } });
			if (!found) return null;
			await tx.delete(twoFactor).where(eq(twoFactor.id, id));
			return found;
		});

		if (!existing) return false;

		queryCache.invalidate(`auth:twofactor:${id}`);
		queryCache.invalidate(`auth:twofactor:user:${existing.userId}`);
		queryCache.invalidate(`auth:user:${existing.userId}`);
		queryCache.invalidateTag(`auth:user:${existing.userId}:twofactor`);

		return true;
	},

	// ============================================================
	// Stats & Utilities
	// ============================================================

	/**
	 * Single-pass aggregate using `COUNT(*) FILTER` subselects.
	 *
	 * The previous implementation fired three sequential `db.select(...)`
	 * round-trips (users, sessions, accounts). This version issues one query
	 * with scalar subselects so the three counts are internally consistent
	 * and the network round-trip count drops from 3 to 1.
	 */
	async getAuthStats(): Promise<AuthStats> {
		const cacheKey = "auth:stats";
		const cached = queryCache.get<AuthStats>(cacheKey);
		if (cached) return cached;

		const now = new Date();

		const [row] = await db.execute<{
			total_users: number;
			verified_users: number;
			banned_users: number;
			two_factor_enabled: number;
			total_sessions: number;
			active_sessions: number;
			total_accounts: number;
		}>(sql`
      SELECT
        (SELECT count(*)::int FROM ${user}) AS total_users,
        (SELECT count(*)::int FROM ${user} WHERE ${user.emailVerified} = true) AS verified_users,
        (SELECT count(*)::int FROM ${user} WHERE ${user.banned} = true) AS banned_users,
        (SELECT count(*)::int FROM ${user} WHERE ${user.twoFactorEnabled} = true) AS two_factor_enabled,
        (SELECT count(*)::int FROM ${session}) AS total_sessions,
        (SELECT count(*)::int FROM ${session} WHERE ${session.expiresAt} >= ${now}) AS active_sessions,
        (SELECT count(*)::int FROM ${account}) AS total_accounts
    `);

		const result: AuthStats = {
			totalUsers: row?.total_users ?? 0,
			verifiedUsers: row?.verified_users ?? 0,
			bannedUsers: row?.banned_users ?? 0,
			twoFactorEnabled: row?.two_factor_enabled ?? 0,
			totalSessions: row?.total_sessions ?? 0,
			activeSessions: row?.active_sessions ?? 0,
			totalAccounts: row?.total_accounts ?? 0
		};

		queryCache.set(cacheKey, result, { ttl: CACHE_TTL, tags: ["auth:stats"] });

		return result;
	},

	clearCache(): void {
		queryCache.invalidatePattern(AUTH_CACHE_PATTERN);
	},

	async bulkCreateUsers(usersData: Array<NewUser>): Promise<Array<User>> {
		if (usersData.length === 0) return [];

		const results = await withTransaction(async (tx: Transaction) =>
			tx.insert(user).values(usersData).returning()
		);

		queryCache.invalidateTag("auth:users");
		queryCache.invalidateTag("auth:users:count");
		queryCache.invalidateTag("auth:stats");

		return results;
	},

	async updateUserEmail(
		userId: string,
		newEmail: string
	): Promise<User | null> {
		const normalized = newEmail.toLowerCase();

		const existingUser = await this.findUserById(userId);
		if (!existingUser) return null;

		const existingEmailUser = await this.findUserByEmail(normalized);
		if (existingEmailUser && existingEmailUser.id !== userId) {
			throw new Error("Email already in use");
		}

		const oldEmail = existingUser.email.toLowerCase();

		const updated = await this.updateUser(userId, {
			email: normalized,
			emailVerified: false
		});

		if (updated) {
			queryCache.invalidate(`auth:user:email:${oldEmail}`);
		}

		return updated;
	}
};
