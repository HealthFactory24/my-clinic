import { renderDate, selectColumn } from "@/components/table/columns/shared";
import type { VitalSigns } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { getFeverClassification } from "@/utils/index";

import { createAppColumnHelper } from "../table";

const vitalHelper = createAppColumnHelper<VitalSigns>();

export const vitalColumns = vitalHelper.columns([
	selectColumn(vitalHelper),

	vitalHelper.accessor("recordedAt", {
		id: "recordedAt",
		header: ({ header }) => <header.ColumnHeader title='Recorded' />,
		cell: ({ getValue }) => renderDate(getValue(), true),
		meta: { label: "Recorded", variant: "date" },
		size: 150
	}),

	vitalHelper.accessor("temperatureC", {
		id: "temperatureC",
		header: ({ header }) => <header.ColumnHeader title='Temp (°C)' />,
		cell: ({ getValue }) => {
			const temp = getValue();
			const classification = getFeverClassification(temp);
			return (
				<div className={cn("font-medium", classification.color.split(" ")[0])}>
					{temp.toFixed(1)}°C
				</div>
			);
		},
		meta: { label: "Temperature", variant: "number" },
		size: 100
	}),

	vitalHelper.accessor("heartRateBpm", {
		id: "heartRateBpm",
		header: ({ header }) => <header.ColumnHeader title='HR (bpm)' />,
		cell: ({ getValue }) => <span className='font-mono'>{getValue()}</span>,
		meta: { label: "Heart Rate", variant: "number" },
		size: 80
	}),

	vitalHelper.accessor("respiratoryRateBpm", {
		id: "respiratoryRateBpm",
		header: ({ header }) => <header.ColumnHeader title='RR (bpm)' />,
		cell: ({ getValue }) => <span className='font-mono'>{getValue()}</span>,
		meta: { label: "Respiratory Rate", variant: "number" },
		size: 80
	}),

	vitalHelper.accessor("oxygenSaturationPercent", {
		id: "oxygenSaturationPercent",
		header: ({ header }) => <header.ColumnHeader title='SpO₂ (%)' />,
		cell: ({ getValue }) => {
			const spo2 = getValue();
			return (
				<span className={cn("font-mono", spo2 < 95 && "text-destructive")}>
					{spo2}%
				</span>
			);
		},
		meta: { label: "Oxygen Saturation", variant: "number" },
		size: 80
	}),

	vitalHelper.accessor("painScore", {
		id: "painScore",
		header: ({ header }) => <header.ColumnHeader title='Pain' />,
		cell: ({ getValue }) => {
			const score = getValue() || 0;
			const emojis = ["😊", "🙂", "😐", "😟", "😣", "😭"];
			return (
				<div className='flex items-center gap-1.5'>
					<span>{emojis[Math.min(Math.floor(score / 2), 5)]}</span>
					<span className='font-mono text-xs'>{score}/10</span>
				</div>
			);
		},
		meta: { label: "Pain Score", variant: "number" },
		size: 90
	}),

	vitalHelper.accessor("weightKg", {
		id: "weightKg",
		header: ({ header }) => <header.ColumnHeader title='Weight (kg)' />,
		cell: ({ getValue }) => (
			<span className='font-mono'>{getValue()?.toFixed(1) ?? "—"}</span>
		),
		meta: { label: "Weight", variant: "number" },
		size: 90
	})
]);
