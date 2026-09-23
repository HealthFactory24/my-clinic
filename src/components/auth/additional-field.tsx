"use client";

import {
	type AdditionalField as AdditionalFieldConfig,
	type AdditionalFieldValue,
	resolveInputType
} from "@better-auth-ui/core";
import { useAuth } from "@better-auth-ui/react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronDownIcon, Copy } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList
} from "@/components/ui/combobox";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type AdditionalFieldProps = {
	name: string;
	field: AdditionalFieldConfig;
	isPending?: boolean;
};

/** Convert a `defaultValue` into a `Date` for the calendar. */
function toDate(value: unknown): Date | undefined {
	if (value instanceof Date) return value;
	if (typeof value === "string") {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? undefined : parsed;
	}
	return undefined;
}

const pad = (n: number) => n.toString().padStart(2, "0");

/** Format a Date as `HH:mm:ss` for an `<input type="time">`. */
function formatTime(date: Date) {
	return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Normalize a `defaultValue` to a form-input-friendly string. `Date` values
 * become ISO strings so downstream `parseAdditionalFieldValue` gets a
 * consistent wire format.
 */
function defaultValueToString(
	value: AdditionalFieldValue | null | undefined
): string | undefined {
	if (value == null) return undefined;
	if (value instanceof Date) return value.toISOString();
	return String(value);
}

/**
 * Icon-only copy button used as an `InputGroupAddon`. `getValue` is invoked
 * lazily on click so the button copies the input's *live* value rather than
 * a stale snapshot — important when paired with editable inputs.
 */
function CopyButton({
	getValue,
	isDisabled
}: {
	getValue: () => string | undefined;
	isDisabled?: boolean;
}) {
	const { localization } = useAuth();
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		const value = getValue();
		if (!value) return;

		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	}

	return (
		<InputGroupButton
			aria-label={localization.settings.copyToClipboard}
			disabled={isDisabled}
			onClick={handleCopy}
			title={localization.settings.copyToClipboard}
			type='button'
		>
			{copied ? <Check /> : <Copy />}
		</InputGroupButton>
	);
}

