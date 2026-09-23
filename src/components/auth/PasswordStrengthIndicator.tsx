// src/components/auth/PasswordStrengthIndicator.tsx
import { memo, useMemo } from "react";

interface PasswordStrengthIndicatorProps {
	password: string;
}

interface Requirement {
	label: string;
	test: (pass: string) => boolean;
}

/**
 * Module-level constants. These are created exactly once per module load so
 * the child `<li>` list receives stable references across renders.
 */
const requirements: readonly Requirement[] = [
	{ label: "At least 8 characters", test: p => p.length >= 8 },
	{ label: "Contains uppercase letter", test: p => /[A-Z]/.test(p) },
	{ label: "Contains lowercase letter", test: p => /[a-z]/.test(p) },
	{ label: "Contains a number", test: p => /\d/.test(p) },
	{ label: "Contains a special character", test: p => /[^A-Za-z0-9]/.test(p) }
];

/** Strength bucket → label + progress-bar fill color. */
const getStrengthLabel = (count: number): { text: string; color: string } => {
	if (count === 0) return { text: "", color: "bg-muted" };
	if (count <= 2) return { text: "Weak", color: "bg-destructive" };
	if (count <= 4) return { text: "Medium", color: "bg-amber-500" };
	return { text: "Strong", color: "bg-emerald-500" };
};

/**
 * Precomputed Tailwind class strings for the numeric strength label. Using a
 * `Record` keyed on the met-requirement count (0–5, clamped to the three
 * buckets) lets the label render without a nested ternary.
 */
const STRENGTH_TEXT_CLASS: Record<0 | 1 | 2 | 3, string> = {
	0: "text-muted-foreground",
	1: "text-destructive",
	2: "text-amber-500",
	3: "text-emerald-500"
};

/** Map a `metCount` (0–5) to its bucket key (0–3). */
function getStrengthBucket(metCount: number): 0 | 1 | 2 | 3 {
	if (metCount === 0) return 0;
	if (metCount <= 2) return 1;
	if (metCount <= 4) return 2;
	return 3;
}

function PasswordStrengthIndicatorImpl({
	password
}: PasswordStrengthIndicatorProps) {
	// One regex pass: run every requirement exactly once and retain the flags.
	// `metCount` and `metFlags` are derived from the same pass, so they cannot
	// disagree.
	const { metFlags, metCount } = useMemo(() => {
		if (!password) {
			return {
				metFlags: requirements.map(() => false),
				metCount: 0
			};
		}
		const flags = requirements.map(req => req.test(password));
		return {
			metFlags: flags,
			metCount: flags.reduce((acc, met) => (met ? acc + 1 : acc), 0)
		};
	}, [password]);

	if (!password) return null;

	const strength = getStrengthLabel(metCount);
	const strengthTextClass = STRENGTH_TEXT_CLASS[getStrengthBucket(metCount)];

	return (
		<div className='mt-2 space-y-2'>
			<div className='flex items-center justify-between gap-2'>
				<div className='flex h-1.5 flex-1 gap-1 overflow-hidden rounded-full bg-muted'>
					{requirements.map((req, i) => (
						<div
							className={`h-full flex-1 transition-all duration-300 ${
								metFlags[i] ? strength.color : "bg-transparent"
							}`}
							key={req.label}
						/>
					))}
				</div>
				{strength.text && (
					<span className={`font-medium text-xs ${strengthTextClass}`}>
						{strength.text}
					</span>
				)}
			</div>

			<ul className='grid grid-cols-1 gap-1 text-muted-foreground text-xs'>
				{requirements.map((req, i) => {
					const isMet = metFlags[i];
					return (
						<li
							className={`flex items-center gap-1.5 transition-colors ${
								isMet ? "text-emerald-600 dark:text-emerald-400" : ""
							}`}
							key={req.label}
						>
							<span>{isMet ? "✓" : "○"}</span>
							<span>{req.label}</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

/**
 * Memoized so a parent form re-render (e.g. typing into an unrelated field)
 * does not re-run the five regexes. Props are compared by `password` only —
 * the default shallow comparison is sufficient.
 */
export const PasswordStrengthIndicator = memo(PasswordStrengthIndicatorImpl);
PasswordStrengthIndicator.displayName = "PasswordStrengthIndicator";
