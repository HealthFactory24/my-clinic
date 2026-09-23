// src/routes/_auth/app/encounters/$id.tsx

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	AlertCircle,
	Calendar,
	ChevronLeft,
	ClipboardList,
	Edit,
	FileText,
	Link,
	Printer,
	Stethoscope,
	User,
	X
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EncounterDetailSkeleton } from "@/components/skeletons"; // ✅ ADD
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import {
	useDeleteEncounter,
	useEncounterById,
	usePatientById,
	useUpdateEncounter
} from "@/hooks";
import { useAuth } from "@/lib/auth/hooks";
import { formatDate } from "@/lib/utils";
import { calculatePediatricAge } from "@/utils";

export const Route = createFileRoute("/_auth/app/encounters/$id")({
	component: EncounterDetailPage,
	pendingComponent: EncounterDetailSkeleton
});

// ─── Types ──────────────────────────────────────────────────────────────────

type EncounterStatus = "Draft" | "Completed" | "Signed" | "Amended";

const STATUS_CONFIG: Record<
	EncounterStatus,
	{ label: string; className: string }
> = {
	Draft: {
		label: "Draft",
		className: "bg-slate-100 text-slate-700 border-slate-200"
	},
	Completed: {
		label: "Completed",
		className: "bg-emerald-100 text-emerald-800 border-emerald-200"
	},
	Signed: {
		label: "Signed",
		className: "bg-blue-100 text-blue-800 border-blue-200"
	},
	Amended: {
		label: "Amended",
		className: "bg-amber-100 text-amber-800 border-amber-200"
	}
};

// ─── Page ───────────────────────────────────────────────────────────────────

function EncounterDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.role === "admin" || user?.role === "doctor";

	const { data: encounter, isLoading } = useEncounterById(id);
	const patientQuery = usePatientById(encounter?.patientId ?? "");
	const patient = patientQuery.data;

	const deleteEncounter = useDeleteEncounter();
	const updateEncounter = useUpdateEncounter();

	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	if (isLoading || !encounter) {
		return <EncounterDetailSkeleton />;
	}

	const age = patient ? calculatePediatricAge(patient.dateOfBirth) : null;
	const status = encounter.status;
	const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Draft;

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteEncounter.mutateAsync(encounter.id);
			toast.success("Encounter deleted successfully.");
			void navigate({ to: "/app/encounters" });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete encounter."
			);
		} finally {
			setIsDeleting(false);
			setConfirmDelete(false);
		}
	};

	const handleStatusChange = async (next: EncounterStatus) => {
		if (next === status) return;
		try {
			await updateEncounter.mutateAsync({
				...encounter,
				encounterDate: encounter.encounterDate,

				status: next,
				signedAt:
					next === "Signed"
						? new Date()
						: encounter.signedAt instanceof Date
							? encounter.signedAt
							: (encounter.signedAt ?? null),
				signedBy: next === "Signed" ? user?.id : encounter.signedBy
			});
			toast.success(`Status updated to ${STATUS_CONFIG[next].label}.`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to update status."
			);
		}
	};

	// Extract SOAP data
	const subjective = encounter.subjectiveJson as Record<string, unknown> | null;
	const objective = encounter.objectiveJson as Record<string, unknown> | null;
	const assessment = encounter.assessmentJson as Record<string, unknown> | null;
	const plan = encounter.planJson as Record<string, unknown> | null;

	return (
		<div className='container mx-auto max-w-4xl space-y-6 py-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-3'>
					<Link to='/app/encounters'>
						<Button
							size='sm'
							variant='ghost'
						>
							<ChevronLeft className='mr-1 size-4' />
							Back
						</Button>
					</Link>
					<h1 className='font-bold text-2xl text-slate-800'>
						Encounter Details
					</h1>
				</div>
				<div className='flex items-center gap-2'>
					<Button
						onClick={() => window.print()}
						size='sm'
						variant='outline'
					>
						<Printer className='mr-2 size-4' />
						Print
					</Button>
					{isAdmin ? (
						<Link to='/app/encounters/$id/edit'>
							<Button size='sm'>
								<Edit className='mr-2 size-4' />
								Edit
							</Button>
						</Link>
					) : null}
				</div>
			</div>

			{/* Main Card */}
			<Card>
				<CardHeader className='border-b'>
					<div className='flex flex-wrap items-start justify-between gap-4'>
						<div className='flex items-start gap-3'>
							<div className='flex size-12 items-center justify-center rounded-xl bg-teal-600 text-white'>
								<Stethoscope className='size-6' />
							</div>
							<div>
								<CardTitle className='text-lg'>
									{encounter.visitType || "Clinical Encounter"}
								</CardTitle>
								<div className='mt-1 flex flex-wrap items-center gap-2 text-slate-500 text-xs'>
									<span className='flex items-center gap-1'>
										<Calendar className='size-3' />
										{formatDate(encounter.encounterDate)}
									</span>
									<span>•</span>
									<span className='flex items-center gap-1'>
										<User className='size-3' />
										{encounter.providerName}
									</span>
									{encounter.signedBy ? (
										<>
											<span>•</span>
											<span>Signed by: {encounter.signedBy}</span>
										</>
									) : null}
								</div>
							</div>
						</div>
						<Badge
							className={statusCfg.className}
							variant='outline'
						>
							{statusCfg.label}
						</Badge>
					</div>
				</CardHeader>

				<CardContent className='space-y-6 pt-6'>
					{/* Patient */}
					{patient ? (
						<div className='rounded-lg border border-teal-200 bg-teal-50/70 p-4'>
							<div className='flex items-start gap-3'>
								<div
									className={`flex size-12 shrink-0 items-center justify-center rounded-2xl font-bold text-sm shadow-sm ${
										patient.gender === "male"
											? "border border-sky-200 bg-sky-100 text-sky-800"
											: "border border-pink-200 bg-pink-100 text-pink-800"
									}`}
								>
									{patient.firstName?.[0]}
									{patient.lastName?.[0]}
								</div>
								<div className='min-w-0 flex-1'>
									<div className='flex flex-wrap items-center gap-2'>
										<span className='font-bold text-slate-800 text-sm'>
											{patient.firstName} {patient.lastName}
										</span>
										<Badge
											className='px-1.5 text-[10px]'
											variant='outline'
										>
											{age?.ageGroup ?? "—"}
										</Badge>
									</div>
									<div className='mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-600 text-xs'>
										<span className='font-mono'>{patient.mrn}</span>
										<span>•</span>
										<span>{age?.displayString ?? "Unknown age"}</span>
										<span>•</span>
										<span className='capitalize'>{patient.gender}</span>
									</div>
								</div>
								<Button
									onClick={() =>
										navigate({
											to: "/app/patients/$patientId",
											params: { patientId: patient.id }
										})
									}
									size='sm'
									variant='outline'
								>
									View Chart →
								</Button>
							</div>

							{patient.allergies && patient.allergies.length > 0 ? (
								<div className='mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-800 text-xs'>
									<AlertCircle className='mt-0.5 size-4 shrink-0 text-rose-600' />
									<div>
										<span className='font-bold'>Allergies:</span>{" "}
										{patient.allergies.map(a => a.allergen).join(", ")}
									</div>
								</div>
							) : null}
						</div>
					) : null}

					{/* Chief Complaint */}
					{encounter.chiefComplaint ? (
						<div className='rounded-lg border bg-slate-50 p-4'>
							<span className='block font-semibold text-slate-400 text-xs uppercase tracking-wider'>
								Chief Complaint
							</span>
							<p className='mt-1 font-medium text-slate-800 text-sm'>
								{encounter.chiefComplaint}
							</p>
						</div>
					) : null}

					{/* SOAP Sections */}
					<SoapSection
						data={subjective}
						icon={<ClipboardList className='size-4' />}
						label='S — Subjective'
						title='History & Symptoms'
					/>

					<SoapSection
						data={objective}
						icon={<Stethoscope className='size-4' />}
						label='O — Objective'
						title='Physical Examination'
					/>

					<SoapSection
						data={assessment}
						icon={<FileText className='size-4' />}
						label='A — Assessment'
						title='Diagnoses & Clinical Impression'
					/>

					<SoapSection
						data={plan}
						icon={<ClipboardList className='size-4' />}
						label='P — Plan'
						title='Treatment & Follow-up'
					/>

					{/* Follow-up */}
					{encounter.followUpDate ? (
						<div className='rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm'>
							<span className='font-semibold text-blue-800'>
								Follow-up scheduled:
							</span>{" "}
							<span className='text-blue-700'>
								{formatDate(encounter.followUpDate)}
							</span>
						</div>
					) : null}

					{/* Metadata */}
					<div className='grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-[10px] text-slate-400'>
						<span>
							Created: {new Date(encounter.createdAt).toLocaleString()}
						</span>
						<span>
							Updated: {new Date(encounter.updatedAt).toLocaleString()}
						</span>
					</div>
				</CardContent>

				{/* Footer */}
				{isAdmin ? (
					<CardFooter className='flex flex-wrap items-center justify-between gap-2 border-t pt-4'>
						<div className='flex flex-wrap items-center gap-2'>
							{status === "Draft" ? (
								<Button
									onClick={() => handleStatusChange("Completed")}
									size='sm'
									variant='outline'
								>
									Mark Completed
								</Button>
							) : null}

							{status === "Completed" ? (
								<Button
									onClick={() => handleStatusChange("Signed")}
									size='sm'
									variant='outline'
								>
									Sign Encounter
								</Button>
							) : null}

							{confirmDelete ? (
								<div className='flex items-center gap-2'>
									<span className='text-slate-600 text-xs'>
										Delete permanently?
									</span>
									<Button
										disabled={isDeleting}
										onClick={handleDelete}
										size='sm'
										variant='destructive'
									>
										{isDeleting ? "Deleting..." : "Confirm"}
									</Button>
									<Button
										onClick={() => setConfirmDelete(false)}
										size='sm'
										variant='outline'
									>
										Cancel
									</Button>
								</div>
							) : (
								<Button
									onClick={() => setConfirmDelete(true)}
									size='sm'
									variant='destructive'
								>
									<X className='mr-1.5 size-3.5' />
									Delete
								</Button>
							)}
						</div>
					</CardFooter>
				) : null}
			</Card>
		</div>
	);
}

