import { createFileRoute } from "@tanstack/react-router";

import { createHealthyHealthResponse } from "@/lib/health";

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: () => Response.json(createHealthyHealthResponse())
		}
	}
});
