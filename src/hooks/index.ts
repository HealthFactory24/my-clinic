// src/hooks/index.ts
//
// Barrel for the hook layer. No default exports.
//
// Do NOT re-export server fns here. If a component needs a raw server fn,
// that is a signal the hook layer is incomplete — fix the hook layer instead.

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------
export { normalizeServerError, useMutationErrorToast } from "./errors.ts";
export type {
	AppointmentSearchParams,
	DashboardParams,
	EncounterSearchParams,
	GrowthSearchParams,
	LabSearchParams,
	PatientCountParams,
	PatientSearchParams,
	PrescriptionSearchParams,
	QueryKeys,
	StaffSearchParams,
	VitalSearchParams
} from "./query-keys.ts";
export { queryKeys, stableParams } from "./query-keys.ts";
// ---------------------------------------------------------------------------
// Query options factories (for route loaders)
// ---------------------------------------------------------------------------
export * from "./query-options.ts";
// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
export {
	useAppointmentById,
	useAppointmentCount,
	useAppointmentList,
	useAppointmentStats,
	useAppointmentsByDate,
	useAppointmentsByDateSuspense,
	useAppointmentsByPatient,
	useAppointmentsByStaff,
	useAvailableSlots,
	useUpcomingAppointments
} from "./use-appointments.ts";
// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export {
	useDashboard,
	useDashboardAlerts,
	useDashboardRecentActivity,
	useDashboardStats,
	useDashboardStatsLite,
	useDashboardSuspense,
	useDashboardTodaySchedule
} from "./use-dashboard.ts";
// ---------------------------------------------------------------------------
// Encounters
// ---------------------------------------------------------------------------
export {
	useEncounterById,
	useEncounterList,
	useEncounterStats,
	useEncountersByPatient,
	useRecentEncounters
} from "./use-encounters.ts";
// ---------------------------------------------------------------------------
// Growth
// ---------------------------------------------------------------------------
export {
	useGrowthChartData,
	useGrowthMeasurementById,
	useGrowthMeasurementsByPatient,
	useGrowthPercentiles,
	useGrowthStats,
	useLatestGrowthMeasurement,
	useWhoAgeRange,
	useWhoGrowthData,
	useWhoLmsParameters,
	useWhoPercentileCurve
} from "./use-growth.ts";
// ---------------------------------------------------------------------------
// Immunizations
// ---------------------------------------------------------------------------
export {
	useAllOverdueImmunizations,
	useImmunizationById,
	useImmunizationCount,
	useImmunizationsByPatient,
	useOverdueImmunizations,
	useUpcomingImmunizations,
	useVaccineCompliance
} from "./use-immunizations.ts";
// ---------------------------------------------------------------------------
// Labs
// ---------------------------------------------------------------------------
export {
	useAbnormalLabResults,
	useLabOrderById,
	useLabOrderByNumber,
	useLabOrderList,
	useLabOrdersByPatient,
	useLabStats,
	usePendingLabOrders
} from "./use-labs.ts";
// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
export {
	useActivateUser,
	useAddEncounterDiagnosis,
	useAddEncounterTreatmentPlan,
	useAddEncounterVitals,
	useAddLabResults,
	useAddPrescriptionItems,
	useAdministerImmunization,
	useArchivePatient,
	useCancelAppointment,
	useCancelLabOrder,
	useChangePassword,
	useCheckInAppointment,
	useCollectLabSample,
	useCompleteAppointment,
	useConfirmResetPassword,
	// appointments
	useCreateAppointment,
	useCreateAppointmentsBatch,
	// encounters
	useCreateEncounter,
	useCreateEncountersBatch,
	// growth
	useCreateGrowthMeasurement,
	useCreateGrowthMeasurementsBatch,
	// immunizations
	useCreateImmunization,
	useCreateImmunizationsBatch,
	// labs
	useCreateLabOrder,
	useCreateLabOrdersBatch,
	// patients
	useCreatePatient,
	// prescriptions
	useCreatePrescription,
	useCreatePrescriptionsBatch,
	// staff
	useCreateStaff,
	useCreateStaffBatch,
	// vitals
	useCreateVitals,
	useDeferImmunization,
	useDeleteAppointment,
	useDeleteEncounter,
	useDeleteGrowthMeasurement,
	useDeleteImmunization,
	useDeleteLabOrder,
	useDeletePatient,
	useDeletePrescription,
	useDeleteStaff,
	useDeleteUser,
	useDeleteVitals,
	useDiscontinuePrescription,
	// auth
	useLogin,
	useLogout,
	useMarkAppointmentNoShow,
	useMergePatients,
	useRecordAdverseReaction,
	useRefillPrescription,
	useRefuseImmunization,
	useRegister,
	useResetPassword,
	useSignEncounter,
	useStartAppointment,
	useSubmitLabResults,
	useSuspendUser,
	useToggleStaffActive,
	useUpdateAppointment,
	// optimistic
	useUpdateAppointmentStatus,
	useUpdateEncounter,
	useUpdateGrowthMeasurement,
	useUpdateImmunization,
	useUpdateLabOrder,
	useUpdateLabOrderStatus,
	useUpdatePatient,
	useUpdatePrescription,
	useUpdatePrescriptionStatus,
	useUpdateStaff,
	useUpdateUser,
	useUpdateUserRole,
	useUpdateVitals,
	useVerifyEmail
} from "./use-mutations.ts";
// ---------------------------------------------------------------------------
// Optimistic helper
// ---------------------------------------------------------------------------
export { useOptimisticMutation } from "./use-optimistic-mutation.ts";
export type { PatientDashboardData } from "./use-patient-dashboard.ts";
// ---------------------------------------------------------------------------
// Patient dashboard (combined)
// ---------------------------------------------------------------------------
export {
	usePatientDashboard,
	usePatientDashboardSuspense
} from "./use-patient-dashboard.ts";
// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------
export {
	useAllPatients,
	useFullPatient,
	useFullPatientSuspense,
	usePatientById,
	usePatientByMrn,
	usePatientCount,
	usePatientEncounters,
	usePatientGrowth,
	usePatientImmunizations,
	usePatientLabOrders,
	usePatientList,
	usePatientPrescriptions,
	usePatientSearch,
	usePatientStats,
	usePatientVitals
} from "./use-patients.ts";
// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------
export {
	useActivePrescriptions,
	usePrescriptionById,
	usePrescriptionByNumber,
	usePrescriptionList,
	usePrescriptionStats,
	usePrescriptionsByPatient
} from "./use-prescriptions.ts";
// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
export {
	useActiveStaff,
	useStaffByEmail,
	useStaffById,
	useStaffByRole,
	useStaffCount,
	useStaffList,
	useStaffStats,
	useStaffWithEncounters,
	useStaffWithPatients,
	useStaffWithPrescriptions
} from "./use-staff.ts";
// ---------------------------------------------------------------------------
// Vitals
// ---------------------------------------------------------------------------
export {
	useAbnormalVitals,
	useLatestVital,
	useVitalById,
	useVitalList,
	useVitalsByEncounter,
	useVitalsByPatient,
	useVitalsCount
} from "./use-vitals.ts";
