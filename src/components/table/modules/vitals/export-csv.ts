import { toast } from "sonner";

import type { VitalSigns } from "@/lib/db/schema";

function formatDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
}

/**
 * Export a list of vital signs to a CSV file and trigger a browser download.
 * Shows a toast on success or when there is nothing to export.
 */
export function exportVitalsToCSV(
	vitals: VitalSigns[],
	patientId: string
): void {
	if (vitals.length === 0) {
		toast.warning("No vitals data to export.");
		return;
	}

	const headers = [
		"Date",
		"Temperature (°C)",
		"Method",
		"Heart Rate (bpm)",
		"Respiratory Rate (/min)",
		"SpO2 (%)",
		"Pain Score",
		"Notes"
	];

	const rows = vitals.map(v => [
		formatDate(v.recordedAt),
		v.temperatureC,
		v.temperatureMethod || "",
		v.heartRateBpm,
		v.respiratoryRateBpm,
		v.oxygenSaturationPercent || "",
		v.painScore || "",
		v.notes || ""
	]);

	const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
	const blob = new Blob([csv], { type: "text/csv" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `vitals_${patientId}_${new Date().toISOString().split("T")[0]}.csv`;
	a.click();
	URL.revokeObjectURL(url);

	toast.success("Vitals exported successfully.");
}
