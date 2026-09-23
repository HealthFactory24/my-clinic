import type { BadgeProps } from "@/components/ui/badge";

export type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Single source of truth for status → badge variant mapping.
 * Every column set draws from this map.
 */
export const STATUS_VARIANTS = {
	// Active status
	Active: "default",
	Inactive: "secondary",
	Archived: "outline",
	// Appointment
	Scheduled: "default",
	"Checked In": "secondary",
	"In Progress": "default",
	Completed: "default",
	Cancelled: "destructive",
	"No Show": "destructive",
	// Encounter
	Draft: "secondary",
	Signed: "default",
	Amended: "secondary",
	// Immunization
	Administered: "default",
	Due: "secondary",
	Overdue: "destructive",
	Upcoming: "secondary",
	Deferred: "secondary",
	Refused: "destructive",
	// Lab
	Ordered: "secondary",
	"Sample Collected": "secondary",
	Processing: "secondary",
	// Lab result flag
	Normal: "default",
	Abnormal: "secondary",
	Critical: "destructive"
} as const satisfies Record<string, BadgeVariant>;

export type StatusKey = keyof typeof STATUS_VARIANTS;
