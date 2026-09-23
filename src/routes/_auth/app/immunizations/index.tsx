import { createFileRoute } from "@tanstack/react-router";

import { ImmunizationsTable } from "#/components/table/modules/ImmunizationsTable.tsx";

export const Route = createFileRoute("/_auth/app/immunizations/")({
	validateSearch: (
		search: Record<string, unknown>
	): { filter?: "overdue" | "due-soon" } => ({
		filter:
			search.filter === "overdue" || search.filter === "due-soon"
				? search.filter
				: undefined
	}),
	component: ImmunizationsPage
});

function ImmunizationsPage() {
	const { filter } = Route.useSearch();
	return <ImmunizationsTable initialFilter={filter} />;
}
