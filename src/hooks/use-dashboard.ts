// src/hooks/use-dashboard.ts

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import {
	dashboardAlertsQueryOptions,
	dashboardQueryOptions,
	dashboardRecentActivityQueryOptions,
	dashboardStatsLiteQueryOptions,
	dashboardStatsQueryOptions,
	dashboardTodayScheduleQueryOptions
} from "./query-options.ts";

export function useDashboardStats(providerId?: string) {
	return useQuery(dashboardStatsQueryOptions(providerId));
}

export function useDashboardStatsLite() {
	return useQuery(dashboardStatsLiteQueryOptions());
}

export function useDashboardTodaySchedule(params: {
	providerId?: string;
	date?: string;
	includeCompleted?: boolean;
	limit?: number;
}) {
	return useQuery(dashboardTodayScheduleQueryOptions(params));
}

export function useDashboardRecentActivity(params: {
	providerId?: string;
	limit?: number;
	offset?: number;
}) {
	return useQuery(dashboardRecentActivityQueryOptions(params));
}

export function useDashboardAlerts(params: {
	providerId?: string;
	limit?: number;
	severity?: "low" | "medium" | "high" | "critical";
	includeResolved?: boolean;
}) {
	return useQuery(dashboardAlertsQueryOptions(params));
}

export function useDashboard(params: {
	date?: Date;
	includeAlerts?: boolean;
	includeActivity?: boolean;
	includeSchedule?: boolean;
}) {
	return useQuery(dashboardQueryOptions(params));
}

export function useDashboardSuspense(params: {
	date?: Date;
	includeAlerts?: boolean;
	includeActivity?: boolean;
	includeSchedule?: boolean;
}) {
	return useSuspenseQuery(dashboardQueryOptions(params));
}
