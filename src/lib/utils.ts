export { cn } from "cn";

const firstElement = <DataType>(array: DataType[]) => {
	return array?.[0] ?? null;
};
const handleErrorWithNull = async <DataType>(
	callback: () => Promise<DataType>
) => {
	try {
		const value = await callback();

		return value;
	} catch {
		return null;
	}
};

const handleErrorWithArray = async <DataType>(
	callback: () => Promise<DataType[]>
) => {
	try {
		const value = await callback();

		return value;
	} catch {
		return [] as DataType[];
	}
};

export { firstElement, handleErrorWithArray, handleErrorWithNull };

export function omitMetadata<T extends { metadata?: unknown }>(value: T) {
	const { metadata: _metadata, ...rest } = value;
	return rest as Omit<T, "metadata">;
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

export function parseBytes(input: string): number | null {
	const units: Record<string, number> = {
		b: 1,
		kb: 1024,
		mb: 1024 ** 2,
		gb: 1024 ** 3,
		tb: 1024 ** 4
	};
	const match = input.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
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

export function parseDuration(input: string): number | null {
	const units: Record<string, number> = {
		ms: 1,
		s: 1000,
		m: 1000 * 60,
		h: 1000 * 60 * 60,
		d: 1000 * 60 * 60 * 24
	};
	const match = input.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
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

export function normalize(s: string) {
	return String(s)
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function extractError(err: string): {
	status_code: number | null;
	message: string;
} {
	const statusMatch = err.match(/response code:\s*(\d+)/i);
	const messageMatch = err.match(
		/response text:\s*(.*?)(?:,|\s*request id|$)/i
	);

	return {
		status_code: statusMatch ? Number(statusMatch[1]) : null,
		// Use optional chaining (?.) and coalescing (??) correctly
		message:
			messageMatch?.[1] || "An unknown error occurred. Please try again later."
	};
}

export const snakeToCamel = (str: string): string =>
	str.replace(/_([a-z])/g, g => g[1]?.toUpperCase() ?? "");

export const camelToSnake = (str: string): string =>
	str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_LENGTH = 6;
const MAX_SLUG_RETRIES = 10;

export function generateSlug(): string {
	let result = "";
	const randomValues = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH));
	for (let i = 0; i < SLUG_LENGTH; i++) {
		result += SLUG_CHARS[(randomValues[i] ?? 0) % SLUG_CHARS.length];
	}
	return result;
}

export async function generateUniqueSlug(
	checkExists: (slug: string) => boolean | Promise<boolean>
): Promise<string> {
	for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
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
export function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);

	// Handle empty string or just whitespace
	if (parts.length === 0 || parts[0] === "") {
		return "";
	}

	// Single word: return first two characters
	if (parts.length === 1) {
		return parts[0]?.slice(0, 2)?.toUpperCase() ?? "";
	}

	// Multiple words: First letter of first word + First letter of last word
	const firstInitial = parts[0]?.[0] ?? "";
	const lastInitial = parts.at(-1)?.[0] ?? "";

	return (firstInitial + lastInitial).toUpperCase();
}

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

export function toSentenceCase(str: string) {
	return str
		.replace(/_/g, " ")
		.replace(/([A-Z])/g, " $1")
		.toLowerCase()
		.replace(/^\w/, c => c.toUpperCase())
		.replace(/\s+/g, " ")
		.trim();
}
