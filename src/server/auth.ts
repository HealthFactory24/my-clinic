// src/server/auth.ts
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";

import { auth } from "@/lib/auth/auth";
import {
	adminMiddleware,
	authMiddleware,
	freshAdminMiddleware,
	freshAuthMiddleware
} from "@/lib/auth/middleware";
import { authRepository } from "@/lib/db/repositories";
import { ServerError } from "@/lib/error";
import { logger } from "@/lib/logger/server";
import { createId } from "@/utils/id";

const roleSchema = z.enum(["admin", "doctor", "staff", "patient"]);
const statusSchema = z.enum(["active", "inactive", "suspended"]);

const passwordRules = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.regex(/[A-Z]/, "Must contain an uppercase letter")
	.regex(/[a-z]/, "Must contain a lowercase letter")
	.regex(/[0-9]/, "Must contain a number")
	.regex(/[^A-Za-z0-9]/, "Must contain a special character");

export const $login = createServerFn({ method: "POST" })
	.validator(
		z.object({
			email: z.email("Invalid email format"),
			password: z.string().min(8)
		})
	)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const result = await auth.api.signInEmail({
			body: { email: data.email, password: data.password },
			headers
		});
		if (!result)
			throw new ServerError("UNAUTHORIZED", "Invalid email or password");
		return result;
	});

export const $register = createServerFn({ method: "POST" })
	.validator(
		z.object({
			name: z.string().min(2),
			email: z.email(),
			password: passwordRules,
			role: roleSchema.default("patient"),
			acceptTerms: z.boolean().refine(v => v, "You must accept the terms")
		})
	)
	.handler(async ({ data }) => {
		const existing = await authRepository.findUserByEmail(data.email);
		if (existing)
			throw new ServerError("CONFLICT", "User with this email already exists");

		const result = await authRepository.createUser({
			id: createId(),
			name: data.name,
			email: data.email,
			role: data.role,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		if (!result)
			throw new ServerError("CONFLICT", "User with this email already exists");

		logger.info({
			msg: "User registered",
			userId: result.id,
			role: result.role
		});

		return result;
	});

export const $logout = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.handler(async () => {
		await auth.api.signOut({ headers: getRequestHeaders() });
		return { success: true };
	});

export const $getSession = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const user = await authRepository.findUserById(context.user.id);
		if (!user) throw new ServerError("NOT_FOUND", "Session invalid");
		return { user };
	});

export const $updateUser = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			name: z.string().min(2).optional(),
			email: z.email().optional(),
			phone: z.string().optional(),
			profilePicture: z.url().optional(),
			preferences: z.record(z.string(), z.unknown()).optional()
		})
	)
	.handler(async ({ data, context }) => {
		const updated = await authRepository.updateUser(context.user.id, data);
		if (!updated) throw new ServerError("NOT_FOUND", "User not found");
		return updated;
	});

export const $listUsers = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			search: z.string().optional(),
			role: roleSchema.optional(),
			status: statusSchema.optional()
		})
	)
	.handler(async ({ data }) => authRepository.findUsers(data));

export const $getUserById = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => {
		const user = await authRepository.findUserById(id);
		if (!user) throw new ServerError("NOT_FOUND", "User not found");
		return user;
	});

export const $updateUserRole = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(
		z.object({
			userId: z.string(),
			role: roleSchema
		})
	)
	.handler(async ({ data, context }) => {
		const user = await authRepository.updateUser(data.userId, {
			role: data.role
		});
		if (!user) throw new ServerError("NOT_FOUND", "User not found");
		logger.info({
			msg: "User role updated",
			targetUserId: data.userId,
			newRole: data.role,
			actorUserId: context.user.id
		});
		return user;
	});

export const $suspendUser = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.object({ userId: z.string(), reason: z.string().optional() }))
	.handler(async ({ data, context }) => {
		const user = await authRepository.updateUser(data.userId, {
			status: "suspended",
			banReason: data.reason,
			banned: true
		});
		if (!user) throw new ServerError("NOT_FOUND", "User not found");
		logger.warn({
			msg: "User suspended",
			targetUserId: data.userId,
			actorUserId: context.user.id
		});
		return user;
	});

export const $activateUser = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: userId, context }) => {
		const user = await authRepository.updateUser(userId, {
			status: "active",
			banned: false,
			banReason: ""
		});
		if (!user) throw new ServerError("NOT_FOUND", "User not found");
		logger.info({
			msg: "User activated",
			targetUserId: userId,
			actorUserId: context.user.id
		});
		return user;
	});

export const $deleteUser = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const deleted = await authRepository.deleteUser(id);
		if (!deleted) throw new ServerError("NOT_FOUND", "User not found");
		logger.warn({
			msg: "User deleted",
			targetUserId: id,
			actorUserId: context.user.id
		});
		return { success: true };
	});

export const $resetPassword = createServerFn({ method: "POST" })
	.validator(z.object({ email: z.email() }))
	.handler(async ({ data }) => {
		const user = await authRepository.findUserByEmail(data.email);
		// Always return success to avoid user enumeration. The token is sent via
		// email only — never include it in the API response.
		if (!user) return { success: true };
		await authRepository.createPasswordResetToken(user.id);
		logger.info({ msg: "Password reset token created", userId: user.id });
		return { success: true };
	});

export const $confirmResetPassword = createServerFn({ method: "POST" })
	.validator(z.object({ token: z.string().min(1), newPassword: passwordRules }))
	.handler(async ({ data }) => {
		const ok = await authRepository.resetPassword(data.token, data.newPassword);
		if (!ok)
			throw new ServerError("NOT_FOUND", "Invalid or expired reset token");
		return { success: true };
	});

export const $verifyEmail = createServerFn({ method: "POST" })
	.validator(z.object({ token: z.string() }))
	.handler(async ({ data }) => {
		const ok = await authRepository.verifyUserEmail(data.token);
		if (!ok)
			throw new ServerError(
				"NOT_FOUND",
				"Invalid or expired verification token"
			);
		return { success: true };
	});

export const $changePassword = createServerFn({ method: "POST" })
	.middleware([freshAuthMiddleware])
	.validator(
		z.object({
			currentPassword: z.string().min(1),
			newPassword: passwordRules
		})
	)
	.handler(async ({ data, context }) => {
		const result = await authRepository.updateUserPassword(
			context.user.id,
			data.currentPassword,
			data.newPassword
		);
		if (result === null) throw new ServerError("NOT_FOUND", "User not found");
		if (!result.success) throw new ServerError("VALIDATION", result.reason);
		return { success: true };
	});

export const $findAuditLogs = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			staffId: z.string().optional(),
			action: z
				.enum([
					"CREATE",
					"UPDATE",
					"DELETE",
					"VIEW",
					"EXPORT",
					"LOGIN",
					"RESTORE"
				])
				.optional(),
			entity: z
				.enum([
					"PATIENT",
					"ENCOUNTER",
					"IMMUNIZATION",
					"PRESCRIPTION",
					"LAB",
					"DATABASE"
				])
				.optional(),
			entityId: z.string().optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional(),
			limit: z.number().int().min(1).max(200).default(50),
			offset: z.number().int().min(0).default(0)
		})
	)
	.handler(async ({ data }) => {
		const logs = await authRepository.findAuditLogs(data);
		return logs.data.map(log => ({
			...log,
			beforeState: log.beforeState
				? JSON.parse(JSON.stringify(log.beforeState))
				: null,
			afterState: log.afterState
				? JSON.parse(JSON.stringify(log.afterState))
				: null
		}));
	});
