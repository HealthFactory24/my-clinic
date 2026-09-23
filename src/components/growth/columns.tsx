// src/components/growth/columns.tsx

import { Badge } from "#/components/ui/badge.tsx";
import type { GrowthMeasurement } from "#/lib/db/schema";
import { cn } from "#/lib/utils.ts";
import {
	classifyPercentile,
	PERCENTILE_BAND_RANGES
} from "#/utils/growth-utils.ts";

import { createAppColumnHelper } from "../table";

const helper = createAppColumnHelper<GrowthMeasurement>();

// ─── Cell renderers ────────────────────────────────────────────────────────
function AgeCell({ months }: { months: number | null | undefined }) {
	if (months == null) return <span className='text-muted-foreground'>—</span>;

	const totalDays = Math.round(months * 30.4375);
	let displayString = "";

	if (totalDays < 14) {
		displayString = `${totalDays}d`;
	} else if (totalDays < 90) {
		displayString = `${Math.floor(totalDays / 7)}w`;
	} else if (months < 24) {
		displayString = `${Math.floor(months)}mo`;
	} else {
		displayString = `${Math.floor(months / 12)}y`;
	}

	return (
		<span className='font-mono text-sm tabular-nums'>{displayString}</span>
	);
}
function MeasurementCell({
	value,
	unit,
	precision = 1
}: {
	value: number | null | undefined;
	unit: string;
	precision?: number;
}) {
	if (value == null) return <span className='text-muted-foreground'>—</span>;
	return (
		<span className='font-mono tabular-nums'>
			{value.toFixed(precision)}
			<span className='ml-0.5 text-muted-foreground text-xs'>{unit}</span>
		</span>
	);
}

function PercentileCell({
	percentile,
	zScore
}: {
	percentile: number | null | undefined;
	zScore?: number | null | undefined;
}) {
	if (percentile == null)
		return <span className='text-muted-foreground'>—</span>;

	const band = classifyPercentile(percentile);
	const bandConfig = PERCENTILE_BAND_RANGES[band];

	return (
		<div className='flex items-center gap-1.5'>
			<Badge
				className={cn(
					"font-mono text-[10px] tabular-nums",
					bandConfig.className
				)}
				title={zScore != null ? `Z-score: ${zScore.toFixed(2)}` : undefined}
				variant={bandConfig.variant}
			>
				{percentile.toFixed(0)}%
			</Badge>
			{zScore != null && (
				<span className='font-mono text-[10px] text-muted-foreground tabular-nums'>
					z={zScore.toFixed(1)}
				</span>
			)}
		</div>
	);
}

// ─── Column definitions ────────────────────────────────────────────────────

export const growthColumns = helper.columns([
	helper.accessor("recordedAt", {
		id: "recordedAt",
		header: "Recorded",
		cell: ({ getValue }) => {
			const date = new Date(getValue());
			return (
				<div className='flex flex-col'>
					<span className='text-sm'>
						{date.toLocaleDateString(undefined, {
							year: "numeric",
							month: "short",
							day: "numeric"
						})}
					</span>
					<span className='text-muted-foreground text-xs'>
						{date.toLocaleTimeString(undefined, {
							hour: "2-digit",
							minute: "2-digit"
						})}
					</span>
				</div>
			);
		},
		meta: { label: "Recorded", variant: "date" },
		size: 140
	}),

	helper.accessor("ageMonths", {
		id: "ageMonths",
		header: "Age",
		cell: ({ getValue }) => <AgeCell months={getValue()} />,
		meta: { label: "Age", variant: "number" },
		size: 100
	}),

	helper.accessor("weightKg", {
		id: "weightKg",
		header: "Weight",
		cell: ({ getValue }) => (
			<MeasurementCell
				precision={2}
				unit='kg'
				value={getValue()}
			/>
		),
		meta: { label: "Weight", variant: "number" },
		size: 90
	}),

	helper.accessor("heightCm", {
		id: "heightCm",
		header: "Height",
		cell: ({ getValue }) => (
			<MeasurementCell
				unit='cm'
				value={getValue()}
			/>
		),
		meta: { label: "Height", variant: "number" },
		size: 90
	}),

	helper.accessor("headCircumferenceCm", {
		id: "headCircumferenceCm",
		header: "Head Circ.",
		cell: ({ getValue }) => (
			<MeasurementCell
				unit='cm'
				value={getValue()}
			/>
		),
		meta: { label: "Head Circumference", variant: "number" },
		size: 100
	}),

	helper.accessor("bmi", {
		id: "bmi",
		header: "BMI",
		cell: ({ getValue }) => (
			<MeasurementCell
				unit='kg/m²'
				value={getValue()}
			/>
		),
		meta: { label: "BMI", variant: "number" },
		size: 90
	}),

	helper.accessor("weightForAgePercentile", {
		id: "weightPercentile",
		header: "Weight %ile",
		cell: ({ row }) => (
			<PercentileCell
				percentile={row.original.weightForAgePercentile}
				zScore={row.original.weightForAgeZScore}
			/>
		),
		meta: { label: "Weight Percentile", variant: "number" },
		size: 130
	}),

	helper.accessor("heightForAgePercentile", {
		id: "heightPercentile",
		header: "Height %ile",
		cell: ({ row }) => (
			<PercentileCell
				percentile={row.original.heightForAgePercentile}
				zScore={row.original.heightForAgeZScore}
			/>
		),
		meta: { label: "Height Percentile", variant: "number" },
		size: 130
	}),

	helper.accessor("bmiForAgePercentile", {
		id: "bmiPercentile",
		header: "BMI %ile",
		cell: ({ row }) => (
			<PercentileCell
				percentile={row.original.bmiForAgePercentile}
				zScore={row.original.bmiForAgeZScore}
			/>
		),
		meta: { label: "BMI Percentile", variant: "number" },
		size: 130
	}),

	helper.accessor("recordedBy", {
		id: "recordedBy",
		header: "Recorded By",
		cell: ({ getValue }) => (
			<span className='text-muted-foreground text-sm'>{getValue() || "—"}</span>
		),
		meta: { label: "Recorded By", variant: "text" },
		size: 160
	})
]);
