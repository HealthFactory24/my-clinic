// src/server/llm.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/lib/auth/middleware";
import { visitTypeSchema } from "@/lib/db/zod";
import { logger } from "@/lib/logger/server";

// ============================================================================
// Configuration
// ============================================================================

interface LLMConfig {
	baseUrl: string;
	maxTokens?: number;
	model: string;
	temperature?: number;
}

const defaultConfig: LLMConfig = {
	baseUrl: process.env.LM_STUDIO_URL || "http://localhost:1234/v1",
	model: process.env.LM_STUDIO_MODEL || "qwen-7b",
	temperature: 0.7,
	maxTokens: 2048
};

// ============================================================================
// Input Schemas
// ============================================================================

const chatMessageSchema = z.object({
	role: z.enum(["system", "user", "assistant"]),
	content: z.string()
});

const chatCompletionSchema = z.object({
	messages: z.array(chatMessageSchema),
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().min(1).max(4096).optional(),
	stream: z.boolean().optional().default(false)
});

const clinicalNoteSchema = z.object({
	patientId: z.uuid(),
	visitType: visitTypeSchema,
	symptoms: z.string().optional(),
	diagnosis: z.string().optional(),
	prescription: z.string().optional(),
	notes: z.string().optional()
});

const symptomAnalysisSchema = z.object({
	age: z.number().min(0),
	gender: z.enum(["boy", "girl"]),
	symptoms: z.string().min(1),
	duration: z.string().optional(),
	existingConditions: z.string().optional()
});

// ============================================================================
// Internal helper (NOT exported)
// ============================================================================

async function callLLM(
	messages: Array<{ role: string; content: string }>,
	options?: { temperature?: number; maxTokens?: number; stream?: boolean }
): Promise<{ content: string; usage?: unknown }> {
	try {
		const response = await fetch(`${defaultConfig.baseUrl}/chat/completions`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: defaultConfig.model,
				messages,
				temperature: options?.temperature ?? defaultConfig.temperature,
				max_tokens: options?.maxTokens ?? defaultConfig.maxTokens,
				stream: options?.stream ?? false
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`LLM API error: ${errorText}`);
		}

		if (options?.stream) {
			return { content: "", usage: undefined };
		}

		const result = await response.json();
		return {
			content: result.choices?.[0]?.message?.content || "",
			usage: result.usage
		};
	} catch (error) {
		logger.error({
			msg: "LLM call failed",
			error: error instanceof Error ? error.message : String(error)
		});
		throw new Error(
			error instanceof Error ? error.message : "LLM service error",
			{ cause: error }
		);
	}
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Generate a chat completion using local LLM.
 */
export const $llmChat = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(chatCompletionSchema)
	.handler(async ({ data, context }) => {
		const result = await callLLM(data.messages, {
			temperature: data.temperature,
			maxTokens: data.maxTokens,
			stream: data.stream
		});

		logger.debug({
			msg: "Chat completion generated",
			userId: context.user.id,
			messageCount: data.messages.length,
			stream: data.stream
		});

		return {
			content: result.content,
			usage: result.usage ? JSON.parse(JSON.stringify(result.usage)) : undefined
		};
	});
/**
 * Generate a clinical note from visit data.
 */
export const $generateClinicalNote = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(clinicalNoteSchema)
	.handler(async ({ data, context }) => {
		const systemPrompt = `You are an expert pediatric clinical assistant and lactation consultant. Generate a thorough, professional SOAP (Subjective, Objective, Assessment, Plan) clinical note based on the visit information provided. Use precise pediatric and neonatal medical terminology, be concise, and organize the note clearly.

Format the output as:
1. **Subjective**: Patient-reported symptoms, feeding history (breastfeeding/formula), and maternal/family concerns
2. **Objective**: Clinical examination findings, measurements, and vitals (infer standard metrics where appropriate)
3. **Assessment**: Pediatric diagnosis or differential diagnosis
4. **Plan**: Treatment plan, nutritional recommendations, vaccination schedule, follow-up, or referrals`;

		const userPrompt = `Patient ID: ${data.patientId}
Visit Type: ${data.visitType}
${data.symptoms ? `Symptoms: ${data.symptoms}` : ""}
${data.diagnosis ? `Diagnosis: ${data.diagnosis}` : ""}
${data.prescription ? `Prescription: ${data.prescription}` : ""}
${data.notes ? `Additional Notes: ${data.notes}` : ""}

Please generate a complete SOAP note based on this information.`;

		const result = await callLLM(
			[
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt }
			],
			{ temperature: 0.3, maxTokens: 2048 }
		);

		logger.info({
			msg: "Clinical note generated",
			patientId: data.patientId,
			visitType: data.visitType,
			userId: context.user.id
		});

		return { note: result.content };
	});

/**
 * Analyze patient symptoms for preliminary assessment.
 */
export const $analyzeSymptoms = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(symptomAnalysisSchema)
	.handler(async ({ data, context }) => {
		const systemPrompt = `You are a pediatric symptom checker. Analyze the following symptoms and provide:
1. Possible conditions (ranked by likelihood)
2. Severity assessment (low/medium/high)
3. Urgency recommendation (routine, soon, emergency)
4. Questions for the doctor to consider

Important: You are NOT diagnosing. You are helping the doctor prepare for the visit. Always recommend consulting a healthcare professional.`;

		const userPrompt = `Age: ${data.age} months
Gender: ${data.gender === "boy" ? "Male" : "Female"}
${data.duration ? `Duration: ${data.duration}` : ""}
${data.existingConditions ? `Existing Conditions: ${data.existingConditions}` : ""}
Symptoms: ${data.symptoms}`;

		const result = await callLLM(
			[
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt }
			],
			{ temperature: 0.3, maxTokens: 1024 }
		);

		logger.info({
			msg: "Symptom analysis completed",
			age: data.age,
			gender: data.gender,
			userId: context.user.id
		});

		return { analysis: result.content };
	});
