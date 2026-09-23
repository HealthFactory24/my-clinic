import { z } from "better-auth";

export const clinicFormSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(2, "Clinic name must be at least 2 characters"),
	address: z.string().optional(),
	phone: z.string().optional(),
	email: z.email("Invalid email address").optional(),
	website: z.url("Invalid URL").optional(),
	logo: z.string().optional(),
	timezone: z.string().default("UTC"),
	currency: z.string().default("USD"),
	active: z.boolean().default(true),
	settings: z.record(z.string(), z.unknown()).default({}),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

export type ClinicFormValues = z.infer<typeof clinicFormSchema>;
const auditLogFormSchema = z.object({
	id: z.string().optional(),
	timestamp: z.string().optional(),
	staffId: z.string(),
	staffName: z.string(),
	action: z.enum([
		"CREATE",
		"UPDATE",
		"DELETE",
		"VIEW",
		"EXPORT",
		"LOGIN",
		"RESTORE"
	]),
	entity: z.enum([
		"PATIENT",
		"ENCOUNTER",
		"IMMUNIZATION",
		"PRESCRIPTION",
		"LAB",
		"DATABASE"
	]),
	entityId: z.string().optional(),
	details: z.string().min(1, "Details are required"),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
	sessionId: z.string().optional(),
	beforeState: z.record(z.string(), z.unknown()).optional(),
	afterState: z.record(z.string(), z.unknown()).optional()
});
export type AuditLogFormValues = z.infer<typeof auditLogFormSchema>;
