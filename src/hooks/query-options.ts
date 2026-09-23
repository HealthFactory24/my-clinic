import { queryOptions } from "@tanstack/react-query";
// src/hooks/query-options.ts

import type {
	ImmunizationStatus,
	MetricType,
	Role
} from "#/lib/db/schema/types.ts";
import {
	$findAppointments,
	$findAppointmentsByDate,
	$findAppointmentsByPatient,
	$findAppointmentsByStaff,
	$getAppointmentById,
	$getAppointmentStats,
	$getAvailableSlots,
	$getUpcomingAppointments
} from "#/server/appointments.ts";
import {
	$getAlerts,
	$getDashboard,
	$getDashboardStats,
	$getRecentActivity,
	$getStats,
	$getTodaySchedule
} from "#/server/dashboard.ts";
import {
	$getEncounterById,
	$getEncounterStats,
	$getEncountersByPatientId,
	$getRecentEncounters,
	$searchEncounters
} from "#/server/encounters.ts";
import {
	$findGrowthMeasurementsByPatient,
	$getGrowthChartData,
	$getGrowthMeasurementById,
	$getGrowthPercentiles,
	$getGrowthStats,
	$getLatestGrowthMeasurement,
	$getWHOAgeRange,
	$getWHOData,
	$getWHOLMSParameters,
	$getWHOPercentileCurve
} from "#/server/growth.ts";
import {
	$getAllOverdueImmunizations,
	$getImmunizationById,
	$getImmunizationCount,
	$getImmunizations,
	$getImmunizationsByPatientId,
	$getOverdueImmunizations,
	$getUpcomingImmunizations,
	$getVaccineComplianceRate
} from "#/server/immunizations.ts";
import {
	$findLabOrders,
	$findLabOrdersByPatient,
	$getAbnormalLabResults,
	$getLabOrderById,
	$getLabOrderByNumber,
	$getLabStats,
	$getPendingLabOrders
} from "#/server/labs.ts";
import {
	$countPatients,
	$getAllPatients,
	$getAllPatientsSummary,
	$getFullPatientData,
	$getPatientById,
	$getPatientByMRN,
	$getPatientEncounters,
	$getPatientGrowthData,
	$getPatientImmunizations,
	$getPatientLabOrders,
	$getPatientPrescriptions,
	$getPatientStats,
	$getPatientVitals,
	$searchPatients
} from "#/server/patients.ts";
import {
	$findPrescriptions,
	$findPrescriptionsByPatient,
	$getActivePrescriptions,
	$getPrescriptionById,
	$getPrescriptionByNumber,
	$getPrescriptionStats
} from "#/server/prescriptions.ts";
import {
	$findAllStaff,
	$getActiveStaff,
	$getStaffByEmail,
	$getStaffById,
	$getStaffByRole,
	$getStaffCount,
	$getStaffStats,
	$getStaffWithEncounters,
	$getStaffWithPatients,
	$getStaffWithPrescriptions
} from "#/server/staff.ts";
import {
	$findVitals,
	$findVitalsByPatient,
	$getAbnormalVitals,
	$getLatestVital,
	$getVitalById,
	$getVitalsByDateRange,
	$getVitalsByEncounter,
	$getVitalsCount
} from "#/server/vitals.ts";
import type {
	ActivityItem,
	Alert,
	DashboardData,
	DashboardStats,
	TodaySchedule
} from "#/types/functions.ts";

import type {
	AppointmentSearchParams,
	EncounterSearchParams,
	GrowthSearchParams,
	LabSearchParams,
	PatientCountParams,
	PatientSearchParams,
	PrescriptionSearchParams,
	StaffSearchParams,
	VitalSearchParams
} from "./query-keys.ts";
import { queryKeys } from "./query-keys.ts";

