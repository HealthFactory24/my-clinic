import { z } from "zod/v4";

import {
	appointmentStatusSchema,
	dateTimeSchema,
	idSchema,
	optionalString,
	visitTypeSchema
} from "./common";

export const appointmentSchema = z.object({
	id: idSchema,

	patientId: idSchema,

	staffId: idSchema,

	startTime: dateTimeSchema,

	endTime: dateTimeSchema,
	appointmentDate: dateTimeSchema,

	status: appointmentStatusSchema,

	type: visitTypeSchema,

	notes: optionalString(5000),

	createdAt: z.date(),
	updatedAt: z.date()
});

const APPOINTMENT_STATUS = [
	"Scheduled",
	"Checked In",
	"In Progress",
	"Completed",
	"Cancelled",
	"No Show"
] as const;

// ...existing code...

export const createAppointmentSchema = z.object({
	patientId: z.string(),
	staffId: z.string(),
	appointmentDate: z.date(),
	startTime: z.date().optional(),
	endTime: z.date().optional(),
	status: z.enum(APPOINTMENT_STATUS),
	type: visitTypeSchema,
	notes: z.string().nullable().optional(),
	priority: z.enum(["Emergency", "Normal", "Urgent"]).nullable().optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
});

export const updateAppointmentSchema = z.object({
	id: z.string(),
	patientId: z.string().optional(),
	staffId: z.string().optional(),
	appointmentDate: z.date().optional(),
	startTime: z.date().optional(),
	endTime: z.date().optional(),
	status: z.enum(APPOINTMENT_STATUS).optional(),
	type: visitTypeSchema,
	notes: z.string().nullable().optional(),
	priority: z.enum(["Emergency", "Normal", "Urgent"]).nullable().optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
});
// validation/appointment.ts

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export const appointmentFormSchema = appointmentSchema;
export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;
