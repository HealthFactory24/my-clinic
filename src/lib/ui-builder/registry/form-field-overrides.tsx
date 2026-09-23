// lib/ui-builder/registry/clinic-field-overrides.tsx
import { Baby, Calendar, Pill, Syringe } from "lucide-react";
import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
	AutoFormInputComponentProps,
	ComponentLayer,
	FieldConfigFunction
} from "@/components/ui/ui-builder/types";

import {
	childrenFieldOverrides,
	classNameFieldOverrides,
	FormFieldWrapper,
	VariableBindingWrapper
} from "./field-override";

// ============================================
// PEDIATRIC CLINIC FIELD OVERRIDES
// ============================================

/**
 * Patient Age Field Override
 * Shows a number input with age-appropriate hints (infant, toddler, child, teen)
 */
export const patientAgeFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "age"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field,
		fieldProps
	}: AutoFormInputComponentProps) => {
		const age = Number(field.value) || 0;
		const ageGroup =
			age <= 1 ? "Infant" : age <= 3 ? "Toddler" : age <= 12 ? "Child" : "Teen";

		return (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<div className='space-y-2'>
					<Input
						max={18}
						min={0}
						onChange={e => field.onChange(Number(e.target.value))}
						type='number'
						value={age}
						{...fieldProps}
					/>
					<div className='flex items-center gap-1'>
						<Baby className='h-3 w-3 text-muted-foreground' />
						<span className='text-muted-foreground text-xs'>
							Age Group: {ageGroup}
						</span>
					</div>
				</div>
			</FormFieldWrapper>
		);
	}
});

/**
 * Appointment Date Field Override
 */
export const appointmentDateFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "date"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field,
		fieldProps
	}: AutoFormInputComponentProps) => {
		const today = new Date().toISOString().split("T")[0];
		const dateValue = (field.value as string) || today;

		return (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<div className='space-y-2'>
					<Input
						onChange={e => field.onChange(e.target.value)}
						type='date'
						value={dateValue}
						{...fieldProps}
					/>
					<div className='flex items-center gap-1'>
						<Calendar className='h-3 w-3 text-muted-foreground' />
						<span className='text-muted-foreground text-xs'>
							{dateValue === today ? "Today" : "Scheduled date"}
						</span>
					</div>
				</div>
			</FormFieldWrapper>
		);
	}
});

/**
 * Appointment Time Field Override
 * Time picker with 15-minute intervals for appointment slots
 */