// ---------------------------------------------------------------------------
// Staleness policy (overrides the QueryClient default in router.tsx)
//
// WHO reference data is 5 minutes because it is a static reference table:
// the WHO growth standards change at the cadence of a new WHO publication
// (years), not per request. A long staleTime keeps the hot path off the DB
// while still allowing an eventual refresh if the table is reseeded.
// ---------------------------------------------------------------------------

const STALE = {
	auth: 60_000,
	patientsList: 30_000,
	patientDetail: 30_000,
	patientFull: 30_000,
	appointmentsList: 15_000,
	appointmentsByDate: 15_000,
	availableSlots: 30_000,
	encounters: 30_000,
	immunizationsList: 15_000,
	immunizations: 60_000,
	labs: 30_000,
	prescriptions: 30_000,
	vitals: 30_000,
	growth: 60_000,
	whoReference: 300_000, // static reference table — see note above
	staffList: 60_000,
	staffDetail: 60_000,
	dashboardStats: 15_000,
	statsAndCounts: 60_000
} as const;

// ===========================================================================
// Patients
// ===========================================================================

export const patientListQueryOptions = (params: PatientSearchParams) =>
	queryOptions({
		queryKey: queryKeys.patients.list(params),
		queryFn: ({ signal }) => $searchPatients({ data: params, signal }),
		staleTime: STALE.patientsList
	});
export const patientSummaryListQueryOptions = (params: {
	limit?: number;
	offset?: number;
	activeStatus?: "Active" | "Inactive" | "Archived";
}) =>
	queryOptions({
		queryKey: [...queryKeys.patients.list(params), "summary"] as const,
		queryFn: ({ signal }) => $getAllPatientsSummary({ data: params, signal }),
		// 5 minutes: the 500-row summary payload is expensive to refetch and
		// every consumer of `usePatientLookup` only needs approximate freshness.
		staleTime: 5 * 60_000
	});
export const patientSearchQueryOptions = (params: PatientSearchParams) =>
	queryOptions({
		queryKey: queryKeys.patients.list(params),
		queryFn: ({ signal }) => $searchPatients({ data: params, signal }),
		staleTime: STALE.patientsList
	});

export const allPatientsQueryOptions = (params: {
	limit?: number;
	offset?: number;
	activeStatus?: "Active" | "Inactive" | "Archived";
}) =>
	queryOptions({
		queryKey: queryKeys.patients.list(params),
		queryFn: ({ signal }) => $getAllPatients({ data: params, signal }),
		staleTime: STALE.patientsList
	});

export const patientByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.patients.detail(id),
		queryFn: ({ signal }) => $getPatientById({ data: id, signal }),
		staleTime: STALE.patientDetail
	});

export const patientByMrnQueryOptions = (mrn: string) =>
	queryOptions({
		queryKey: queryKeys.patients.byMrn(mrn),
		queryFn: ({ signal }) => $getPatientByMRN({ data: mrn, signal }),
		staleTime: STALE.patientDetail
	});

export const fullPatientQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.patients.full(id),
		queryFn: ({ signal }) => $getFullPatientData({ data: id, signal }),
		staleTime: STALE.patientFull
	});

export const patientEncountersQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.patients.encounters(id),
		queryFn: ({ signal }) =>
			$getPatientEncounters({
				data: { patientId: id, limit: 50, offset: 0 },
				signal
			}),
		staleTime: STALE.encounters
	});

export const patientGrowthQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.patients.growth(id),
		queryFn: ({ signal }) => $getPatientGrowthData({ data: id, signal }),
		staleTime: STALE.growth
	});

export const patientImmunizationsQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.patients.immunizations(id),
		queryFn: ({ signal }) => $getPatientImmunizations({ data: id, signal }),
		staleTime: STALE.immunizations
	});

export const patientPrescriptionsQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.patients.prescriptions(id),
		queryFn: ({ signal }) =>
			$getPatientPrescriptions({ data: { patientId: id }, signal }),
		staleTime: STALE.prescriptions
	});

