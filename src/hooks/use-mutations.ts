// src/hooks/use-mutations.ts

import {
	type UseMutationResult,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { toast } from "sonner";

import type {
	Appointment,
	Encounter,
	GrowthMeasurement,
	Immunization,
	LabOrder,
	Patient,
	Prescription,
	Staff,
	VitalSigns
} from "#/lib/db/schema/types.ts";
import {
	$cancelAppointment,
	$checkInAppointment,
	$completeAppointment,
	$createAppointment,
	$createAppointmentsBatch,
	$deleteAppointment,
	$markAppointmentNoShow,
	$startAppointment,
	$updateAppointment,
	$updateAppointmentStatus
} from "#/server/appointments.ts";
import {
	$activateUser,
	$changePassword,
	$confirmResetPassword,
	$deleteUser,
	$login,
	$logout,
	$register,
	$resetPassword,
	$suspendUser,
	$updateUser,
	$updateUserRole,
	$verifyEmail
} from "#/server/auth.ts";
import {
	$addEncounterDiagnosis,
	$addEncounterTreatmentPlan,
	$addEncounterVitals,
	$createEncounter,
	$createEncountersBatch,
	$deleteEncounter,
	$signEncounter,
	$updateEncounter
} from "#/server/encounters.ts";
import {
	$createGrowthMeasurement,
	$createGrowthMeasurementsBatch,
	$deleteGrowthMeasurement,
	$updateGrowthMeasurement
} from "#/server/growth.ts";
import {
	$administerImmunization,
	$createImmunization,
	$createImmunizationsBatch,
	$deferImmunization,
	$deleteImmunization,
	$recordAdverseReaction,
	$refuseImmunization,
	$updateImmunization
} from "#/server/immunizations.ts";
import {
	$addLabResults,
	$cancelLabOrder,
	$collectLabSample,
	$createLabOrder,
	$createLabOrdersBatch,
	$deleteLabOrder,
	$submitLabResults,
	$updateLabOrder,
	$updateLabOrderStatus
} from "#/server/labs.ts";
import {
	$archivePatient,
	$createPatient,
	$deletePatient,
	$mergePatients,
	$updatePatient
} from "#/server/patients.ts";
import {
	$addPrescriptionItems,
	$createPrescription,
	$createPrescriptionsBatch,
	$deletePrescription,
	$discontinuePrescription,
	$refillPrescription,
	$updatePrescription,
	$updatePrescriptionStatus
} from "#/server/prescriptions.ts";
import {
	$createStaff,
	$createStaffBatch,
	$deleteStaff,
	$toggleStaffActive,
	$updateStaff
} from "#/server/staff.ts";
import {
	$createVitals,
	$deleteVitals,
	$updateVitals
} from "#/server/vitals.ts";

import type { LabTest } from "../lib/db/schema";
import { normalizeServerError } from "./errors.ts";
import { queryKeys } from "./query-keys.ts";
import { useOptimisticMutation } from "./use-optimistic-mutation";

// ---------------------------------------------------------------------------
// Shared internal helpers
// ---------------------------------------------------------------------------

type InvalidatableKey = readonly unknown[];
function isCallable(value: unknown): value is (...args: unknown[]) => unknown {
	return typeof value === "function";
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		"then" in value &&
		typeof (value as { then?: unknown }).then === "function"
	);
}
/**
 * The input type of a `createServerFn` callable.
 *
 * `createServerFn` returns a callable whose first parameter is an options
 * object with a `data` field. Rather than matching the whole callable
 * structurally (which fails because the parameter type is a complex
 * middleware-tuple), we extract just the first parameter and read its
 * `data` member.
 */
type ServerFnInput<TFn> = TFn extends (...args: infer A) => unknown
	? A extends [infer First, ...unknown[]]
		? First extends { data: infer D }
			? D
			: never
		: never
	: never;

/** The resolved value type of a `createServerFn` callable. */
type ServerFnOutput<TFn> = TFn extends (...args: never[]) => Promise<infer R>
	? R
	: never;

/**
 * A minimal invocation helper for a `createServerFn` callable.
 *
 * The full callable type produced by `createServerFn` is a deeply-overloaded
 * signature involving middleware tuples that TypeScript cannot structurally
 * verify against a generic wrapper. At runtime, however, every server function
 * accepts exactly one argument: `{ data: <input> }`. This helper performs that
 * invocation via a locally-scoped narrowing of the callable — no assertion
 * leaks to the call sites of `useServerMutation`.
 */
