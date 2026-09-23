import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const ClinicAnalytics = lazy(() =>
	import("@/components/analytics/ClinicAnalytics").then(m => ({
		default: m.default
	}))
);

export const Route = createFileRoute("/_auth/app/analytics/")({
	component: AnalyticsPage
});

function AnalyticsPage() {
	return <ClinicAnalytics />;
}