export const patientLabOrdersQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.patients.labOrders(id),
		queryFn: ({ signal }) =>
			$getPatientLabOrders({ data: { patientId: id }, signal }),
		staleTime: STALE.labs
	});

export const patientVitalsQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.patients.vitals(id),
		queryFn: ({ signal }) =>
			$getPatientVitals({ data: { patientId: id, limit: 10 }, signal }),
		staleTime: STALE.vitals
	});

export const patientStatsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.patients.stats,
		queryFn: ({ signal }) => $getPatientStats({ signal }),
		staleTime: STALE.statsAndCounts
	});

export const patientCountQueryOptions = (params: PatientCountParams = {}) =>
	queryOptions({
		queryKey: queryKeys.patients.count(params),
		queryFn: async ({ signal }) => {
			return await $countPatients({ data: params, signal });
		},
		staleTime: STALE.statsAndCounts
	});

// ===========================================================================
// Appointments
// ===========================================================================

export const appointmentListQueryOptions = (params: AppointmentSearchParams) =>
	queryOptions({
		queryKey: queryKeys.appointments.list(params),
		queryFn: ({ signal }) => $findAppointments({ data: params, signal }),
		staleTime: STALE.appointmentsList
	});

export const appointmentByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.appointments.detail(id),
		queryFn: ({ signal }) => $getAppointmentById({ data: id, signal }),
		staleTime: STALE.appointmentsList
	});

export const appointmentsByPatientQueryOptions = (
	patientId: string,
	params: AppointmentSearchParams = {}
) =>
	queryOptions({
		queryKey: queryKeys.appointments.byPatient(patientId, params),
		queryFn: ({ signal }) =>
			$findAppointmentsByPatient({ data: { patientId, ...params }, signal }),
		staleTime: STALE.appointmentsList
	});

export const appointmentsByStaffQueryOptions = (
	staffId: string,
	params: AppointmentSearchParams = {}
) =>
	queryOptions({
		queryKey: queryKeys.appointments.byStaff(staffId, params),
		queryFn: ({ signal }) =>
			$findAppointmentsByStaff({ data: { staffId, ...params }, signal }),
		staleTime: STALE.appointmentsList
	});

export const appointmentsByDateQueryOptions = (
	date: Date,
	params: { limit?: number; offset?: number } = {}
) =>
	queryOptions({
		queryKey: queryKeys.appointments.byDate(date, params),
		queryFn: ({ signal }) =>
			$findAppointmentsByDate({
				data: { date, limit: params.limit ?? 50, offset: params.offset ?? 0 },
				signal
			}),
		staleTime: STALE.appointmentsByDate
	});

export const upcomingAppointmentsQueryOptions = (
	patientId: string,
	limit = 10
) =>
	queryOptions({
		queryKey: queryKeys.appointments.upcoming(patientId, limit),
		queryFn: ({ signal }) =>
			$getUpcomingAppointments({ data: { patientId, limit }, signal }),
		staleTime: STALE.appointmentsList
	});

export const appointmentStatsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.appointments.stats,
		queryFn: ({ signal }) => $getAppointmentStats({ signal }),
		staleTime: STALE.statsAndCounts
	});

export const appointmentCountQueryOptions = (params: AppointmentSearchParams) =>
	queryOptions({
		queryKey: queryKeys.appointments.count(params),
		// No dedicated `$countAppointments` server fn exists; the stats endpoint
		// is the closest read. Consumers that need an exact filtered count should
		// read `total` off the list endpoint instead.
		queryFn: async ({ signal }) => {
			const result = await $findAppointments({ data: params, signal });
			return result.total;
		},
		staleTime: STALE.statsAndCounts
	});

export const availableSlotsQueryOptions = (
	staffId: string,
	date: string,
	durationMinutes = 30
) =>
	queryOptions({
		queryKey: queryKeys.appointments.slots(staffId, date, durationMinutes),
		queryFn: ({ signal }) =>
			$getAvailableSlots({ data: { staffId, date, durationMinutes }, signal }),
		staleTime: STALE.availableSlots
	});

