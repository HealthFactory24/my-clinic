export { cn } from "cn";

export const firstElement = <DataType>(array: Array<DataType>) =>
	array[0] ?? null;

export const handleErrorWithNull = async <DataType>(
	callback: () => Promise<DataType>
) => {
	try {
		const value = await callback();

		return value;
	} catch {
		return null;
	}
};

export const handleErrorWithArray = async <DataType>(
	callback: () => Promise<Array<DataType>>
) => {
	try {
		const value = await callback();

		return value;
	} catch {
		return [] as Array<DataType>;
	}
};

export function omitMetadata<T extends { metadata?: unknown }>(value: T) {
	const { metadata: _metadata, ...rest } = value;
	return rest;
}

export function formatBytes(bytes: number) {
	if (bytes === 0) {
		return "0 B";
	}
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

const PARSE_BYTES_REGEX = /^(\d+(?:\.\d+)?)\s*([a-z]+)?$/;

export function parseBytes(input: string): number | null {
	const units: Record<string, number> = {
		b: 1,
		kb: 1024,
		mb: 1024 ** 2,
		gb: 1024 ** 3,
		tb: 1024 ** 4
	};
	const match = input.toLowerCase().match(PARSE_BYTES_REGEX);
	if (!match) {
		return null;
	}
	const value = Number.parseFloat(match[1] ?? "");
	const unit = match[2] || "b";
	if (!units[unit]) {
		return null;
	}
	return Math.floor(value * units[unit]);
}

export function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`;
	}
	const s = 1000;
	const m = s * 60;
	const h = m * 60;
	const d = h * 24;

	if (ms >= d) {
		return `${Number.parseFloat((ms / d).toFixed(2))}d`;
	}
	if (ms >= h) {
		return `${Number.parseFloat((ms / h).toFixed(2))}h`;
	}
	if (ms >= m) {
		return `${Number.parseFloat((ms / m).toFixed(2))}m`;
	}
	return `${Number.parseFloat((ms / s).toFixed(2))}s`;
}

const PARSE_DURATION_REGEX = /^(\d+(?:\.\d+)?)\s*([a-z]+)?$/;

export function parseDuration(input: string): number | null {
	const units: Record<string, number> = {
		ms: 1,
		s: 1000,
		m: 1000 * 60,
		h: 1000 * 60 * 60,
		d: 1000 * 60 * 60 * 24
	};
	const match = input.toLowerCase().match(PARSE_DURATION_REGEX);
	if (!match) {
		return null;
	}
	const value = Number.parseFloat(match[1] ?? "");
	const unit = match[2] || "ms";
	if (!units[unit]) {
		return null;
	}
	return Math.floor(value * units[unit]);
}

const NORMALIZE_REGEX_1 = /[^a-z0-9\s]/g;
const NORMALIZE_REGEX_2 = /\s+/g;

export function normalize(s: string) {
	return String(s)
		.toLowerCase()
		.replace(NORMALIZE_REGEX_1, " ")
		.replace(NORMALIZE_REGEX_2, " ")
		.trim();
}

const STATUS_REGEX = /response code:\s*(\d+)/i;
const MESSAGE_REGEX = /response text:\s*(.*?)(?:,|\s*request id|$)/i;

export function extractError(err: string): {
	status_code: number | null;
	message: string;
} {
	const statusMatch = err.match(STATUS_REGEX);
	const messageMatch = err.match(MESSAGE_REGEX);

	return {
		status_code: statusMatch ? Number(statusMatch[1]) : null,
		message:
			messageMatch?.[1] ?? "An unknown error occurred. Please try again later."
	};
}

const SNAKE_REGEX = /_([a-z])/g;
export const snakeToCamel = (str: string): string =>
	str.replace(SNAKE_REGEX, (_, g1) => g1?.toUpperCase() ?? "");

const CAMEL_REGEX = /[A-Z]/g;
export const camelToSnake = (str: string): string =>
	str.replace(CAMEL_REGEX, letter => `_${letter.toLowerCase()}`);

const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_LENGTH = 6;
const MAX_SLUG_RETRIES = 10;

export function generateSlug(): string {
	let result = "";
	const randomValues = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH));
	for (let i = 0; i < SLUG_LENGTH; i) {
		result += SLUG_CHARS[(randomValues[i] ?? 0) % SLUG_CHARS.length];
	}
	return result;
}

export async function generateUniqueSlug(
	checkExists: (slug: string) => boolean | Promise<boolean>
): Promise<string> {
	for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt += 1) {
		const slug = generateSlug();
		const exists = await checkExists(slug);
		if (!exists) {
			return slug;
		}
	}
	throw new Error("Failed to generate unique slug after maximum retries");
}

export function ring(color = "ring-primary") {
	return `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${color}`;
}

// const WHITESPACE_REGEX = /\s+/;
export function getInitials(firstName: string, lastName: string): string {
	return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

// export function getInitials(name: string): string {
// 	const parts = name.trim().split(WHITESPACE_REGEX);

// 	if (parts.length === 0 || parts[0] === "") {
// 		return "";
// 	}

// 	if (parts.length === 1) {
// 		return parts[0]?.slice(0, 2)?.toUpperCase() ?? "";
// 	}

// 	const firstInitial = parts[0]?.[0] ?? "";
// 	const lastInitial = parts.at(-1)?.[0] ?? "";

// 	return (firstInitial + lastInitial).toUpperCase();
// }

export function formatDate(
	date: Date | string | number,
	opts: Intl.DateTimeFormatOptions = {}
) {
	return new Intl.DateTimeFormat("en-US", {
		month: opts.month ?? "long",
		day: opts.day ?? "numeric",
		year: opts.year ?? "numeric",
		...opts
	}).format(new Date(date));
}

const SENTENCE_CASE_REGEX_1 = /_/g;
const SENTENCE_CASE_REGEX_2 = /([A-Z])/g;
const SENTENCE_CASE_REGEX_3 = /^\w/;
const SENTENCE_CASE_REGEX_4 = /\s+/g;

export function toSentenceCase(str: string) {
	return str
		.replace(SENTENCE_CASE_REGEX_1, " ")
		.replace(SENTENCE_CASE_REGEX_2, " $1")
		.toLowerCase()
		.replace(SENTENCE_CASE_REGEX_3, c => c.toUpperCase())
		.replace(SENTENCE_CASE_REGEX_4, " ")
		.trim();
}

export function calculateAge(dateOfBirth: string | Date): string {
	const birthDate = new Date(dateOfBirth);
	const today = new Date();
	let years = today.getFullYear() - birthDate.getFullYear();
	let months = today.getMonth() - birthDate.getMonth();

	if (months < 0) {
		years -= 1;
		months += 12;
	}

	if (years < 0) {
		return "N/A";
	}

	if (years === 0) {
		return `${months}m`;
	}
	return `${years}y ${months}m`;
}
