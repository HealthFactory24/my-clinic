// src/hooks/use-labs.ts

import { useQuery } from "@tanstack/react-query";

import type { LabSearchParams } from "./query-keys.ts";
import {
	abnormalLabResultsQueryOptions,
	labOrderByIdQueryOptions,
	labOrderByNumberQueryOptions,
	labOrderListQueryOptions,
	labOrdersByPatientQueryOptions,
	labStatsQueryOptions,
	pendingLabOrdersQueryOptions
} from "./query-options.ts";

export function useLabOrderById(id: string) {
	return useQuery(labOrderByIdQueryOptions(id));
}

export function useLabOrderByNumber(orderNumber: string) {
	return useQuery(labOrderByNumberQueryOptions(orderNumber));
}

export function useLabOrderList(params: LabSearchParams) {
	return useQuery(labOrderListQueryOptions(params));
}

export function useLabOrdersByPatient(
	patientId: string,
	params: Omit<LabSearchParams, "patientId"> = {}
) {
	return useQuery(labOrdersByPatientQueryOptions(patientId, params));
}

export function usePendingLabOrders(patientId?: string) {
	return useQuery(pendingLabOrdersQueryOptions(patientId));
}

export function useAbnormalLabResults(patientId: string) {
	return useQuery(abnormalLabResultsQueryOptions(patientId));
}

export function useLabStats() {
	return useQuery(labStatsQueryOptions());
}