// ===========================================================================
// Encounters
// ===========================================================================

export const encounterByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.encounters.detail(id),
		queryFn: ({ signal }) => $getEncounterById({ data: id, signal }),
		staleTime: STALE.encounters
	});

export const encounterListQueryOptions = (params: EncounterSearchParams) =>
	queryOptions({
		queryKey: queryKeys.encounters.list(params),
		queryFn: ({ signal }) => $searchEncounters({ data: params, signal }),
		staleTime: STALE.encounters
	});

export const encountersByPatientQueryOptions = (
	patientId: string,
	params: Omit<EncounterSearchParams, "patientId"> = {}
) =>
	queryOptions({
		queryKey: queryKeys.encounters.byPatient(patientId, params),
		queryFn: ({ signal }) =>
			$getEncountersByPatientId({
				data: {
					patientId,
					limit: params.limit ?? 50,
					offset: params.offset ?? 0,
					...params
				},
				signal
			}),
		staleTime: STALE.encounters
	});

export const recentEncountersQueryOptions = (limit = 10) =>
	queryOptions({
		queryKey: queryKeys.encounters.recent(limit),
		queryFn: ({ signal }) => $getRecentEncounters({ data: limit, signal }),
		staleTime: STALE.encounters
	});

export const encounterStatsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.encounters.stats,
		queryFn: ({ signal }) => $getEncounterStats({ signal }),
		staleTime: STALE.statsAndCounts
	});

// ===========================================================================
// Immunizations
// ===========================================================================

export const immunizationByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.immunizations.detail(id),
		queryFn: ({ signal }) => $getImmunizationById({ data: id, signal }),
		staleTime: STALE.immunizations
	});

export const immunizationsByPatientQueryOptions = (
	patientId: string,
	status?: ImmunizationStatus
) =>
	queryOptions({
		queryKey: queryKeys.immunizations.byPatient(patientId, status),
		queryFn: ({ signal }) =>
			$getImmunizationsByPatientId({ data: { patientId, status }, signal }),
		staleTime: STALE.immunizations
	});

export const overdueImmunizationsQueryOptions = (patientId: string) =>
	queryOptions({
		queryKey: queryKeys.immunizations.overdue(patientId),
		queryFn: ({ signal }) =>
			$getOverdueImmunizations({ data: patientId, signal }),
		staleTime: STALE.immunizations
	});

export const upcomingImmunizationsQueryOptions = (
	patientId: string,
	daysAhead = 30
) =>
	queryOptions({
		queryKey: queryKeys.immunizations.upcoming(patientId, daysAhead),
		queryFn: ({ signal }) =>
			$getUpcomingImmunizations({ data: { patientId, daysAhead }, signal }),
		staleTime: STALE.immunizations
	});

export const allOverdueImmunizationsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.immunizations.allOverdue,
		queryFn: ({ signal }) => $getAllOverdueImmunizations({ signal }),
		staleTime: STALE.immunizations
	});

export const vaccineComplianceQueryOptions = (patientId: string) =>
	queryOptions({
		queryKey: queryKeys.immunizations.compliance(patientId),
		queryFn: ({ signal }) =>
			$getVaccineComplianceRate({ data: patientId, signal }),
		staleTime: STALE.immunizations
	});

export const immunizationCountQueryOptions = (
	params: { patientId?: string; status?: ImmunizationStatus } = {}
) =>
	queryOptions({
		queryKey: queryKeys.immunizations.count(params),
		queryFn: async ({ signal }) => {
			const result = await $getImmunizationCount({ data: params, signal });
			return typeof result === "number" ? result : result.count;
		},
		staleTime: STALE.statsAndCounts
	});
