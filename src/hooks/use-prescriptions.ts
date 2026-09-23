import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
	type PrescriptionStatus,
	STATUS_CONFIG
} from "../config/prescription-config";
import type { PrescriptionSearchParams } from "./query-keys";
import {
	activePrescriptionsQueryOptions,
	patientPrescriptionsQueryOptions,
	prescriptionByIdQueryOptions,
	prescriptionByNumberQueryOptions,
	prescriptionListQueryOptions,
	prescriptionStatsQueryOptions,
	prescriptionsByPatientQueryOptions
} from "./query-options";
import {
	useDeletePrescription,
	useDiscontinuePrescription,
	useUpdatePrescriptionStatus
} from "./use-mutations";

export function usePrescriptionById(id: string) {
	return useQuery(prescriptionByIdQueryOptions(id));
}

export function usePrescriptionByNumber(rxNumber: string) {
	return useQuery(prescriptionByNumberQueryOptions(rxNumber));
}

export function usePrescriptionList(params: PrescriptionSearchParams) {
	return useQuery(prescriptionListQueryOptions(params));
}

export function usePrescription(id: string) {
	return useQuery(patientPrescriptionsQueryOptions(id));
}

export function usePrescriptionsByPatient(
	patientId: string,
	params: Omit<PrescriptionSearchParams, "patientId"> = {}
) {
	return useQuery(prescriptionsByPatientQueryOptions(patientId, params));
}

export function useActivePrescriptions(patientId: string) {
	return useQuery(activePrescriptionsQueryOptions(patientId));
}

export function usePrescriptionStats() {
	return useQuery(prescriptionStatsQueryOptions());
}

/**
 * Alias for `usePrescriptionList`. Named to match the shape consumed by
 * `PrescriptionTanTable` and other table modules.
 */
export function usePrescriptions(params: PrescriptionSearchParams) {
	return useQuery(prescriptionListQueryOptions(params));
}

export function usePrescriptionActions(rxId: string) {
	const navigate = useNavigate();
	const updateStatus = useUpdatePrescriptionStatus();
	const discontinue = useDiscontinuePrescription();
	const deleteRx = useDeletePrescription();

	const changeStatus = async (
		next: PrescriptionStatus,
		current: PrescriptionStatus
	) => {
		if (next === current) return;
		try {
			await updateStatus.mutateAsync({ id: rxId, status: next });
			toast.success(`Status updated to ${STATUS_CONFIG[next].label}.`);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to update status."
			);
		}
	};

	const discontinueWithReason = async (reason: string) => {
		try {
			await discontinue.mutateAsync({ id: rxId, reason });
			toast.success("Prescription discontinued.");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to discontinue."
			);
			throw err; // keep dialog open on failure
		}
	};

	const remove = async () => {
		try {
			await deleteRx.mutateAsync(rxId);
			toast.success("Prescription deleted.");
			void navigate({ to: "/app/prescriptions" });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete.");
		}
	};

	return {
		changeStatus,
		discontinueWithReason,
		remove,
		isUpdating: updateStatus.isPending,
		isDiscontinuing: discontinue.isPending,
		isDeleting: deleteRx.isPending
	};
}
