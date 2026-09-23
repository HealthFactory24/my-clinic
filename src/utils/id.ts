const prefixes = {
	user: "USR",
	patient: "PAT",
	record: "REC",
	lab: "LAB",
	immunization: "IMM",
	encounter: "ENC",
	doctor: "DOC",
	rx: "RX",
	growth: "GRP",
	vital: "VIT",
	condition: "CON",
	allergy: "ALG",
	guardian: "GRD",
	clinic: "CLN",
	staff: "STF",
	audit: "AUD",
	appointment: "APT"
} as const;

type Prefix = keyof typeof prefixes;

type GenerateIdOptions = {
	separator?: string;
};

export function createId(
	prefixOrOptions?: Prefix | GenerateIdOptions,
	inputOptions: GenerateIdOptions = {}
): string {
	const isOptions =
		typeof prefixOrOptions === "object" && prefixOrOptions !== null;
	const finalOptions = isOptions ? prefixOrOptions : inputOptions;
	const prefix = isOptions ? undefined : prefixOrOptions;
	const { separator = "_" } = finalOptions;
	const id = crypto.randomUUID();

	return prefix ? `${prefixes[prefix]}${separator}${id}` : id;
}
