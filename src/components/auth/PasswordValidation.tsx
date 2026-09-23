// src/components/auth/PasswordValidation.tsx

export interface PasswordValidationResult {
	isValid: boolean;
	message?: string | undefined;
	criteria: {
		length: boolean;
		uppercase: boolean;
		lowercase: boolean;
		number: boolean;
		special: boolean;
	};
}

export function validatePassword(password: string): PasswordValidationResult {
	const criteria = {
		length: password.length >= 8,
		uppercase: /[A-Z]/.test(password),
		lowercase: /[a-z]/.test(password),
		number: /\d/.test(password),
		special: /[@$!%*?&]/.test(password)
	};

	const isValid = Object.values(criteria).every(Boolean);

	let message: string | undefined;
	if (!isValid) {
		const missing = [];
		if (!criteria.length) missing.push("8 characters");
		if (!criteria.uppercase) missing.push("uppercase letter");
		if (!criteria.lowercase) missing.push("lowercase letter");
		if (!criteria.number) missing.push("number");
		if (!criteria.special) missing.push("special character (@$!%*?&)");

		message = `Password must contain: ${missing.join(", ")}`;
	}

	return { isValid, message, criteria };
}

export function getPasswordStrength(password: string): {
	score: number;
	label: string;
	color: string;
} {
	const { criteria } = validatePassword(password);
	const score = Object.values(criteria).filter(Boolean).length;

	const levels: Array<{ label: string; color: string }> = [
		{ label: "Too weak", color: "text-red-500" },
		{ label: "Weak", color: "text-orange-500" },
		{ label: "Fair", color: "text-yellow-500" },
		{ label: "Good", color: "text-blue-500" },
		{ label: "Strong", color: "text-emerald-500" }
	];

	const matchedLevel = levels[Math.min(score, 4)] ?? levels[0];

	return {
		score,
		label: matchedLevel?.label ?? "",
		color: matchedLevel?.color ?? "text-muted-foreground"
	};
}

export function getPasswordValidation(password: string): {
	isValid: boolean;
	message: string;
} {
	const result = validatePassword(password);
	return {
		isValid: result.isValid,
		message: result.message ?? ""
	};
}
