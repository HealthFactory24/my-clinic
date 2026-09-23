import { HttpResponse, http } from "msw";

import { createHealthyHealthResponse } from "#/lib/health";

const healthcheckHandler = http.get("/api/health", () => {
	return HttpResponse.json(createHealthyHealthResponse(), { status: 200 });
});

export const handlers = [healthcheckHandler];