export const appointmentTimeFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "time"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field
	}: AutoFormInputComponentProps) => {
		const timeSlots: string[] = [];
		for (let hour = 8; hour <= 18; hour++) {
			for (let minute = 0; minute < 60; minute += 15) {
				timeSlots.push(
					`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
				);
			}
		}

		return (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<Select
					onValueChange={field.onChange}
					value={(field.value as string) || "10:00"}
				>
					<SelectTrigger>
						<SelectValue placeholder='Select time' />
					</SelectTrigger>
					<SelectContent className='max-h-64'>
						{timeSlots.map(time => (
							<SelectItem
								key={time}
								value={time}
							>
								{time}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormFieldWrapper>
		);
	}
});

/**
 * Medication/Dosage Field Override
 */
export const medicationFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "medication"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field,
		fieldProps
	}: AutoFormInputComponentProps) => {
		const commonMeds = [
			"Amoxicillin",
			"Ibuprofen",
			"Acetaminophen",
			"Cetirizine",
			"Albuterol",
			"Prednisolone"
		];

		return (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<div className='space-y-2'>
					<div className='flex items-center gap-2'>
						<Pill className='h-4 w-4 text-muted-foreground' />
						<Input
							onChange={e => field.onChange(e.target.value)}
							placeholder='e.g., Amoxicillin'
							value={(field.value as string) || ""}
							{...fieldProps}
						/>
					</div>
					<div className='flex flex-wrap gap-1'>
						{commonMeds.map(med => (
							<Badge
								className='cursor-pointer text-xs'
								key={med}
								onClick={() => field.onChange(med)}
								variant='outline'
							>
								{med}
							</Badge>
						))}
					</div>
				</div>
			</FormFieldWrapper>
		);
	}
});

/**
 * Vaccine Name Field Override
 */
export const vaccineNameFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "name"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field
	}: AutoFormInputComponentProps) => {
		const vaccines = [
			"Hepatitis B",
			"DTaP",
			"IPV",
			"Hib",
			"PCV13",
			"MMR",
			"Varicella",
			"Hepatitis A",
			"Influenza",
			"COVID-19",
			"Rotavirus"
		];

		return (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<div className='space-y-2'>
					<div className='flex items-center gap-2'>
						<Syringe className='h-4 w-4 text-muted-foreground' />
						<Select
							onValueChange={field.onChange}
							value={(field.value as string) || ""}
						>
							<SelectTrigger>
								<SelectValue placeholder='Select vaccine' />
							</SelectTrigger>
							<SelectContent>
								{vaccines.map(vaccine => (
									<SelectItem
										key={vaccine}
										value={vaccine}
									>
										{vaccine}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Input
						onChange={e => field.onChange(e.target.value)}
						placeholder='Or type custom vaccine name'
						value={(field.value as string) || ""}
					/>
				</div>
			</FormFieldWrapper>
		);
	}
});

/**
 * Patient Name Field Override
 */
export const patientNameFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "patientName"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field,
		fieldProps
	}: AutoFormInputComponentProps) => (
		<FormFieldWrapper
			fieldConfigItem={fieldConfigItem}
			isRequired={isRequired}
			label={label}
		>
			<Input
				onChange={e => field.onChange(e.target.value)}
				placeholder='e.g., Emma Johnson'
				value={(field.value as string) || ""}
				{...fieldProps}
			/>
		</FormFieldWrapper>
	)
});

/**
 * Phone Number Field Override
 */
export const phoneNumberFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "phoneNumber"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field
	}: AutoFormInputComponentProps) => {
		const formatPhone = (value: string) => {
			const digits = value.replace(/\D/g, "").slice(0, 10);
			if (digits.length <= 3) return digits;
			if (digits.length <= 6)
				return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
			return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
		};

		return (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<Input
					onChange={e => field.onChange(formatPhone(e.target.value))}
					placeholder='(555) 123-4567'
					type='tel'
					value={(field.value as string) || ""}
				/>
			</FormFieldWrapper>
		);
	}
});

/**
 * Allergy Severity Field Override
 */
export const allergySeverityFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "severity"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field
	}: AutoFormInputComponentProps) => {
		const severities = [
			{ value: "mild", label: "Mild", color: "bg-yellow-100 text-yellow-800" },
			{
				value: "moderate",
				label: "Moderate",
				color: "bg-orange-100 text-orange-800"
			},
			{ value: "severe", label: "Severe", color: "bg-red-100 text-red-800" },
			{
				value: "life-threatening",
				label: "Life-Threatening",
				color: "bg-red-200 text-red-900"
			}
		];

		const current = severities.find(s => s.value === field.value);

		return (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<Select
					onValueChange={field.onChange}
					value={(field.value as string) || "mild"}
				>
					<SelectTrigger>
						<SelectValue>
							{current && (
								<Badge className={current.color}>{current.label}</Badge>
							)}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{severities.map(severity => (
							<SelectItem
								key={severity.value}
								value={severity.value}
							>
								<Badge className={severity.color}>{severity.label}</Badge>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormFieldWrapper>
		);
	}
});

/**
 * Rating Field Override
 */
export const ratingFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "rating"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field
	}: AutoFormInputComponentProps) => (
		<FormFieldWrapper
			fieldConfigItem={fieldConfigItem}
			isRequired={isRequired}
			label={label}
		>
			<div className='flex items-center gap-1'>
				{[1, 2, 3, 4, 5].map(star => (
					<button
						className='text-2xl transition-colors'
						key={star}
						onClick={() => field.onChange(star)}
						type='button'
					>
						{star <= ((field.value as number) || 0) ? "★" : "☆"}
					</button>
				))}
				<span className='ml-2 text-muted-foreground text-sm'>
					{(field.value as number) || 0}/5
				</span>
			</div>
		</FormFieldWrapper>
	)
});

/**
 * Blood Type Field Override
 */
export const bloodTypeFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "bloodType"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field
	}: AutoFormInputComponentProps) => {
		const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

		return (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<Select
					onValueChange={field.onChange}
					value={(field.value as string) || ""}
				>
					<SelectTrigger>
						<SelectValue placeholder='Select blood type' />
					</SelectTrigger>
					<SelectContent>
						{bloodTypes.map(type => (
							<SelectItem
								key={type}
								value={type}
							>
								{type}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormFieldWrapper>
		);
	}
});

/**
 * Tags/Features Field Override
 * Factory — the propName is captured in closure, not passed as an argument,
 * because this field is used as a reusable factory.
 */
export const tagsFieldOverrides = (propName: string): FieldConfigFunction => {
	return (_layer: ComponentLayer, allowVariableBinding = true) => ({
		renderParent: allowVariableBinding
			? ({ children }: { children: React.ReactNode }) => (
					<VariableBindingWrapper propName={propName}>
						{children}
					</VariableBindingWrapper>
				)
			: undefined,

		fieldType: ({
			label,
			isRequired,
			fieldConfigItem,
			field
		}: AutoFormInputComponentProps) => {
			const currentTags = Array.isArray(field.value)
				? (field.value as string[])
				: [];

			return (
				<FormFieldWrapper
					fieldConfigItem={fieldConfigItem}
					isRequired={isRequired}
					label={label}
				>
					<div className='space-y-2'>
						<div className='flex flex-wrap gap-1'>
							{currentTags.map((tag, index) => (
								<Badge
									className='cursor-pointer gap-1'
									key={index}
									variant='secondary'
								>
									{tag}
									<button
										className='ml-1 hover:text-destructive'
										onClick={() =>
											field.onChange(currentTags.filter((_, i) => i !== index))
										}
										type='button'
									>
										×
									</button>
								</Badge>
							))}
						</div>
						<Input
							onKeyDown={e => {
								if (e.key === "Enter" && e.currentTarget.value.trim()) {
									e.preventDefault();
									field.onChange([
										...currentTags,
										e.currentTarget.value.trim()
									]);
									e.currentTarget.value = "";
								}
							}}
							placeholder='Type and press Enter to add'
						/>
					</div>
				</FormFieldWrapper>
			);
		}
	});
};

/**
 * Notes/Description Field Override
 */
export const notesFieldOverrides = (
	_layer: ComponentLayer,
	allowVariableBinding = true,
	propName = "notes"
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,

	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field,
		fieldProps
	}: AutoFormInputComponentProps) => (
		<FormFieldWrapper
			fieldConfigItem={fieldConfigItem}
			isRequired={isRequired}
			label={label}
		>
			<Textarea
				className='min-h-[100px]'
				onChange={e => field.onChange(e.target.value)}
				placeholder='Enter clinical notes...'
				value={(field.value as string) || ""}
				{...fieldProps}
			/>
		</FormFieldWrapper>
	)
});

/**
 * Enum Select Field Override (Generic factory)
 */
export const createEnumFieldOverrides = (
	options: { value: string; label: string; color?: string }[],
	propName: string
): FieldConfigFunction => {
	return (_layer: ComponentLayer, allowVariableBinding = true) => ({
		renderParent: allowVariableBinding
			? ({ children }: { children: React.ReactNode }) => (
					<VariableBindingWrapper propName={propName}>
						{children}
					</VariableBindingWrapper>
				)
			: undefined,

		fieldType: ({
			label,
			isRequired,
			fieldConfigItem,
			field
		}: AutoFormInputComponentProps) => (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<Select
					onValueChange={field.onChange}
					value={(field.value as string) || ""}
				>
					<SelectTrigger>
						<SelectValue placeholder={`Select ${propName}`} />
					</SelectTrigger>
					<SelectContent>
						{options.map(option => (
							<SelectItem
								key={option.value}
								value={option.value}
							>
								{option.color ? (
									<Badge className={option.color}>{option.label}</Badge>
								) : (
									option.label
								)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormFieldWrapper>
		)
	});
};

// ============================================
// CLINIC-SPECIFIC COMBINED OVERRIDES
// ============================================

export const patientCardFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	patientName: (layer: ComponentLayer) =>
		patientNameFieldOverrides(layer, allowBinding, "patientName"),
	age: (layer: ComponentLayer) =>
		patientAgeFieldOverrides(layer, allowBinding, "age"),
	bloodType: (layer: ComponentLayer) =>
		bloodTypeFieldOverrides(layer, allowBinding, "bloodType"),
	notes: (layer: ComponentLayer) =>
		notesFieldOverrides(layer, allowBinding, "notes")
});

export const appointmentSlotFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	date: (layer: ComponentLayer) =>
		appointmentDateFieldOverrides(layer, allowBinding, "date"),
	time: (layer: ComponentLayer) =>
		appointmentTimeFieldOverrides(layer, allowBinding, "time"),
	endTime: (layer: ComponentLayer) =>
		appointmentTimeFieldOverrides(layer, allowBinding, "endTime")
});

export const prescriptionCardFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	medication: (layer: ComponentLayer) =>
		medicationFieldOverrides(layer, allowBinding, "medication"),
	notes: (layer: ComponentLayer) =>
		notesFieldOverrides(layer, allowBinding, "notes")
});

export const vaccinationScheduleFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	name: (layer: ComponentLayer) =>
		vaccineNameFieldOverrides(layer, allowBinding, "name")
});

export const allergyAlertFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	severity: (layer: ComponentLayer) =>
		allergySeverityFieldOverrides(layer, allowBinding, "severity")
});

export const testimonialCardFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	rating: (layer: ComponentLayer) =>
		ratingFieldOverrides(layer, allowBinding, "rating")
});

export const serviceCardFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	features: tagsFieldOverrides("features")
});

export const doctorTeamGridFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding)
});

export const openingHoursCardFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding)
});

export const insuranceInfoCardFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	providers: tagsFieldOverrides("providers"),
	contactNumber: (layer: ComponentLayer) =>
		phoneNumberFieldOverrides(layer, allowBinding, "contactNumber")
});

export const faqAccordionFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding)
});

export const pediatricianBioFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	bio: (layer: ComponentLayer) =>
		notesFieldOverrides(layer, allowBinding, "bio")
});

export const patientIntakeFormFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding)
});

export const appointmentBookingFormFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	availableDoctors: tagsFieldOverrides("availableDoctors")
});

export const appointmentReminderFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	appointmentDate: (layer: ComponentLayer) =>
		appointmentDateFieldOverrides(layer, allowBinding, "appointmentDate"),
	appointmentTime: (layer: ComponentLayer) =>
		appointmentTimeFieldOverrides(layer, allowBinding, "appointmentTime")
});

export const growthChartCardFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	patientName: (layer: ComponentLayer) =>
		patientNameFieldOverrides(layer, allowBinding, "patientName")
});

export const ageMilestoneTrackerFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding)
});

export const feedingGuideCardFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding)
});

export const clinicStatsGridFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding)
});

export const emergencyBannerFieldOverrides = (allowBinding = true) => ({
	className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
	children: (layer: ComponentLayer) =>
		childrenFieldOverrides(layer, allowBinding),
	phoneNumber: (layer: ComponentLayer) =>
		phoneNumberFieldOverrides(layer, allowBinding, "phoneNumber")
});
