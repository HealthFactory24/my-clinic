// src/server/staff.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { ServerError } from "#/lib/error.ts";
import {
	adminMiddleware,
	doctorMiddleware,
	freshAdminMiddleware,
	getClinicId,
	staffMiddleware
} from "@/lib/auth/middleware";
import { staffRepository } from "@/lib/db/repositories";
import { roleSchema, staffInsertSchema, staffUpdateSchema } from "@/lib/db/zod";

// ─── Queries ───

export const $getStaffCount = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			role: roleSchema.optional(),
			isActive: z.boolean().optional()
		})
	)
	.handler(async ({ data }) => staffRepository.countBy(data));

export const $getStaffById = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const staff = await staffRepository.findById(id, {
			clinicId: getClinicId(context.user)
		});
		if (!staff) throw new ServerError("NOT_FOUND", "Staff member not found");
		return staff;
	});

export const $getStaffByEmail = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.email())
	.handler(async ({ data: email, context }) => {
		const staff = await staffRepository.findByEmail(email, {
			clinicId: getClinicId(context.user)
		});
		if (!staff) throw new ServerError("NOT_FOUND", "Staff member not found");
		return staff;
	});

export const $findAllStaff = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0),
			isActive: z.boolean().optional(),
			role: roleSchema.optional(),
			search: z.string().optional(),
			orderBy: z.enum(["name", "createdAt"]).default("name"),
			orderDirection: z.enum(["asc", "desc"]).default("asc")
		})
	)
	.handler(async ({ data }) => staffRepository.findAll(data));

export const $getActiveStaff = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.handler(async () => staffRepository.findActive());

export const $getStaffByRole = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(roleSchema)
	.handler(async ({ data: role }) => staffRepository.findByRole(role));

export const $getStaffWithPatients = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => {
		const staff = await staffRepository.getStaffWithPatients(id);
		if (!staff) throw new ServerError("NOT_FOUND", "Staff member not found");
		return staff;
	});

export const $getStaffWithEncounters = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => {
		const staff = await staffRepository.getStaffWithEncounters(id);
		if (!staff) throw new ServerError("NOT_FOUND", "Staff member not found");
		return staff;
	});

export const $getStaffWithPrescriptions = createServerFn({ method: "GET" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: id }) => {
		const staff = await staffRepository.getStaffWithPrescriptions(id);
		if (!staff) throw new ServerError("NOT_FOUND", "Staff member not found");
		return staff;
	});

export const $getStaffStats = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => staffRepository.getStats());

// ─── Mutations ───

export const $createStaff = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(staffInsertSchema)
	.handler(async ({ data }) => staffRepository.create(data));

export const $createStaffBatch = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.array(staffInsertSchema))
	.handler(async ({ data }) => staffRepository.bulkCreate(data));

export const $updateStaff = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(staffUpdateSchema)
	.handler(async ({ data, context }) => {
		const { id, ...rest } = data;
		if (!id) throw new ServerError("NOT_FOUND", "Staff id is required");
		const updated = await staffRepository.update(id, rest, {
			clinicId: getClinicId(context.user)
		});
		if (!updated) throw new ServerError("NOT_FOUND", "Staff member not found");
		return updated;
	});

export const $toggleStaffActive = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const updated = await staffRepository.toggleActive(id, {
			clinicId: getClinicId(context.user)
		});
		if (!updated) throw new ServerError("NOT_FOUND", "Staff member not found");
		return updated;
	});

export const $deleteStaff = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) =>
		staffRepository.delete(id, { clinicId: getClinicId(context.user) })
	);