export type ImmunizationListParams = {
	query?: string;
	status?: ImmunizationStatus;
	dateRange?: "Due Soon" | "Overdue" | "Completed";
	patientId?: string;
	limit?: number;
	offset?: number;
};

export const immunizationListQueryOptions = (
	params: ImmunizationListParams = {}
) =>
	queryOptions({
		queryKey: queryKeys.immunizations.list(params),
		queryFn: ({ signal }) => $getImmunizations({ data: params, signal }),
		staleTime: STALE.immunizationsList // Adjust stale time constant as needed for your app
	});

// ===========================================================================
// Labs
// ===========================================================================

export const labOrderByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.labs.detail(id),
		queryFn: ({ signal }) => $getLabOrderById({ data: id, signal }),
		staleTime: STALE.labs
	});

export const labOrderByNumberQueryOptions = (orderNumber: string) =>
	queryOptions({
		queryKey: queryKeys.labs.byNumber(orderNumber),
		queryFn: ({ signal }) =>
			$getLabOrderByNumber({ data: orderNumber, signal }),
		staleTime: STALE.labs
	});

export const labOrderListQueryOptions = (params: LabSearchParams) =>
	queryOptions({
		queryKey: queryKeys.labs.list(params),
		queryFn: ({ signal }) => $findLabOrders({ data: params, signal }),
		staleTime: STALE.labs
	});

export const labOrdersByPatientQueryOptions = (
	patientId: string,
	params: Omit<LabSearchParams, "patientId"> = {}
) =>
	queryOptions({
		queryKey: queryKeys.labs.byPatient(patientId, params),
		queryFn: ({ signal }) =>
			$findLabOrdersByPatient({
				data: {
					patientId,
					limit: params.limit ?? 50,
					offset: params.offset ?? 0,
					...params
				},
				signal
			}),
		staleTime: STALE.labs
	});

export const pendingLabOrdersQueryOptions = (patientId?: string) =>
	queryOptions({
		queryKey: queryKeys.labs.pending(patientId),
		queryFn: ({ signal }) => $getPendingLabOrders({ data: patientId, signal }),
		staleTime: STALE.labs
	});

export const abnormalLabResultsQueryOptions = (patientId: string) =>
	queryOptions({
		queryKey: queryKeys.labs.abnormal(patientId),
		queryFn: ({ signal }) =>
			$getAbnormalLabResults({ data: patientId, signal }),
		staleTime: STALE.labs
	});

export const labStatsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.labs.stats,
		queryFn: ({ signal }) => $getLabStats({ signal }),
		staleTime: STALE.statsAndCounts
	});

// ===========================================================================
// Prescriptions
// ===========================================================================

export const prescriptionByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.prescriptions.detail(id),
		queryFn: ({ signal }) => $getPrescriptionById({ data: id, signal }),
		staleTime: STALE.prescriptions
	});

export const prescriptionByNumberQueryOptions = (rxNumber: string) =>
	queryOptions({
		queryKey: queryKeys.prescriptions.byNumber(rxNumber),
		queryFn: ({ signal }) =>
			$getPrescriptionByNumber({ data: rxNumber, signal }),
		staleTime: STALE.prescriptions
	});

export const prescriptionListQueryOptions = (
	params: PrescriptionSearchParams
) =>
	queryOptions({
		queryKey: queryKeys.prescriptions.list(params),
		queryFn: ({ signal }) => $findPrescriptions({ data: params, signal }),
		staleTime: STALE.prescriptions
	});

export const prescriptionsByPatientQueryOptions = (
	patientId: string,
	params: Omit<PrescriptionSearchParams, "patientId"> = {}
) =>
	queryOptions({
		queryKey: queryKeys.prescriptions.byPatient(patientId, params),
		queryFn: ({ signal }) =>
			$findPrescriptionsByPatient({
				data: {
					patientId,
					limit: params.limit ?? 50,
					offset: params.offset ?? 0,
					...params
				},
				signal
			}),
		staleTime: STALE.prescriptions
	});

