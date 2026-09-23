export type PrescriptionStatus =
	| "Active"
	| "Completed"
	| "Discontinued"
	| "Cancelled";

export const STATUS_CONFIG: Record<
	PrescriptionStatus,
	{ label: string; className: string }
> = {
	Active: {
		label: "Active",
		className: "bg-emerald-100 text-emerald-800 border-emerald-200"
	},
	Completed: {
		label: "Completed",
		className: "bg-blue-100 text-blue-800 border-blue-200"
	},
	Discontinued: {
		label: "Discontinued",
		className: "bg-orange-100 text-orange-800 border-orange-200"
	},
	Cancelled: {
		label: "Cancelled",
		className: "bg-rose-100 text-rose-800 border-rose-200"
	}
};
