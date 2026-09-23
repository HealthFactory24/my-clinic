// src/hooks/use-appointments.ts

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import type { AppointmentSearchParams } from "./query-keys.ts";
import {
	appointmentByIdQueryOptions,
	appointmentCountQueryOptions,
	appointmentListQueryOptions,
	appointmentStatsQueryOptions,
	appointmentsByDateQueryOptions,
	appointmentsByPatientQueryOptions,
	appointmentsByStaffQueryOptions,
	availableSlotsQueryOptions,
	upcomingAppointmentsQueryOptions
} from "./query-options.ts";

export function useAppointmentList(params: AppointmentSearchParams) {
	return useQuery(appointmentListQueryOptions(params));
}

export function useAppointmentById(id: string) {
	return useQuery(appointmentByIdQueryOptions(id));
}

export function useAppointmentsByPatient(
	patientId: string,
	params: AppointmentSearchParams = {}
) {
	return useQuery(appointmentsByPatientQueryOptions(patientId, params));
}

export function useAppointmentsByStaff(
	staffId: string,
	params: AppointmentSearchParams = {}
) {
	return useQuery(appointmentsByStaffQueryOptions(staffId, params));
}

export function useAppointmentsByDate(
	date: Date,
	params: { limit?: number; offset?: number } = {}
) {
	return useQuery(appointmentsByDateQueryOptions(date, params));
}

export function useAppointmentsByDateSuspense(
	date: Date,
	params: { limit?: number; offset?: number } = {}
) {
	return useSuspenseQuery(appointmentsByDateQueryOptions(date, params));
}

export function useUpcomingAppointments(patientId: string, limit = 10) {
	return useQuery(upcomingAppointmentsQueryOptions(patientId, limit));
}

export function useAppointmentStats() {
	return useQuery(appointmentStatsQueryOptions());
}

export function useAppointmentCount(params: AppointmentSearchParams) {
	return useQuery(appointmentCountQueryOptions(params));
}

export function useAvailableSlots(
	staffId: string,
	date: string,
	durationMinutes = 30
) {
	return useQuery(availableSlotsQueryOptions(staffId, date, durationMinutes));
}