function invokeServerFn<TFn>(
	fn: TFn,
	data: ServerFnInput<TFn>
): Promise<ServerFnOutput<TFn>> {
	if (!isCallable(fn)) {
		throw new TypeError("useServerMutation: server fn is not callable");
	}
	const result: unknown = fn({ data });
	if (!isPromiseLike(result)) {
		throw new TypeError(
			"useServerMutation: server fn did not return a Promise"
		);
	}
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `ServerFnOutput<TFn>` is the caller-declared return type of TFn; the runtime guards above prove callability and thenability, TS just cannot carry the generic through
	return result as Promise<ServerFnOutput<TFn>>;
}
function useServerMutation<TFn>(
	fn: TFn,
	opts: {
		successMessage: string;
		invalidateKeys: ReadonlyArray<InvalidatableKey>;
	}
): UseMutationResult<ServerFnOutput<TFn>, Error, ServerFnInput<TFn>> {
	const queryClient = useQueryClient();

	return useMutation<ServerFnOutput<TFn>, Error, ServerFnInput<TFn>>({
		mutationFn: input => invokeServerFn(fn, input),
		onSuccess: () => {
			for (const key of opts.invalidateKeys) {
				void queryClient.invalidateQueries({ queryKey: key });
			}
			toast.success(opts.successMessage);
		},
		onError: err => {
			const { message } = normalizeServerError(err);
			toast.error(message);
		}
	});
}

function destructiveKeys(
	entityAll: InvalidatableKey
): ReadonlyArray<InvalidatableKey> {
	return [entityAll, queryKeys.dashboard.all];
}

// ===========================================================================
// Auth mutations
// ===========================================================================

export function useLogin() {
	return useServerMutation($login, {
		successMessage: "Signed in.",
		invalidateKeys: [queryKeys.auth.all]
	});
}

export function useRegister() {
	return useServerMutation($register, {
		successMessage: "Account created.",
		invalidateKeys: [queryKeys.auth.all, queryKeys.staff.all]
	});
}

export function useLogout() {
	return useServerMutation($logout, {
		successMessage: "Signed out.",
		invalidateKeys: [queryKeys.auth.all]
	});
}

export function useUpdateUser() {
	return useServerMutation($updateUser, {
		successMessage: "Profile updated.",
		invalidateKeys: [queryKeys.auth.all, queryKeys.staff.all]
	});
}

export function useUpdateUserRole() {
	return useServerMutation($updateUserRole, {
		successMessage: "User role updated.",
		invalidateKeys: destructiveKeys(queryKeys.staff.all)
	});
}

export function useSuspendUser() {
	return useServerMutation($suspendUser, {
		successMessage: "User suspended.",
		invalidateKeys: destructiveKeys(queryKeys.staff.all)
	});
}

export function useActivateUser() {
	return useServerMutation($activateUser, {
		successMessage: "User activated.",
		invalidateKeys: destructiveKeys(queryKeys.staff.all)
	});
}

export function useDeleteUser() {
	return useServerMutation($deleteUser, {
		successMessage: "User deleted.",
		invalidateKeys: destructiveKeys(queryKeys.staff.all)
	});
}

export function useResetPassword() {
	return useServerMutation($resetPassword, {
		successMessage: "If an account exists, a reset link was sent.",
		invalidateKeys: []
	});
}

export function useConfirmResetPassword() {
	return useServerMutation($confirmResetPassword, {
		successMessage: "Password reset.",
		invalidateKeys: [queryKeys.auth.all]
	});
}

export function useVerifyEmail() {
	return useServerMutation($verifyEmail, {
		successMessage: "Email verified.",
		invalidateKeys: [queryKeys.auth.all]
	});
}

export function useChangePassword() {
	return useServerMutation($changePassword, {
		successMessage: "Password changed.",
		invalidateKeys: [queryKeys.auth.all]
	});
}

// ===========================================================================
// Patient mutations
// ===========================================================================

export function useCreatePatient() {
	return useServerMutation($createPatient, {
		successMessage: "Patient created.",
		invalidateKeys: [queryKeys.patients.all, queryKeys.dashboard.all]
	});
}

export function useUpdatePatient() {
	return useServerMutation($updatePatient, {
		successMessage: "Patient updated.",
		invalidateKeys: [queryKeys.patients.all]
	});
}

export function useDeletePatient() {
	return useServerMutation($deletePatient, {
		successMessage: "Patient deleted.",
		invalidateKeys: destructiveKeys(queryKeys.patients.all)
	});
}

export function useMergePatients() {
	return useServerMutation($mergePatients, {
		successMessage: "Patients merged.",
		invalidateKeys: destructiveKeys(queryKeys.patients.all)
	});
}

