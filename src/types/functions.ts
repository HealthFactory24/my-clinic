import type { AppointmentStatus } from "#/lib/db/schema/types.ts";

export interface Alert {
	actionUrl?: string;
	id: string;
	isResolved?: boolean;
	message: string;
	patientId: string;
	patientName: string;
	severity: "info" | "warning" | "critical";
	timestamp: Date;
	type:
		| "overdue_vaccination"
		| "abnormal_growth"
		| "missed_appointment"
		| "lab_result"
		| "medication_refill";
}
export interface DashboardStats {
	activePatients: number;
	appointmentsThisWeek: number;
	completionRate: number;
	pendingFollowUps: number;
	todayAppointments: number;
	totalPatients: number;
	upcomingVaccinations: number;
}

export interface TodaySchedule {
	id: string;
	isOverdue: boolean;
	isUrgent?: boolean;
	notes?: string;
	patientId: string;
	patientName: string;
	patientDateOfBirth?: string;
	status: AppointmentStatus;
	time: string;
	type: string;
}

export interface ActivityItem {
	description: string;
	id: string;
	isUrgent: boolean;
	metadata?: Record<string, unknown>;
	patientId: string;
	patientName: string;
	timestamp: Date;
	type:
		| "visit"
		| "appointment"
		| "vaccination"
		| "lab_result"
		| "alert"
		| "prescription";
}

export interface DashboardData {
	alerts: Alert[];
	lastUpdated: Date;
	recentActivity: ActivityItem[];
	stats: DashboardStats;
	todaySchedule: TodaySchedule[];
}