export const activePrescriptionsQueryOptions = (patientId: string) =>
	queryOptions({
		queryKey: queryKeys.prescriptions.active(patientId),
		queryFn: ({ signal }) =>
			$getActivePrescriptions({ data: patientId, signal }),
		staleTime: STALE.prescriptions
	});

export const prescriptionStatsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.prescriptions.stats,
		queryFn: ({ signal }) => $getPrescriptionStats({ signal }),
		staleTime: STALE.statsAndCounts
	});

// ===========================================================================
// Vitals
// ===========================================================================

export const vitalByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.vitals.detail(id),
		queryFn: ({ signal }) => $getVitalById({ data: id, signal }),
		staleTime: STALE.vitals
	});

export const vitalListQueryOptions = (params: VitalSearchParams) =>
	queryOptions({
		queryKey: queryKeys.vitals.list(params),
		queryFn: ({ signal }) => $findVitals({ data: params, signal }),
		staleTime: STALE.vitals
	});

export const vitalsByPatientQueryOptions = (
	patientId: string,
	params: Omit<VitalSearchParams, "patientId"> = {}
) =>
	queryOptions({
		queryKey: queryKeys.vitals.byPatient(patientId, params),
		queryFn: ({ signal }) =>
			$findVitalsByPatient({
				data: {
					patientId,
					limit: params.limit ?? 50,
					offset: params.offset ?? 0,
					...params
				},
				signal
			}),
		staleTime: STALE.vitals
	});

export const vitalsByEncounterQueryOptions = (encounterId: string) =>
	queryOptions({
		queryKey: queryKeys.vitals.byEncounter(encounterId),
		queryFn: ({ signal }) =>
			$getVitalsByEncounter({ data: encounterId, signal }),
		staleTime: STALE.vitals
	});

export const latestVitalQueryOptions = (patientId: string) =>
	queryOptions({
		queryKey: queryKeys.vitals.latest(patientId),
		queryFn: ({ signal }) => $getLatestVital({ data: patientId, signal }),
		staleTime: STALE.vitals
	});

export const abnormalVitalsQueryOptions = (patientId: string, limit = 20) =>
	queryOptions({
		queryKey: queryKeys.vitals.abnormal(patientId, limit),
		queryFn: ({ signal }) =>
			$getAbnormalVitals({ data: { patientId, limit }, signal }),
		staleTime: STALE.vitals
	});

export const vitalsByDateRangeQueryOptions = (params: {
	startDate: Date;
	endDate: Date;
	patientId?: string;
}) =>
	queryOptions({
		queryKey: queryKeys.vitals.list(params),
		queryFn: ({ signal }) => $getVitalsByDateRange({ data: params, signal }),
		staleTime: STALE.vitals
	});

export const vitalsCountQueryOptions = (
	params: { patientId?: string; startDate?: Date; endDate?: Date } = {}
) =>
	queryOptions({
		queryKey: queryKeys.vitals.count(params),
		queryFn: async ({ signal }) => {
			return await $getVitalsCount({ data: params, signal });
		},
		staleTime: STALE.statsAndCounts
	});

// ===========================================================================
// Growth
// ===========================================================================

export const growthMeasurementByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.growth.detail(id),
		queryFn: ({ signal }) => $getGrowthMeasurementById({ data: id, signal }),
		staleTime: STALE.growth
	});

export const growthMeasurementsByPatientQueryOptions = (
	patientId: string,
	params: Omit<GrowthSearchParams, "patientId"> = {}
) =>
	queryOptions({
		queryKey: queryKeys.growth.byPatient(patientId, params),
		queryFn: ({ signal }) =>
			$findGrowthMeasurementsByPatient({
				data: {
					patientId,
					limit: params.limit ?? 50,
					offset: params.offset ?? 0,
					...params
				},
				signal
			}),
		staleTime: STALE.growth
	});

