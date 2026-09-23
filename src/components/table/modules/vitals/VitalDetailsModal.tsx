import { AlertCircle, HeartPulse, Printer, X } from "lucide-react";
import { useCallback } from "react";

import type { VitalSigns } from "@/lib/db/schema";
import { getFeverClassification } from "@/utils/index";

interface VitalDetailsModalProps {
	onClose: () => void;
	onDelete?: () => void;
	vital: VitalSigns;
}

export function VitalDetailsModal({ vital, onClose }: VitalDetailsModalProps) {
	const fever = getFeverClassification(vital.temperatureC);

	const isAbnormal = useCallback(() => {
		if (vital.temperatureC < 35.5 || vital.temperatureC > 38.0) return true;
		if (vital.heartRateBpm < 60 || vital.heartRateBpm > 160) return true;
		if (vital.respiratoryRateBpm < 12 || vital.respiratoryRateBpm > 40)
			return true;
		if (vital.oxygenSaturationPercent < 95) return true;
		return false;
	}, [vital])();

	const formatDate = useCallback((date: Date | string) => {
		const d = typeof date === "string" ? new Date(date) : date;
		return d.toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}, []);

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
			onClick={event => {
				if (event.target === event.currentTarget) onClose();
			}}
			role='presentation'
		>
			<dialog
				aria-label='Vital signs details'
				className='flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl outline-none'
				onCancel={onClose}
				open
			>
				<header className='flex items-start justify-between border-slate-100 border-b p-5'>
					<div>
						<div className='flex items-center gap-2'>
							<HeartPulse className='size-5 text-teal-600' />
							<p className='font-semibold text-slate-500 text-xs uppercase'>
								Vital Signs Record
							</p>
							{isAbnormal && (
								<span className='rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 font-bold text-[10px] text-amber-800'>
									<AlertCircle className='mr-1 inline size-3' />
									Abnormal
								</span>
							)}
						</div>
						<h2 className='mt-1 font-bold text-lg text-slate-800'>
							{formatDate(vital.recordedAt)}
						</h2>
						<p className='mt-1 text-slate-500 text-xs'>
							Recorded by: {vital.recordedBy}
							{vital.temperatureMethod
								? ` • Method: ${vital.temperatureMethod}`
								: null}
						</p>
					</div>
					<button
						aria-label='Close details'
						className='rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600'
						onClick={onClose}
						type='button'
					>
						<X className='size-5' />
					</button>
				</header>

				<div className='grid gap-4 overflow-y-auto p-5 sm:grid-cols-2'>
					<div className='rounded-xl border border-slate-100 bg-slate-50 p-4 text-center'>
						<span className='block text-[10px] text-slate-400 uppercase'>
							Temperature
						</span>
						<span
							className={`font-bold text-2xl ${
								fever.severity === "danger"
									? "text-rose-600"
									: fever.severity === "warning"
										? "text-amber-600"
										: "text-slate-800"
							}`}
						>
							{vital.temperatureC}°C
						</span>
						<span className='block text-slate-500 text-xs'>{fever.label}</span>
					</div>

					<div className='rounded-xl border border-slate-100 bg-slate-50 p-4 text-center'>
						<span className='block text-[10px] text-slate-400 uppercase'>
							Heart Rate
						</span>
						<span className='font-bold text-2xl text-slate-800'>
							{vital.heartRateBpm}
						</span>
						<span className='block text-slate-500 text-xs'>
							beats per minute
						</span>
					</div>

					<div className='rounded-xl border border-slate-100 bg-slate-50 p-4 text-center'>
						<span className='block text-[10px] text-slate-400 uppercase'>
							Respiratory Rate
						</span>
						<span className='font-bold text-2xl text-slate-800'>
							{vital.respiratoryRateBpm}
						</span>
						<span className='block text-slate-500 text-xs'>
							breaths per minute
						</span>
					</div>

					<div className='rounded-xl border border-slate-100 bg-slate-50 p-4 text-center'>
						<span className='block text-[10px] text-slate-400 uppercase'>
							SpO₂
						</span>
						<span
							className={`font-bold text-2xl ${
								(vital.oxygenSaturationPercent || 0) < 95
									? "text-rose-600"
									: "text-slate-800"
							}`}
						>
							{vital.oxygenSaturationPercent || "--"}%
						</span>
						<span className='block text-slate-500 text-xs'>Room Air</span>
					</div>

					{vital.systolicBp || vital.diastolicBp ? (
						<div className='rounded-xl border border-slate-100 bg-slate-50 p-4 text-center'>
							<span className='block text-[10px] text-slate-400 uppercase'>
								Blood Pressure
							</span>
							<span className='font-bold text-2xl text-slate-800'>
								{vital.systolicBp || "--"}/{vital.diastolicBp || "--"}
							</span>
							<span className='block text-slate-500 text-xs'>mmHg</span>
						</div>
					) : null}

					<div className='rounded-xl border border-slate-100 bg-slate-50 p-4 text-center'>
						<span className='block text-[10px] text-slate-400 uppercase'>
							Pain Score
						</span>
						<span className='font-bold text-2xl text-slate-800'>
							{vital.painScore ?? "-"}
						</span>
						<span className='block text-slate-500 text-xs'>
							{vital.painScaleType || "FLACC"}
						</span>
					</div>
				</div>

				{vital.notes ? (
					<div className='border-slate-100 border-t p-5'>
						<h3 className='font-semibold text-slate-500 text-xs uppercase'>
							Clinical Notes
						</h3>
						<p className='mt-1 text-slate-700 text-sm leading-relaxed'>
							{vital.notes}
						</p>
					</div>
				) : null}

				<footer className='flex items-center justify-end gap-2 border-slate-100 border-t px-5 py-3'>
					<button
						className='flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 text-xs transition-colors hover:bg-slate-50'
						onClick={() => window.print()}
						type='button'
					>
						<Printer className='size-3.5' />
						Print
					</button>
					<button
						className='rounded-xl bg-teal-600 px-4 py-2 font-bold text-white text-xs transition-colors hover:bg-teal-700'
						onClick={onClose}
						type='button'
					>
						Close
					</button>
				</footer>
			</dialog>
		</div>
	);
}

export default VitalDetailsModal;
