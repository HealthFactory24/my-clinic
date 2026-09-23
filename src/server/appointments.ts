// src/server/appointments.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import {
	adminMiddleware,
	doctorMiddleware,
	freshAdminMiddleware,
	getClinicId,
	staffMiddleware
} from "@/lib/auth/middleware";
import { appointmentRepository } from "@/lib/db/repositories";
import {
	appointmentStatusSchema,
	visitTypeSchema as appointmentTypeSchema
} from "@/lib/db/zod";
import {
	createAppointmentSchema,
	updateAppointmentSchema
} from "@/lib/db/zod/appointment";
import { ServerError } from "@/lib/error";

const paginationSchema = {
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0)
};

export const $getAppointmentById = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const appointment = await appointmentRepository.findById(id, {
			clinicId: getClinicId(context.user)
		});
		if (!appointment)
			throw new ServerError("NOT_FOUND", "Appointment not found");
		return appointment;
	});
export const $findAppointments = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			...paginationSchema,
			status: appointmentStatusSchema.optional(),
			patientId: z.string().optional(),
			staffId: z.string().optional(),
			appointmentType: appointmentTypeSchema.optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional(),
			query: z.string().optional()
		})
	)
	.handler(async ({ data, context }) =>
		appointmentRepository.search(data, { clinicId: getClinicId(context.user) })
	);
export const $findAppointmentsByPatient = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			...paginationSchema,
			status: appointmentStatusSchema.optional(),
			appointmentType: appointmentTypeSchema.optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional()
		})
	)
	.handler(async ({ data }) => {
		const { patientId, ...opts } = data;
		return appointmentRepository.findByPatientId(patientId, opts);
	});

export const $findAppointmentsByStaff = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			staffId: z.string(),
			...paginationSchema,
			status: appointmentStatusSchema.optional(),
			appointmentType: appointmentTypeSchema.optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional()
		})
	)
	.handler(async ({ data }) => {
		const { staffId, ...opts } = data;
		return appointmentRepository.findByStaffId(staffId, opts);
	});

export const $findAppointmentsByDate = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			date: z.date(),
			limit: z.number().min(1).max(100).default(50),
			offset: z.number().min(0).default(0)
		})
	)
	.handler(async ({ data }) =>
		appointmentRepository.findByDate(data.date, {
			limit: data.limit,
			offset: data.offset
		})
	);

export const $getUpcomingAppointments = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			patientId: z.string(),
			limit: z.number().min(1).max(50).default(10)
		})
	)
	.handler(async ({ data }) =>
		appointmentRepository.findUpcomingByPatientId(data.patientId, data.limit)
	);

export const $getAppointmentStats = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => appointmentRepository.getStats());

export const $createAppointment = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(createAppointmentSchema)
	.handler(async ({ data, context }) =>
		appointmentRepository.create(data, { clinicId: getClinicId(context.user) })
	);

export const $createAppointmentsBatch = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.array(createAppointmentSchema))
	.handler(async ({ data, context }) =>
		appointmentRepository.createBatch(data, {
			clinicId: getClinicId(context.user)
		})
	);

export const $updateAppointment = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(updateAppointmentSchema)
	.handler(async ({ data, context }) => {
		const { id, ...rest } = data;
		const appointment = await appointmentRepository.update(id, rest, {
			clinicId: getClinicId(context.user)
		});
		if (!appointment)
			throw new ServerError("NOT_FOUND", "Appointment not found");
		return appointment;
	});

export const $updateAppointmentStatus = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.object({ id: z.string(), status: appointmentStatusSchema }))
	.handler(async ({ data, context }) => {
		const appointment = await appointmentRepository.updateStatus(
			data.id,
			data.status,
			{
				clinicId: getClinicId(context.user)
			}
		);
		if (!appointment)
			throw new ServerError("NOT_FOUND", "Appointment not found");
		return appointment;
	});

export const $checkInAppointment = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const appointment = await appointmentRepository.checkIn(id, {
			clinicId: getClinicId(context.user)
		});
		if (!appointment)
			throw new ServerError("NOT_FOUND", "Appointment not found");
		return appointment;
	});

export const $startAppointment = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const appointment = await appointmentRepository.startAppointment(id, {
			clinicId: getClinicId(context.user)
		});
		if (!appointment)
			throw new ServerError("NOT_FOUND", "Appointment not found");
		return appointment;
	});

export const $completeAppointment = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const appointment = await appointmentRepository.completeAppointment(id, {
			clinicId: getClinicId(context.user)
		});
		if (!appointment)
			throw new ServerError("NOT_FOUND", "Appointment not found");
		return appointment;
	});

export const $cancelAppointment = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.object({ id: z.string(), reason: z.string().optional() }))
	.handler(async ({ data, context }) => {
		const appointment = await appointmentRepository.cancelAppointment(
			data.id,
			data.reason,
			{
				clinicId: getClinicId(context.user)
			}
		);
		if (!appointment)
			throw new ServerError("NOT_FOUND", "Appointment not found");
		return appointment;
	});

export const $markAppointmentNoShow = createServerFn({ method: "POST" })
	.middleware([doctorMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) => {
		const appointment = await appointmentRepository.markNoShow(id, {
			clinicId: getClinicId(context.user)
		});
		if (!appointment)
			throw new ServerError("NOT_FOUND", "Appointment not found");
		return appointment;
	});

export const $deleteAppointment = createServerFn({ method: "POST" })
	.middleware([freshAdminMiddleware])
	.validator(z.string())
	.handler(async ({ data: id, context }) =>
		appointmentRepository.delete(id, { clinicId: getClinicId(context.user) })
	);

export const $getAvailableSlots = createServerFn({ method: "GET" })
	.middleware([staffMiddleware])
	.validator(
		z.object({
			staffId: z.string(),
			date: z.iso.date(), // "YYYY-MM-DD"
			durationMinutes: z.number().int().min(5).max(240).default(30)
		})
	)
	.handler(async ({ data }) =>
		appointmentRepository.getAvailableSlots(
			data.staffId,
			data.date,
			data.durationMinutes
		)
	);
