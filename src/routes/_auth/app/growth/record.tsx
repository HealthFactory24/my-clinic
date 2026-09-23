// src/routes/_auth/app/growth/record.tsx
//
// Legacy route kept for backwards-compatible bookmarks. The real "record a
// growth measurement" flow lives at `/app/growth/new` (the page every
// "Record Measurement" button targets). Redirect here so an old URL keeps
// working instead of erroring on a phantom `GrowthEntryModal`.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod/v4";

const growthRecordSearchSchema = z.object({
	patientId: z.string().optional()
});

export const Route = createFileRoute("/_auth/app/growth/record")({
	validateSearch: growthRecordSearchSchema,
	beforeLoad: ({ search }) => {
		throw redirect({
			to: "/app/growth/new",
			search: search.patientId ? { patientId: search.patientId } : {}
		});
	}
});
