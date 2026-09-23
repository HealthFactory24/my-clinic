/**
 * Format a total-months value into a compact, pediatric-friendly age label.
 *
 * Rules:
 *   - Under 1 month       → "3d" (days, when < 1 month and days provided)
 *   - Under 12 months     → "5m" (months, no decimals)
 *   - Under 24 months     → "18m" (months, no decimals)
 *   - 24 months and over  → "3y", "3y 6m" (years + months when nonzero)
 *
 * The output is intentionally terse — these labels appear inside table
 * cells, chart tooltips, and status badges where horizontal space is tight.
 */
export function formatPediatricAge(totalMonths: number, days?: number): string {
	if (!Number.isFinite(totalMonths) || totalMonths < 0) {
		return "—";
	}

	// Under 1 month: prefer days if provided, otherwise round to whole months.
	if (totalMonths < 1) {
		if (typeof days === "number" && Number.isFinite(days) && days >= 0) {
			return `${Math.round(days)}d`;
		}
		return `${Math.round(totalMonths)}m`;
	}

	// Under 24 months: months only.
	if (totalMonths < 24) {
		return `${Math.round(totalMonths)}m`;
	}

	// 24 months and over: years + optional months.
	const years = Math.floor(totalMonths / 12);
	const months = Math.round(totalMonths - years * 12);

	// Roll over to the next year when months rounds up to 12.
	if (months === 12) {
		return `${years + 1}y`;
	}

	return months === 0 ? `${years}y` : `${years}y ${months}m`;
}

/**
 * Format a compact count of pediatric records (e.g. "1.2k patients").
 *
 * Same shape as the original `formatGitHubStars` — kept as a separate
 * helper so a future change to one (e.g. adding a "+" suffix for
 * approximate counts) doesn't accidentally affect the other.
 */
export function formatCount(count: number): string {
	if (!Number.isFinite(count) || count < 0) {
		return "0";
	}

	if (count < 1000) {
		return count.toLocaleString("en-US");
	}

	const compactValue = count / 1000;
	const roundedValue =
		compactValue >= 10
			? Math.round(compactValue)
			: Math.round(compactValue * 10) / 10;

	return `${roundedValue.toLocaleString("en-US", {
		maximumFractionDigits: compactValue >= 10 ? 0 : 1,
		minimumFractionDigits: 0
	})}k`;
}
