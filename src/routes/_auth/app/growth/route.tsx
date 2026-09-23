// src/routes/app/growth/route.tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/app/growth")({
	component: GrowthLayout
});

function GrowthLayout() {
	return (
		<div className='min-h-screen bg-slate-50'>
			<Outlet />
		</div>
	);
}
