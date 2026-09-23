// src/hooks/use-staff.ts

import { useQuery } from "@tanstack/react-query";

import type { Role } from "#/lib/auth/roles.ts";

import type { StaffSearchParams } from "./query-keys.ts";
import {
	activeStaffQueryOptions,
	staffByEmailQueryOptions,
	staffByIdQueryOptions,
	staffByRoleQueryOptions,
	staffCountQueryOptions,
	staffListQueryOptions,
	staffStatsQueryOptions,
	staffWithEncountersQueryOptions,
	staffWithPatientsQueryOptions,
	staffWithPrescriptionsQueryOptions
} from "./query-options.ts";

export function useStaffList(params: StaffSearchParams = {}) {
	return useQuery(staffListQueryOptions(params));
}

export function useStaffById(id: string) {
	return useQuery(staffByIdQueryOptions(id));
}

export function useStaffByEmail(email: string) {
	return useQuery(staffByEmailQueryOptions(email));
}

export function useActiveStaff() {
	return useQuery(activeStaffQueryOptions());
}

export function useStaffByRole(role: "admin" | "doctor" | "staff" | "patient") {
	return useQuery(staffByRoleQueryOptions(role));
}

export function useStaffWithPatients(id: string) {
	return useQuery(staffWithPatientsQueryOptions(id));
}

export function useStaffWithEncounters(id: string) {
	return useQuery(staffWithEncountersQueryOptions(id));
}

export function useStaffWithPrescriptions(id: string) {
	return useQuery(staffWithPrescriptionsQueryOptions(id));
}

export function useStaffStats() {
	return useQuery(staffStatsQueryOptions());
}

export function useStaffCount(
	params: { role?: Role; isActive?: boolean } = {}
) {
	return useQuery(staffCountQueryOptions(params));
}
