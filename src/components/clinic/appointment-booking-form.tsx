// components/clinic/appointment-booking-form.tsx

"use client";

import { Calendar, Clock, Stethoscope, User } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AppointmentSlot {
	/** Time slot in HH:MM format. */
	time: string;
	/** Whether the slot is available. */
	available: boolean;
}

interface AppointmentBookingFormProps {
	/** Available dates to choose from. */
	availableDates?: string[];
	/** Available time slots for the selected date. */
	availableSlots?: AppointmentSlot[];
	/** List of doctors to choose from. */
	doctors?: { id: string; name: string; specialty: string }[];
	/** Patient name (pre-filled). */
	patientName?: string;
	/** Callback when form is submitted. */
	onSubmit?: (data: {
		date: string;
		time: string;
		doctorId: string;
		reason: string;
		notes: string;
	}) => void;
	/** Callback when form is cancelled. */
	onCancel?: () => void;
	/** Whether the form is submitting. */
	isSubmitting?: boolean;
	/** Card heading. */
	title?: string;
	/** Optional description. */
	description?: string;
	className?: string;
	children?: React.ReactNode;
}

const DEFAULT_DATES = [
	"2026-09-22",
	"2026-09-23",
	"2026-09-24",
	"2026-09-25",
	"2026-09-26"
];

const DEFAULT_SLOTS: AppointmentSlot[] = [
	{ time: "09:00", available: true },
	{ time: "09:30", available: true },
	{ time: "10:00", available: false },
	{ time: "10:30", available: true },
	{ time: "11:00", available: true },
	{ time: "11:30", available: false },
	{ time: "14:00", available: true },
	{ time: "14:30", available: true },
	{ time: "15:00", available: true },
	{ time: "15:30", available: false },
	{ time: "16:00", available: true },
	{ time: "16:30", available: true }
];

const DEFAULT_DOCTORS = [
	{ id: "1", name: "Dr. Sarah Johnson", specialty: "General Pediatrics" },
	{ id: "2", name: "Dr. Michael Chen", specialty: "Pediatric Cardiology" },
	{ id: "3", name: "Dr. Emily Rodriguez", specialty: "Pediatric Neurology" }
];

const VISIT_REASONS = [
	{ value: "well-child", label: "Well-Child Check" },
	{ value: "sick-visit", label: "Sick Visit" },
	{ value: "follow-up", label: "Follow-Up" },
	{ value: "immunization", label: "Immunization" },
	{ value: "consultation", label: "Consultation" },
	{ value: "other", label: "Other" }
];

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric"
	});
}

export function AppointmentBookingForm({
	availableDates = DEFAULT_DATES,
	availableSlots = DEFAULT_SLOTS,
	doctors = DEFAULT_DOCTORS,
	patientName = "John Doe",
	onSubmit,
	onCancel,
	isSubmitting = false,
	title = "Book an Appointment",
	description = "Schedule a visit with one of our pediatricians",
	className,
	children
}: AppointmentBookingFormProps) {
	const [selectedDate, setSelectedDate] = useState(availableDates[0] ?? "");
	const [selectedTime, setSelectedTime] = useState("");
	const [selectedDoctor, setSelectedDoctor] = useState("");
	const [reason, setReason] = useState("");
	const [notes, setNotes] = useState("");

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (!selectedDate || !selectedTime || !selectedDoctor || !reason) return;
			onSubmit?.({
				date: selectedDate,
				time: selectedTime,
				doctorId: selectedDoctor,
				reason,
				notes
			});
		},
		[selectedDate, selectedTime, selectedDoctor, reason, notes, onSubmit]
	);

	const isFormValid = useMemo(
		() => selectedDate && selectedTime && selectedDoctor && reason,
		[selectedDate, selectedTime, selectedDoctor, reason]
	);

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Calendar className='h-5 w-5 text-muted-foreground' />
					{title}
				</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>
				<form
					className='space-y-6'
					onSubmit={handleSubmit}
				>
					<div className='space-y-2'>
						<Label className='flex items-center gap-1.5'>
							<User className='h-3.5 w-3.5' />
							Patient
						</Label>
						<Input
							disabled
							value={patientName}
						/>
					</div>

					<div className='space-y-2'>
						<Label className='flex items-center gap-1.5'>
							<Stethoscope className='h-3.5 w-3.5' />
							Provider
						</Label>
						<Select
							onValueChange={setSelectedDoctor}
							value={selectedDoctor}
						>
							<SelectTrigger>
								<SelectValue placeholder='Select a provider' />
							</SelectTrigger>
							<SelectContent>
								{doctors.map(doctor => (
									<SelectItem
										key={doctor.id}
										value={doctor.id}
									>
										{doctor.name} — {doctor.specialty}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label className='flex items-center gap-1.5'>
							<Calendar className='h-3.5 w-3.5' />
							Date
						</Label>
						<div className='flex flex-wrap gap-2'>
							{availableDates.map(date => (
								<Button
									className={cn(
										"min-w-[100px]",
										selectedDate === date && "ring-2 ring-primary ring-offset-2"
									)}
									key={date}
									onClick={() => {
										setSelectedDate(date);
										setSelectedTime("");
									}}
									type='button'
									variant={selectedDate === date ? "default" : "outline"}
								>
									{formatDate(date)}
								</Button>
							))}
						</div>
					</div>

					<div className='space-y-2'>
						<Label className='flex items-center gap-1.5'>
							<Clock className='h-3.5 w-3.5' />
							Time
						</Label>
						<div className='grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6'>
							{availableSlots.map(slot => (
								<Button
									className={cn(
										"font-mono text-sm",
										!slot.available && "cursor-not-allowed opacity-50"
									)}
									disabled={!slot.available}
									key={slot.time}
									onClick={() => setSelectedTime(slot.time)}
									type='button'
									variant={selectedTime === slot.time ? "default" : "outline"}
								>
									{slot.time}
								</Button>
							))}
						</div>
					</div>

					<div className='space-y-2'>
						<Label>Reason for Visit</Label>
						<Select
							onValueChange={setReason}
							value={reason}
						>
							<SelectTrigger>
								<SelectValue placeholder='Select a reason' />
							</SelectTrigger>
							<SelectContent>
								{VISIT_REASONS.map(r => (
									<SelectItem
										key={r.value}
										value={r.value}
									>
										{r.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label>Additional Notes (Optional)</Label>
						<Textarea
							onChange={e => setNotes(e.target.value)}
							placeholder='Any symptoms, concerns, or special instructions...'
							rows={3}
							value={notes}
						/>
					</div>

					<div className='flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
						{onCancel && (
							<Button
								disabled={isSubmitting}
								onClick={onCancel}
								type='button'
								variant='outline'
							>
								Cancel
							</Button>
						)}
						<Button
							disabled={!isFormValid || isSubmitting}
							type='submit'
						>
							{isSubmitting ? "Booking..." : "Confirm Appointment"}
						</Button>
					</div>

					{children}
				</form>
			</CardContent>
		</Card>
	);
}