/** Renders a single additional user field via shadcn primitives. */
export function AdditionalField({
	name,
	field,
	isPending
}: AdditionalFieldProps) {
	const inputType = resolveInputType(field);
	// Used by `inputType: "input"` with `copyable: true` so the copy button
	// reads the input's *live* value rather than a stale `defaultValue`.
	const inputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string>();

	const inputId = `additional-${name}`;
	const errorId = `${inputId}-error`;

	// Custom render escape hatch — validated earlier to avoid runtime crashes.
	if (field.render) {
		// Field-level `render` is expected to wire its own form control and
		// submit via the same `name`. We only surface it, not wrap it. Seed
		// `value` from `defaultValue` (as every other branch does) — there is no
		// managed state to forward into `onChange`.
		return (
			<>
				{field.render({
					name,
					field,
					isPending,
					value: field.defaultValue ?? null,
					onBlur: () => {},
					onChange: () => {}
				})}
			</>
		);
	}

	if (inputType === "hidden") {
		const hiddenValue =
			field.defaultValue == null
				? ""
				: field.defaultValue instanceof Date
					? field.defaultValue.toISOString()
					: String(field.defaultValue);

		return (
			<input
				name={name}
				readOnly
				type='hidden'
				value={hiddenValue}
			/>
		);
	}

	if (inputType === "textarea") {
		return (
			<Field data-invalid={!!error}>
				<Label htmlFor={inputId}>{field.label}</Label>

				<Textarea
					aria-describedby={error ? errorId : undefined}
					aria-invalid={!!error}
					defaultValue={defaultValueToString(field.defaultValue)}
					disabled={isPending}
					id={inputId}
					name={name}
					onChange={() => error && setError(undefined)}
					onInvalid={e => {
						e.preventDefault();
						setError((e.target as HTMLTextAreaElement).validationMessage);
					}}
					placeholder={field.placeholder}
					readOnly={field.readOnly}
					required={field.required}
				/>

				<FieldError id={errorId}>{error}</FieldError>
			</Field>
		);
	}

	if (inputType === "number") {
		const maxFractionDigits = field.formatOptions?.maximumFractionDigits;
		const numDefault =
			field.defaultValue == null
				? undefined
				: typeof field.defaultValue === "number"
					? field.defaultValue
					: String(field.defaultValue);

		return (
			<Field data-invalid={!!error}>
				<Label htmlFor={inputId}>{field.label}</Label>

				<Input
					aria-describedby={error ? errorId : undefined}
					aria-invalid={!!error}
					defaultValue={numDefault}
					disabled={isPending}
					id={inputId}
					inputMode={maxFractionDigits ? "decimal" : "numeric"}
					max={field.max}
					min={field.min}
					name={name}
					onChange={() => error && setError(undefined)}
					onInvalid={e => {
						e.preventDefault();
						setError((e.target as HTMLInputElement).validationMessage);
					}}
					placeholder={field.placeholder}
					readOnly={field.readOnly}
					required={field.required}
					step={
						field.step ??
						(maxFractionDigits ? 1 / 10 ** maxFractionDigits : undefined)
					}
					type='number'
				/>

				<FieldError id={errorId}>{error}</FieldError>
			</Field>
		);
	}

	if (inputType === "slider") {
		return (
			<SliderField
				field={field}
				isPending={isPending}
				name={name}
			/>
		);
	}

	if (inputType === "switch") {
		return (
			<Field orientation='horizontal'>
				<Switch
					defaultChecked={
						field.defaultValue === true || field.defaultValue === "true"
					}
					disabled={isPending || field.readOnly}
					id={inputId}
					name={name}
				/>

				<FieldContent>
					<FieldLabel htmlFor={inputId}>{field.label}</FieldLabel>
				</FieldContent>
			</Field>
		);
	}

	if (inputType === "checkbox") {
		return (
			<Field orientation='horizontal'>
				<Checkbox
					defaultChecked={
						field.defaultValue === true || field.defaultValue === "true"
					}
					disabled={isPending || field.readOnly}
					id={inputId}
					name={name}
					required={field.required}
				/>

				<FieldContent>
					<FieldLabel htmlFor={inputId}>{field.label}</FieldLabel>
				</FieldContent>
			</Field>
		);
	}

	if (inputType === "select") {
		return (
			<Field data-invalid={!!error}>
				<Label htmlFor={inputId}>{field.label}</Label>

				<Select
					defaultValue={
						field.defaultValue != null ? String(field.defaultValue) : undefined
					}
					disabled={isPending || field.readOnly}
					name={name}
					required={field.required}
				>
					<SelectTrigger
						aria-describedby={error ? errorId : undefined}
						aria-invalid={!!error}
						className='w-full'
						id={inputId}
					>
						<SelectValue placeholder={field.placeholder} />
					</SelectTrigger>

					<SelectContent>
						{field.options?.map(option => (
							<SelectItem
								key={option.value}
								value={option.value}
							>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<FieldError id={errorId}>{error}</FieldError>
			</Field>
		);
	}

	if (inputType === "combobox") {
		return (
			<Field data-invalid={!!error}>
				<Label htmlFor={inputId}>{field.label}</Label>

				<Combobox
					defaultValue={
						field.defaultValue != null ? String(field.defaultValue) : undefined
					}
					disabled={isPending || field.readOnly}
					items={field.options ?? []}
					name={name}
					required={field.required}
				>
					<ComboboxInput
						aria-describedby={error ? errorId : undefined}
						aria-invalid={!!error}
						id={inputId}
						placeholder={field.placeholder}
					/>

					<ComboboxContent>
						<ComboboxEmpty>No items found.</ComboboxEmpty>

						<ComboboxList>
							{option => (
								<ComboboxItem
									key={option.value}
									value={option.value}
								>
									{option.label}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>

				<FieldError id={errorId}>{error}</FieldError>
			</Field>
		);
	}

	if (inputType === "date" || inputType === "datetime") {
		return (
			<DateInput
				field={field}
				isPending={isPending}
				name={name}
			/>
		);
	}

	// inputType === "input"
	const hasPrefix = field.prefix != null;
	const hasSuffix = field.suffix != null || field.copyable;

	// When `inputType: "input"` is paired with `type: "number"`, restrict the
	// native input to numbers. `formatOptions.maximumFractionDigits` enables
	// fractional input via `step`.
	const isNumeric = field.type === "number";
	const maxFractionDigits = field.formatOptions?.maximumFractionDigits;
	const nativeInputType = isNumeric ? "number" : undefined;
	const nativeInputMode = isNumeric
		? maxFractionDigits
			? "decimal"
			: "numeric"
		: undefined;
	const nativeStep = maxFractionDigits
		? 1 / 10 ** maxFractionDigits
		: undefined;

	if (hasPrefix || hasSuffix) {
		return (
			<Field data-invalid={!!error}>
				<Label htmlFor={inputId}>{field.label}</Label>

				<InputGroup>
					{hasPrefix && (
						<InputGroupAddon align='inline-start'>
							{field.prefix}
						</InputGroupAddon>
					)}

					<InputGroupInput
						aria-describedby={error ? errorId : undefined}
						aria-invalid={!!error}
						defaultValue={defaultValueToString(field.defaultValue)}
						disabled={isPending}
						id={inputId}
						inputMode={nativeInputMode}
						name={name}
						onChange={() => error && setError(undefined)}
						onInvalid={e => {
							e.preventDefault();
							setError((e.target as HTMLInputElement).validationMessage);
						}}
						placeholder={field.placeholder}
						readOnly={field.readOnly}
						ref={inputRef}
						required={field.required}
						step={nativeStep}
						type={nativeInputType}
					/>

					{field.copyable ? (
						<InputGroupAddon align='inline-end'>
							<CopyButton
								getValue={() => inputRef.current?.value}
								isDisabled={isPending}
							/>
						</InputGroupAddon>
					) : (
						field.suffix != null && (
							<InputGroupAddon align='inline-end'>
								{field.suffix}
							</InputGroupAddon>
						)
					)}
				</InputGroup>

				<FieldError id={errorId}>{error}</FieldError>
			</Field>
		);
	}

	return (
		<Field data-invalid={!!error}>
			<Label htmlFor={inputId}>{field.label}</Label>

			<Input
				aria-describedby={error ? errorId : undefined}
				aria-invalid={!!error}
				defaultValue={defaultValueToString(field.defaultValue)}
				disabled={isPending}
				id={inputId}
				inputMode={nativeInputMode}
				name={name}
				onChange={() => error && setError(undefined)}
				onInvalid={e => {
					e.preventDefault();
					setError((e.target as HTMLInputElement).validationMessage);
				}}
				placeholder={field.placeholder}
				readOnly={field.readOnly}
				required={field.required}
				step={nativeStep}
				type={nativeInputType}
			/>

			<FieldError id={errorId}>{error}</FieldError>
		</Field>
	);
}

/**
 * Slider field. Radix Slider doesn't render the current value, so we render
 * it next to the label and control the state to keep the displayed value in
 * sync. The selected value is submitted via the underlying Radix `name` prop.
 */
function SliderField({ name, field, isPending }: AdditionalFieldProps) {
	const maxFractionDigits = field.formatOptions?.maximumFractionDigits;
	const min = field.min ?? 0;
	const max = field.max ?? 100;
	const step =
		field.step ?? (maxFractionDigits ? 1 / 10 ** maxFractionDigits : 1);

	const initial = useMemo(() => {
		if (typeof field.defaultValue === "number") return field.defaultValue;
		if (field.defaultValue != null) return Number(field.defaultValue);
		return min;
	}, [field.defaultValue, min]);

	// Track the previous `initial` in state so we can reset during render
	// when it changes (React's recommended "adjust state during render"
	// pattern — https://react.dev/reference/react/useState#storing-information-from-previous-renders).
	const [value, setValue] = useState<number>(initial);
	const [prevInitial, setPrevInitial] = useState(initial);

	if (prevInitial !== initial) {
		setPrevInitial(initial);
		if (value !== initial) setValue(initial);
	}

	const formatter = useMemo(
		() => new Intl.NumberFormat(undefined, field.formatOptions),
		[field.formatOptions]
	);
	const inputId = `additional-${name}`;

	return (
		<Field>
			<div className='flex items-center justify-between gap-2'>
				<Label htmlFor={inputId}>{field.label}</Label>
				<span className='text-muted-foreground text-sm tabular-nums'>
					{formatter.format(value)}
				</span>
			</div>

			<Slider
				disabled={isPending || field.readOnly}
				id={inputId}
				max={max}
				min={min}
				name={name}
				onValueChange={v => setValue((Array.isArray(v) ? v[0] : v) ?? min)}
				step={step}
				value={[value]}
			/>

			<FieldError />
		</Field>
	);
}

/**
 * Date / datetime input. Composes `Popover` + `Calendar` for the date and
 * (optionally) `<input type="time">` for the time. Submits the combined ISO
 * value via a hidden `<input>` so it shows up in `FormData`.
 */
function DateInput({ name, field, isPending }: AdditionalFieldProps) {
	const { localization } = useAuth();
	const inputType = resolveInputType(field);
	const isDateTime = inputType === "datetime";

	const [date, setDate] = useState<Date | undefined>(
		toDate(field.defaultValue)
	);
	const [time, setTime] = useState<string>(
		isDateTime && date ? formatTime(date) : ""
	);
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string>();

	const inputId = `additional-${name}`;
	const errorId = `${inputId}-error`;

	// Compose the hidden form value: ISO date for "date", ISO datetime for
	// "datetime" (date + time).
	const formValue = useMemo(() => {
		if (!date) return "";
		if (isDateTime && time && time.trim() !== "") {
			const [h = "0", m = "0", s = "0"] = time.split(":");
			const combined = new Date(date);
			combined.setHours(Number(h), Number(m), Number(s), 0);
			return combined.toISOString();
		}
		// Anchor to local midnight then serialize as ISO so the downstream
		// `parseAdditionalFieldValue` parses the same calendar day regardless
		// of timezone (a bare "YYYY-MM-DD" would be parsed as UTC midnight).
		const localMidnight = new Date(date);
		localMidnight.setHours(0, 0, 0, 0);
		return localMidnight.toISOString();
	}, [date, time, isDateTime]);

	return (
		<Field data-invalid={!!error}>
			<Label htmlFor={`${inputId}-date`}>{field.label}</Label>

			<div className='relative flex gap-2'>
				{/* Visually-hidden input so required constraint validation fires on
            submit. `readOnly` avoids React's controlled/uncontrolled warning;
            `tabIndex={-1}` and `aria-hidden` keep it out of the a11y tree. */}
				<input
					aria-hidden='true'
					className='pointer-events-none absolute inset-0 size-full opacity-0'
					name={name}
					onInvalid={e => {
						e.preventDefault();
						setError((e.target as HTMLInputElement).validationMessage);
					}}
					readOnly
					required={field.required}
					tabIndex={-1}
					type='text'
					value={formValue}
				/>

				<Popover
					onOpenChange={setOpen}
					open={open}
				>
					<PopoverTrigger asChild>
						<Button
							aria-describedby={error ? errorId : undefined}
							aria-invalid={!!error}
							className={cn(
								"flex-1 justify-between font-normal",
								"data-[empty=true]:text-muted-foreground"
							)}
							data-empty={!date}
							disabled={isPending || field.readOnly}
							id={`${inputId}-date`}
							type='button'
							variant='outline'
						/>

						{date ? format(date, "PPP") : <span>{field.placeholder}</span>}
						{isDateTime ? <ChevronDownIcon /> : <CalendarIcon />}
					</PopoverTrigger>

					<PopoverContent
						align='start'
						className='w-auto overflow-hidden p-0'
					>
						<Calendar
							captionLayout='dropdown'
							defaultMonth={date}
							mode='single'
							onSelect={value => {
								setDate(value);
								if (value) setError(undefined);
								if (!isDateTime) setOpen(false);
							}}
							selected={date}
						/>
					</PopoverContent>
				</Popover>

				{isDateTime && (
					<Field className='w-32'>
						<Label
							className='sr-only'
							htmlFor={`${inputId}-time`}
						>
							{localization.settings.time}
						</Label>

						<Input
							className='appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
							disabled={isPending || field.readOnly}
							id={`${inputId}-time`}
							onChange={e => setTime(e.target.value)}
							step='1'
							type='time'
							value={time}
						/>
					</Field>
				)}
			</div>

			<FieldError id={errorId}> {error};</FieldError>
		</Field>
	);
}
