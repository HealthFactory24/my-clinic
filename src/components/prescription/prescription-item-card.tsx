import { AlertCircle } from "lucide-react";

import { MiniField } from "./primitives";

type PrescriptionItem = {
	id?: string;
	medicationName: string;
	genericName?: string | null;
	form?: string | null;
	concentration?: string | null;
	dose?: string | null;
	calculatedLiquidDoseMl?: number | null;
	route?: string | null;
	frequency?: string | null;
	durationDays?: number | null;
	refills?: number | null;
	dispenseQuantity?: string | null;
	instructions?: string | null;
	warnings?: string | null;
};

export function PrescriptionItemCard({ item }: { item: PrescriptionItem }) {
	return (
		<div className='rounded-xl border border-slate-200 bg-slate-50/50 p-4'>
			<div className='flex items-start justify-between gap-3'>
				<div className='min-w-0 flex-1'>
					<div className='flex flex-wrap items-center gap-2'>
						<span className='font-bold text-slate-900 text-sm'>
							{item.medicationName}
						</span>
						{item.genericName ? (
							<span className='text-slate-500 text-xs'>
								({item.genericName})
							</span>
						) : null}
					</div>
					<div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-600 text-xs'>
						{item.form ? <span>{item.form}</span> : null}
						{item.concentration ? <span>• {item.concentration}</span> : null}
						{item.dose ? <span>• {item.dose}</span> : null}
					</div>
				</div>
				{item.calculatedLiquidDoseMl ? (
					<div className='shrink-0 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-right'>
						<div className='font-semibold text-[10px] text-slate-500 uppercase'>
							Dose
						</div>
						<div className='font-bold font-mono text-sm text-teal-700'>
							{item.calculatedLiquidDoseMl} mL
						</div>
					</div>
				) : null}
			</div>

			<div className='mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4'>
				<MiniField
					label='Route'
					value={item.route}
				/>
				<MiniField
					label='Frequency'
					value={item.frequency}
				/>
				<MiniField
					label='Duration'
					value={item.durationDays ? `${item.durationDays} days` : undefined}
				/>
				<MiniField
					label='Refills'
					value={String(item.refills ?? 0)}
				/>
			</div>

			{item.dispenseQuantity ? (
				<div className='mt-2 text-[11px] text-slate-500'>
					Dispense: <strong>{item.dispenseQuantity}</strong>
				</div>
			) : null}

			{item.instructions ? (
				<div className='mt-2 rounded-lg border border-slate-200 bg-white p-2.5'>
					<div className='font-semibold text-[10px] text-slate-500 uppercase'>
						Instructions
					</div>
					<p className='text-slate-700 text-xs leading-relaxed'>
						{item.instructions}
					</p>
				</div>
			) : null}

			{item.warnings ? (
				<div className='mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800'>
					<AlertCircle className='mt-0.5 size-3.5 shrink-0 text-amber-600' />
					<span>{item.warnings}</span>
				</div>
			) : null}
		</div>
	);
}
