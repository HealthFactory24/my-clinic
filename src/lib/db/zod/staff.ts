// db/validation/staff.ts

import { z } from "zod/v4";

import { ROLES } from "../schema/enums";
import { idSchema, nonEmptyString, optionalString } from "./common";

export const staffSchema = z.object({
	id: idSchema,
	name: nonEmptyString(200),
	title: nonEmptyString(100),
	role: z.enum(ROLES),
	licenseNumber: nonEmptyString(100),
	avatarColor: nonEmptyString(20),
	pinHash: nonEmptyString(255),
	userId: idSchema,
	email: z.email(),
	specialty: optionalString(100),
	department: optionalString(100),
	isActive: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date()
});

export const createStaffSchema = staffSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true
});

export const updateStaffSchema = staffSchema.partial().extend({
	id: idSchema
});
export const staffFormSchema = staffSchema;

export type StaffFormValues = z.infer<typeof staffFormSchema>;