export function useArchivePatient() {
	return useServerMutation($archivePatient, {
		successMessage: "Patient archived.",
		invalidateKeys: destructiveKeys(queryKeys.patients.all)
	});
}

// ===========================================================================
// Appointment mutations
// ===========================================================================

export function useCreateAppointment() {
	return useServerMutation($createAppointment, {
		successMessage: "Appointment created.",
		invalidateKeys: [queryKeys.appointments.all, queryKeys.dashboard.all]
	});
}

export function useCreateAppointmentsBatch() {
	return useServerMutation($createAppointmentsBatch, {
		successMessage: "Appointments created.",
		invalidateKeys: [queryKeys.appointments.all, queryKeys.dashboard.all]
	});
}

export function useUpdateAppointment() {
	return useServerMutation($updateAppointment, {
		successMessage: "Appointment updated.",
		invalidateKeys: [queryKeys.appointments.all]
	});
}

export function useCheckInAppointment() {
	return useServerMutation($checkInAppointment, {
		successMessage: "Patient checked in.",
		invalidateKeys: [queryKeys.appointments.all, queryKeys.dashboard.all]
	});
}

export function useStartAppointment() {
	return useServerMutation($startAppointment, {
		successMessage: "Appointment started.",
		invalidateKeys: [queryKeys.appointments.all, queryKeys.dashboard.all]
	});
}

export function useCompleteAppointment() {
	return useServerMutation($completeAppointment, {
		successMessage: "Appointment completed.",
		invalidateKeys: [queryKeys.appointments.all, queryKeys.dashboard.all]
	});
}

export function useCancelAppointment() {
	return useServerMutation($cancelAppointment, {
		successMessage: "Appointment cancelled.",
		invalidateKeys: [queryKeys.appointments.all, queryKeys.dashboard.all]
	});
}

export function useMarkAppointmentNoShow() {
	return useServerMutation($markAppointmentNoShow, {
		successMessage: "Appointment marked no-show.",
		invalidateKeys: [queryKeys.appointments.all, queryKeys.dashboard.all]
	});
}

export function useDeleteAppointment() {
	return useServerMutation($deleteAppointment, {
		successMessage: "Appointment deleted.",
		invalidateKeys: destructiveKeys(queryKeys.appointments.all)
	});
}

// ===========================================================================
// Encounter mutations
// ===========================================================================

