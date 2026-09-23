import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.url(),
		VITE_BASE_URL: z.url().default("http://localhost:3000"),
		BETTER_AUTH_SECRET: z.string().min(1),
		EMBEDDING_PROVIDER: z.enum(["lmstudio", "openai", "none"]).default("none"),
		EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(1536),

		LM_STUDIO_BASE_URL: z.url().default("http://localhost:1234/v1"),
		LM_STUDIO_EMBEDDING_MODEL: z.string().default("nomic-embed-text-v1.5"),

		OPENAI_API_KEY: z.string().optional(),
		OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		OIDC_CLIENT_ID: z.string().optional(),
		OIDC_CLIENT_SECRET: z.string().optional(),
		OIDC_PROVIDER_URL: z.string().optional(),
		OIDC_AUTHORIZATION_URL: z.string().optional(),
		OIDC_TOKEN_URL: z.string().optional(),
		OIDC_USERINFO_URL: z.string().optional(),
		// OAuth2 providers, optional, update as needed
		GITHUB_CLIENT_ID: z.string().optional(),
		GITHUB_CLIENT_SECRET: z.string().optional(),
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional()
	},
	runtimeEnv: process.env
});