export const latestGrowthMeasurementQueryOptions = (patientId: string) =>
	queryOptions({
		queryKey: queryKeys.growth.latest(patientId),
		queryFn: ({ signal }) =>
			$getLatestGrowthMeasurement({ data: patientId, signal }),
		staleTime: STALE.growth
	});

export const growthChartDataQueryOptions = (
	patientId: string,
	metric: MetricType = "weight"
) =>
	queryOptions({
		queryKey: queryKeys.growth.chart(patientId, metric),
		queryFn: ({ signal }) =>
			$getGrowthChartData({ data: { patientId, metric }, signal }),
		staleTime: STALE.growth
	});

export const growthStatsQueryOptions = (patientId: string) =>
	queryOptions({
		queryKey: queryKeys.growth.stats(patientId),
		queryFn: ({ signal }) => $getGrowthStats({ data: patientId, signal }),
		staleTime: STALE.growth
	});

export const growthPercentilesQueryOptions = (patientId: string) =>
	queryOptions({
		queryKey: queryKeys.growth.percentiles(patientId),
		queryFn: ({ signal }) => $getGrowthPercentiles({ data: patientId, signal }),
		staleTime: STALE.growth
	});

export const whoGrowthDataQueryOptions = (
	gender: "male" | "female",
	metricType: "weight" | "height" | "head_circumference" | "bmi"
) =>
	queryOptions({
		queryKey: queryKeys.growth.whoData(gender, metricType),
		queryFn: ({ signal }) =>
			$getWHOData({ data: { gender, metricType }, signal }),
		staleTime: STALE.whoReference
	});

export const whoPercentileCurveQueryOptions = (
	gender: "male" | "female",
	metricType: "weight" | "height" | "head_circumference" | "bmi",
	ageMonths: number[]
) =>
	queryOptions({
		queryKey: queryKeys.growth.whoCurve(gender, metricType, ageMonths),
		queryFn: ({ signal }) =>
			$getWHOPercentileCurve({
				data: { gender, metricType, ageMonths },
				signal
			}),
		staleTime: STALE.whoReference
	});

export const whoLmsParametersQueryOptions = (
	gender: "male" | "female",
	metricType: "weight" | "height" | "head_circumference" | "bmi",
	ageMonths: number
) =>
	queryOptions({
		queryKey: queryKeys.growth.whoLms(gender, metricType, ageMonths),
		queryFn: ({ signal }) =>
			$getWHOLMSParameters({ data: { gender, metricType, ageMonths }, signal }),
		staleTime: STALE.whoReference
	});

export const whoAgeRangeQueryOptions = (
	gender: "male" | "female",
	metricType: "weight" | "height" | "head_circumference" | "bmi"
) =>
	queryOptions({
		queryKey: queryKeys.growth.whoAgeRange(gender, metricType),
		queryFn: ({ signal }) =>
			$getWHOAgeRange({ data: { gender, metricType }, signal }),
		staleTime: STALE.whoReference
	});

// ===========================================================================
// Staff
// ===========================================================================

export const staffListQueryOptions = (params: StaffSearchParams = {}) =>
	queryOptions({
		queryKey: queryKeys.staff.list(params),
		queryFn: ({ signal }) => $findAllStaff({ data: params, signal }),
		staleTime: STALE.staffList
	});

export const staffByIdQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.staff.detail(id),
		queryFn: ({ signal }) => $getStaffById({ data: id, signal }),
		staleTime: STALE.staffDetail
	});

export const staffByEmailQueryOptions = (email: string) =>
	queryOptions({
		queryKey: queryKeys.staff.byEmail(email),
		queryFn: ({ signal }) => $getStaffByEmail({ data: email, signal }),
		staleTime: STALE.staffDetail
	});

export const activeStaffQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.staff.active,
		queryFn: ({ signal }) => $getActiveStaff({ signal }),
		staleTime: STALE.staffList
	});

