// src/routes/_auth/app/analytics/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { ClinicAnalyticsSkeleton } from "@/components/skeletons";

const ClinicAnalytics = lazy(() =>
	import("@/components/analytics/ClinicAnalytics").then(m => ({
		default: m.default
	}))
);

export const Route = createFileRoute("/_auth/app/analytics/")({
	component: AnalyticsPage,
	pendingComponent: ClinicAnalyticsSkeleton
});

function AnalyticsPage() {
	return (
		<Suspense fallback={<ClinicAnalyticsSkeleton />}>
			<ClinicAnalytics />
		</Suspense>
	);
}
