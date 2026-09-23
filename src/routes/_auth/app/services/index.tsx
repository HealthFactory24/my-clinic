import { createFileRoute } from "@tanstack/react-router";

import { ServicesPage } from "@/components/services/ServicesPage";

export const Route = createFileRoute("/_auth/app/services/")({
	component: ServicesPage
});