export function useCreateEncounter() {
	return useServerMutation($createEncounter, {
		successMessage: "Encounter created.",
		invalidateKeys: [
			queryKeys.encounters.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useCreateEncountersBatch() {
	return useServerMutation($createEncountersBatch, {
		successMessage: "Encounters created.",
		invalidateKeys: [
			queryKeys.encounters.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useUpdateEncounter() {
	return useServerMutation($updateEncounter, {
		successMessage: "Encounter updated.",
		invalidateKeys: [queryKeys.encounters.all, queryKeys.patients.all]
	});
}

export function useAddEncounterVitals() {
	return useServerMutation($addEncounterVitals, {
		successMessage: "Vitals recorded.",
		invalidateKeys: [
			queryKeys.encounters.all,
			queryKeys.vitals.all,
			queryKeys.patients.all
		]
	});
}

export function useAddEncounterDiagnosis() {
	return useServerMutation($addEncounterDiagnosis, {
		successMessage: "Diagnosis added.",
		invalidateKeys: [queryKeys.encounters.all]
	});
}

export function useAddEncounterTreatmentPlan() {
	return useServerMutation($addEncounterTreatmentPlan, {
		successMessage: "Treatment plan added.",
		invalidateKeys: [queryKeys.encounters.all]
	});
}

export function useSignEncounter() {
	return useServerMutation($signEncounter, {
		successMessage: "Encounter signed.",
		invalidateKeys: [queryKeys.encounters.all, queryKeys.patients.all]
	});
}

export function useDeleteEncounter() {
	return useServerMutation($deleteEncounter, {
		successMessage: "Encounter deleted.",
		invalidateKeys: destructiveKeys(queryKeys.encounters.all)
	});
}

// ===========================================================================
// Immunization mutations
// ===========================================================================

export function useCreateImmunization() {
	return useServerMutation($createImmunization, {
		successMessage: "Immunization created.",
		invalidateKeys: [
			queryKeys.immunizations.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useCreateImmunizationsBatch() {
	return useServerMutation($createImmunizationsBatch, {
		successMessage: "Immunizations created.",
		invalidateKeys: [
			queryKeys.immunizations.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useUpdateImmunization() {
	return useServerMutation($updateImmunization, {
		successMessage: "Immunization updated.",
		invalidateKeys: [queryKeys.immunizations.all, queryKeys.patients.all]
	});
}

export function useAdministerImmunization() {
	return useServerMutation($administerImmunization, {
		successMessage: "Immunization administered.",
		invalidateKeys: [
			queryKeys.immunizations.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useDeferImmunization() {
	return useServerMutation($deferImmunization, {
		successMessage: "Immunization deferred.",
		invalidateKeys: [queryKeys.immunizations.all, queryKeys.patients.all]
	});
}

export function useRefuseImmunization() {
	return useServerMutation($refuseImmunization, {
		successMessage: "Immunization refused.",
		invalidateKeys: [queryKeys.immunizations.all, queryKeys.patients.all]
	});
}

export function useRecordAdverseReaction() {
	return useServerMutation($recordAdverseReaction, {
		successMessage: "Adverse reaction recorded.",
		invalidateKeys: [queryKeys.immunizations.all, queryKeys.patients.all]
	});
}

export function useDeleteImmunization() {
	return useServerMutation($deleteImmunization, {
		successMessage: "Immunization deleted.",
		invalidateKeys: destructiveKeys(queryKeys.immunizations.all)
	});
}

// ===========================================================================
// Lab mutations
// ===========================================================================

export function useCreateLabOrder() {
	return useServerMutation($createLabOrder, {
		successMessage: "Lab order created.",
		invalidateKeys: [
			queryKeys.labs.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useCreateLabOrdersBatch() {
	return useServerMutation($createLabOrdersBatch, {
		successMessage: "Lab orders created.",
		invalidateKeys: [
			queryKeys.labs.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useUpdateLabOrder() {
	return useServerMutation($updateLabOrder, {
		successMessage: "Lab order updated.",
		invalidateKeys: [queryKeys.labs.all, queryKeys.patients.all]
	});
}

export function useUpdateLabOrderStatus() {
	return useServerMutation($updateLabOrderStatus, {
		successMessage: "Lab order status updated.",
		invalidateKeys: [
			queryKeys.labs.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useAddLabResults() {
	return useServerMutation($addLabResults, {
		successMessage: "Lab results added.",
		invalidateKeys: [
			queryKeys.labs.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useSubmitLabResults() {
	return useServerMutation($submitLabResults, {
		successMessage: "Lab results submitted.",
		invalidateKeys: [
			queryKeys.labs.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useCollectLabSample() {
	return useServerMutation($collectLabSample, {
		successMessage: "Sample collected.",
		invalidateKeys: [
			queryKeys.labs.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useCancelLabOrder() {
	return useServerMutation($cancelLabOrder, {
		successMessage: "Lab order cancelled.",
		invalidateKeys: [
			queryKeys.labs.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useDeleteLabOrder() {
	return useServerMutation($deleteLabOrder, {
		successMessage: "Lab order deleted.",
		invalidateKeys: destructiveKeys(queryKeys.labs.all)
	});
}

// ===========================================================================
// Prescription mutations
// ===========================================================================

export function useCreatePrescription() {
	return useServerMutation($createPrescription, {
		successMessage: "Prescription created.",
		invalidateKeys: [
			queryKeys.prescriptions.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useCreatePrescriptionsBatch() {
	return useServerMutation($createPrescriptionsBatch, {
		successMessage: "Prescriptions created.",
		invalidateKeys: [
			queryKeys.prescriptions.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useUpdatePrescription() {
	return useServerMutation($updatePrescription, {
		successMessage: "Prescription updated.",
		invalidateKeys: [queryKeys.prescriptions.all, queryKeys.patients.all]
	});
}

export function useAddPrescriptionItems() {
	return useServerMutation($addPrescriptionItems, {
		successMessage: "Prescription items added.",
		invalidateKeys: [queryKeys.prescriptions.all, queryKeys.patients.all]
	});
}

export function useRefillPrescription() {
	return useServerMutation($refillPrescription, {
		successMessage: "Prescription refilled.",
		invalidateKeys: [
			queryKeys.prescriptions.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useDiscontinuePrescription() {
	return useServerMutation($discontinuePrescription, {
		successMessage: "Prescription discontinued.",
		invalidateKeys: [
			queryKeys.prescriptions.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useDeletePrescription() {
	return useServerMutation($deletePrescription, {
		successMessage: "Prescription deleted.",
		invalidateKeys: destructiveKeys(queryKeys.prescriptions.all)
	});
}

// ===========================================================================
// Growth mutations
// ===========================================================================

export function useCreateGrowthMeasurement() {
	return useServerMutation($createGrowthMeasurement, {
		successMessage: "Growth measurement recorded.",
		invalidateKeys: [
			queryKeys.growth.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useCreateGrowthMeasurementsBatch() {
	return useServerMutation($createGrowthMeasurementsBatch, {
		successMessage: "Growth measurements recorded.",
		invalidateKeys: [
			queryKeys.growth.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useUpdateGrowthMeasurement() {
	return useServerMutation($updateGrowthMeasurement, {
		successMessage: "Growth measurement updated.",
		invalidateKeys: [queryKeys.growth.all, queryKeys.patients.all]
	});
}

export function useDeleteGrowthMeasurement() {
	return useServerMutation($deleteGrowthMeasurement, {
		successMessage: "Growth measurement deleted.",
		invalidateKeys: destructiveKeys(queryKeys.growth.all)
	});
}

// ===========================================================================
// Staff mutations
// ===========================================================================

export function useCreateStaff() {
	return useServerMutation($createStaff, {
		successMessage: "Staff member created.",
		invalidateKeys: [queryKeys.staff.all, queryKeys.dashboard.all]
	});
}

export function useCreateStaffBatch() {
	return useServerMutation($createStaffBatch, {
		successMessage: "Staff members created.",
		invalidateKeys: [queryKeys.staff.all, queryKeys.dashboard.all]
	});
}

export function useUpdateStaff() {
	return useServerMutation($updateStaff, {
		successMessage: "Staff member updated.",
		invalidateKeys: [queryKeys.staff.all]
	});
}

export function useToggleStaffActive() {
	return useServerMutation($toggleStaffActive, {
		successMessage: "Staff status toggled.",
		invalidateKeys: destructiveKeys(queryKeys.staff.all)
	});
}

export function useDeleteStaff() {
	return useServerMutation($deleteStaff, {
		successMessage: "Staff member deleted.",
		invalidateKeys: destructiveKeys(queryKeys.staff.all)
	});
}

// ===========================================================================
// Vitals mutations
// ===========================================================================

export function useCreateVitals() {
	return useServerMutation($createVitals, {
		successMessage: "Vitals recorded.",
		invalidateKeys: [
			queryKeys.vitals.all,
			queryKeys.patients.all,
			queryKeys.dashboard.all
		]
	});
}

export function useDeleteVitals() {
	return useServerMutation($deleteVitals, {
		successMessage: "Vitals deleted.",
		invalidateKeys: destructiveKeys(queryKeys.vitals.all)
	});
}

// hooks/use-mutations.ts — the three optimistic mutations
export function useUpdateAppointmentStatus() {
	type Vars = ServerFnInput<typeof $updateAppointmentStatus>;

	return useOptimisticMutation<Appointment, Vars>({
		mutationFn: vars => $updateAppointmentStatus({ data: vars }),
		// Derive the detail key from the id in the mutation variables.
		queryKey: vars => queryKeys.appointments.detail(vars.id),
		optimisticUpdate: (previous, vars) => {
			if (!previous) return previous;
			return { ...previous, status: vars.status };
		},
		// Also invalidate the list + stats so the table/dashboard refresh.
		invalidateKeys: detailKey => [
			detailKey,
			queryKeys.appointments.all,
			queryKeys.dashboard.all
		]
	});
}

export function useUpdateVitals() {
	type Vars = ServerFnInput<typeof $updateVitals>;

	return useOptimisticMutation<VitalSigns, Vars>({
		mutationFn: vars => $updateVitals({ data: vars }),
		queryKey: vars => queryKeys.vitals.detail(vars.id ?? ""),
		optimisticUpdate: (previous, vars) => {
			if (!previous) return previous;
			return { ...previous, ...vars };
		},
		invalidateKeys: detailKey => [detailKey, queryKeys.vitals.all]
	});
}

export function useUpdatePrescriptionStatus() {
	type Vars = ServerFnInput<typeof $updatePrescriptionStatus>;

	return useOptimisticMutation<Prescription, Vars>({
		mutationFn: vars => $updatePrescriptionStatus({ data: vars }),
		queryKey: vars => queryKeys.prescriptions.detail(vars.id),
		optimisticUpdate: (previous, vars) => {
			if (!previous) return previous;
			return { ...previous, status: vars.status };
		},
		invalidateKeys: detailKey => [
			detailKey,
			queryKeys.prescriptions.all,
			queryKeys.dashboard.all
		]
	});
}

// Re-export the enum-ish types used above so consumers don't import from server.
export type {
	Appointment,
	Encounter,
	GrowthMeasurement,
	Immunization,
	LabOrder,
	LabTest,
	Patient,
	Prescription,
	Staff,
	VitalSigns
};
