import { renderDate, selectColumn } from "@/components/table/columns/shared";
import { Badge } from "@/components/ui/badge";
import type { GrowthMeasurement } from "@/lib/db/schema";

import { createAppColumnHelper } from "../table";

const growthHelper = createAppColumnHelper<GrowthMeasurement>();

export const growthColumns = growthHelper.columns([
	selectColumn(growthHelper),

	growthHelper.accessor("ageMonths", {
		id: "ageMonths",
		header: ({ header }) => <header.ColumnHeader title='Age (months)' />,
		cell: ({ getValue }) => (
			<span className='font-mono'>{getValue().toFixed(1)}</span>
		),
		meta: { label: "Age", variant: "number" },
		size: 100
	}),

	growthHelper.accessor("weightKg", {
		id: "weightKg",
		header: ({ header }) => <header.ColumnHeader title='Weight (kg)' />,
		cell: ({ getValue }) => (
			<span className='font-mono'>{getValue().toFixed(2)}</span>
		),
		meta: { label: "Weight", variant: "number" },
		size: 100
	}),

	growthHelper.accessor("heightCm", {
		id: "heightCm",
		header: ({ header }) => <header.ColumnHeader title='Height (cm)' />,
		cell: ({ getValue }) => (
			<span className='font-mono'>{getValue().toFixed(1)}</span>
		),
		meta: { label: "Height", variant: "number" },
		size: 100
	}),

	growthHelper.accessor("headCircumferenceCm", {
		id: "headCircumferenceCm",
		header: ({ header }) => <header.ColumnHeader title='Head (cm)' />,
		cell: ({ getValue }) => (
			<span className='font-mono'>{getValue()?.toFixed(1) ?? "—"}</span>
		),
		meta: { label: "Head Circumference", variant: "number" },
		size: 100
	}),

	growthHelper.accessor("bmi", {
		id: "bmi",
		header: ({ header }) => <header.ColumnHeader title='BMI' />,
		cell: ({ getValue }) => (
			<span className='font-mono'>{getValue().toFixed(1)}</span>
		),
		meta: { label: "BMI", variant: "number" },
		size: 80
	}),

	growthHelper.accessor("weightForAgePercentile", {
		id: "weightForAgePercentile",
		header: ({ header }) => <header.ColumnHeader title='Weight %ile' />,
		cell: ({ getValue }) => {
			const percentile = getValue();
			if (percentile === null)
				return <span className='text-muted-foreground'>—</span>;
			return (
				<Badge
					variant={
						percentile < 5 || percentile > 95 ? "destructive" : "secondary"
					}
				>
					{percentile}%
				</Badge>
			);
		},
		meta: { label: "Weight Percentile", variant: "number" },
		size: 100
	}),

	growthHelper.accessor("heightForAgePercentile", {
		id: "heightForAgePercentile",
		header: ({ header }) => <header.ColumnHeader title='Height %ile' />,
		cell: ({ getValue }) => {
			const percentile = getValue();
			if (percentile === null)
				return <span className='text-muted-foreground'>—</span>;
			return (
				<Badge
					variant={
						percentile < 5 || percentile > 95 ? "destructive" : "secondary"
					}
				>
					{percentile}%
				</Badge>
			);
		},
		meta: { label: "Height Percentile", variant: "number" },
		size: 100
	}),

	growthHelper.accessor("recordedAt", {
		id: "recordedAt",
		header: ({ header }) => <header.ColumnHeader title='Recorded' />,
		cell: ({ getValue }) => renderDate(getValue()),
		meta: { label: "Recorded", variant: "date" },
		size: 120
	})
]);