export const staffByRoleQueryOptions = (
	role: "admin" | "doctor" | "staff" | "patient"
) =>
	queryOptions({
		queryKey: queryKeys.staff.byRole(role),
		queryFn: ({ signal }) => $getStaffByRole({ data: role, signal }),
		staleTime: STALE.staffList
	});

export const staffWithPatientsQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.staff.withPatients(id),
		queryFn: ({ signal }) => $getStaffWithPatients({ data: id, signal }),
		staleTime: STALE.staffDetail
	});

export const staffWithEncountersQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.staff.withEncounters(id),
		queryFn: ({ signal }) => $getStaffWithEncounters({ data: id, signal }),
		staleTime: STALE.staffDetail
	});

export const staffWithPrescriptionsQueryOptions = (id: string) =>
	queryOptions({
		queryKey: queryKeys.staff.withPrescriptions(id),
		queryFn: ({ signal }) => $getStaffWithPrescriptions({ data: id, signal }),
		staleTime: STALE.staffDetail
	});

export const staffStatsQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.staff.stats,
		queryFn: ({ signal }) => $getStaffStats({ signal }),
		staleTime: STALE.statsAndCounts
	});

export const staffCountQueryOptions = (
	params: { role?: Role; isActive?: boolean } = {}
) =>
	queryOptions({
		queryKey: queryKeys.staff.count(params),
		queryFn: async ({ signal }) => {
			return await $getStaffCount({ data: params, signal });
		},
		staleTime: STALE.statsAndCounts
	});

// ===========================================================================
// Dashboard
// ===========================================================================

export const dashboardStatsQueryOptions = (providerId?: string) =>
	queryOptions({
		queryKey: queryKeys.dashboard.stats(providerId),
		queryFn: ({ signal }): Promise<DashboardStats> =>
			$getStats({ data: { providerId }, signal }),
		staleTime: STALE.dashboardStats
	});

export const dashboardTodayScheduleQueryOptions = (params: {
	providerId?: string;
	date?: string;
	includeCompleted?: boolean;
	limit?: number;
}) =>
	queryOptions({
		queryKey: queryKeys.dashboard.todaySchedule(params),
		queryFn: ({ signal }): Promise<TodaySchedule[]> =>
			$getTodaySchedule({ data: params, signal }),
		staleTime: STALE.dashboardStats
	});

export const dashboardRecentActivityQueryOptions = (params: {
	providerId?: string;
	limit?: number;
	offset?: number;
}) =>
	queryOptions({
		queryKey: queryKeys.dashboard.recentActivity(params),
		queryFn: ({ signal }): Promise<ActivityItem[]> =>
			$getRecentActivity({ data: params, signal }),
		staleTime: STALE.dashboardStats
	});

export const dashboardAlertsQueryOptions = (params: {
	providerId?: string;
	limit?: number;
	severity?: "low" | "medium" | "high" | "critical";
	includeResolved?: boolean;
}) =>
	queryOptions({
		queryKey: queryKeys.dashboard.alerts(params),
		queryFn: ({ signal }): Promise<Alert[]> =>
			$getAlerts({ data: params, signal }),
		staleTime: STALE.dashboardStats
	});

export const dashboardQueryOptions = (params: {
	date?: Date;
	includeAlerts?: boolean;
	includeActivity?: boolean;
	includeSchedule?: boolean;
}) =>
	queryOptions({
		queryKey: queryKeys.dashboard.full(params),
		queryFn: async ({ signal }): Promise<DashboardData> => {
			const result = await $getDashboard({ data: params, signal });
			return result;
		},
		staleTime: STALE.dashboardStats
	});
export const dashboardStatsLiteQueryOptions = () =>
	queryOptions({
		queryKey: queryKeys.dashboard.stats(undefined),
		queryFn: ({ signal }): Promise<DashboardStats> =>
			$getDashboardStats({ signal }),
		staleTime: STALE.dashboardStats
	});
