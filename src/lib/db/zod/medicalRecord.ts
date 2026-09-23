import { z } from "better-auth";

const medicalRecordFormSchema = z.object({
	id: z.string().optional(),
	patientId: z.string(),
	encounterId: z.string().optional().nullable(),
	uploadedBy: z.string(),
	recordType: z.enum([
		"Lab Report",
		"Imaging",
		"Referral",
		"Discharge Summary",
		"Consent Form",
		"Insurance",
		"Operative Report",
		"Pathology",
		"External Record",
		"Other"
	]),
	title: z.string().min(2, "Title must be at least 2 characters"),
	description: z.string().optional(),
	fileUrl: z.url("Invalid file URL"),
	fileName: z.string().min(1, "File name is required"),
	fileMimeType: z.string().min(1, "File type is required"),
	fileSizeBytes: z.number().int().positive().optional(),
	externalId: z.string().optional(),
	externalSystem: z.string().optional(),
	documentDate: z.string().optional(),
	status: z.enum(["Active", "Archived", "Superseded"]).default("Active"),
	metadata: z.record(z.string(), z.unknown()).default({}),
	tags: z.array(z.string()).default([]),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});
export type MedicalRecordFormValues = z.infer<typeof medicalRecordFormSchema>;