// ─── SOAP Section Component ─────────────────────────────────────────────────

function SoapSection({
	label,
	title,
	data,
	icon
}: {
	label: string;
	title: string;
	data: Record<string, unknown> | null;
	icon: React.ReactNode;
}) {
	if (!data || Object.keys(data).length === 0) return null;

	return (
		<div className='rounded-lg border border-slate-200 bg-slate-50/50 p-4'>
			<div className='mb-3 flex items-center gap-2'>
				<span className='text-teal-600'>{icon}</span>
				<div>
					<h3 className='font-bold text-teal-700 text-xs uppercase tracking-wider'>
						{label}
					</h3>
					<p className='text-[10px] text-slate-400'>{title}</p>
				</div>
			</div>
			<div className='space-y-2'>
				{Object.entries(data).map(([key, value]) => (
					<div key={key}>
						<span className='font-semibold text-[10px] text-slate-500 uppercase'>
							{key.replace(/([A-Z])/g, " $1").trim()}
						</span>
						<p className='text-slate-700 text-sm leading-relaxed'>
							{formatValue(value)}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}

function formatValue(value: unknown): string {
	if (value === null || value === undefined) return "—";
	if (typeof value === "string") return value || "—";
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);
	if (Array.isArray(value)) {
		return value.length > 0 ? value.map(formatValue).join(", ") : "—";
	}
	return JSON.stringify(value, null, 2);
}
