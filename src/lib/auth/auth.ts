import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
// oxlint-disable-next-line import/no-unassigned-import
import "@tanstack/react-start/server-only";
import { APIError, betterAuth } from "better-auth";
import {
	admin,
	customSession,
	genericOAuth,
	magicLink,
	openAPI,
	organization,
	twoFactor
} from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import {
	getCachedRole,
	setCachedRole,
	sweepRoleCache
} from "#/lib/auth/role-cache.ts";
import { ac, roles } from "#/lib/auth/roles.ts";
import { db, eq } from "#/lib/db/index.ts";
import * as schema from "#/lib/db/schema/index.ts";
import { createId } from "#/utils/id.ts";

import { env } from "../../env/server";
export const oidcConfigured = !!(
	process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET
);

async function sendPasswordResetEmail(email: string, url: string) {
	// In production this should call your email service, not log to stdout.
	console.info({
		msg: "Password reset email dispatched",
		// Email is redacted by pino's redact config; included here only so the
		// field name appears in structured logs for downstream filtering.
		email
		// Deliberately omit `url` — it carries a single-use reset token.
	});

	if (env.NODE_ENV !== "production") {
		// Dev-only: print the URL to the terminal so developers can test the flow.
		// Guarded so this line is dead code in production builds.
		console.debug({
			msg: "Dev-mode reset URL available",
			urlLength: url.length
		});
	}
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const auth = betterAuth({
	baseURL: env.VITE_BASE_URL,
	secret: env.BETTER_AUTH_SECRET,

	telemetry: {
		enabled: false
	},
	database: drizzleAdapter(db, {
		provider: "pg",
		schema
	}),
	rateLimit: {
		storage: "database",
		modelName: "rateLimit"
	},

	// https://better-auth.com/docs/integrations/tanstack#usage-tips
	plugins: [
		admin({
			ac,
			roles,
			adminRoles: ["admin"]
		}),
		openAPI({
			theme: "deepSpace"
		}),
		twoFactor(),

		customSession(async ({ user, session }) => {
			sweepRoleCache();

			let dbUser = getCachedRole(user.id);

			if (!dbUser) {
				const result = await db
					.select({ role: schema.user.role, clinicId: schema.user.clinicId })
					.from(schema.user)
					.where(eq(schema.user.id, user.id))
					.limit(1);

				const [row] = result;

				if (row) {
					dbUser = {
						role: row.role ?? "doctor",
						clinicId: row.clinicId ?? null
					};
					setCachedRole(user.id, dbUser.role, dbUser.clinicId);
				}
			}

			const role = dbUser?.role ?? "patient";

			return {
				user: {
					...user,
					role,
					clinicId: dbUser?.clinicId ?? null
				},
				session
			};
		}),
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				// TODO: Replace with a real email delivery call.
				// The URL carries a single-use auth token — never log the full value.
				console.info({
					msg: "Magic link dispatched",
					// `email` is redacted to [REDACTED] by pino's redact config.
					email
					// Omit `url` entirely — it is a bearer credential.
				});

				if (process.env.NODE_ENV !== "production") {
					// Dev-only: surface URL length as a sanity check without leaking the token.
					console.debug({
						msg: "Dev-mode magic link available",
						urlLength: url.length
					});
				}
			}
		}),
		organization({
			ac,
			roles,
			dynamicAccessControl: {
				enabled: true
			}
		}),
		tanstackStartCookies(),
		...(oidcConfigured
			? [
					genericOAuth({
						config: [
							{
								providerId: "oidc",
								clientId: env.OIDC_CLIENT_ID as string,
								clientSecret: env.OIDC_CLIENT_SECRET as string,
								scopes: ["openid", "profile", "email"],
								...(env.OIDC_PROVIDER_URL
									? {
											discoveryUrl: `${env.OIDC_PROVIDER_URL}/.well-known/openid-configuration`
										}
									: {
											authorizationUrl: env.OIDC_AUTHORIZATION_URL as string,
											tokenUrl: env.OIDC_TOKEN_URL as string,
											userinfoUrl: env.OIDC_USERINFO_URL as string
										})
							}
						]
					})
				]
			: [])
	],

	// https://better-auth.com/docs/concepts/session-management#session-caching
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		storeSessionInDatabase: true,
		cookieCache: {
			enabled: true,
			maxAge: 60
		}
	},
	account: {
		encryptOAuthTokens: true,
		accountLinking: {
			enabled: true
		}
	},

	// https://better-auth.com/docs/concepts/oauth
	socialProviders: {
		github: {
			clientId: env.GITHUB_CLIENT_ID as string,
			clientSecret: env.GITHUB_CLIENT_SECRET as string
		},
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
		}
	},

	advanced: {
		database: {
			joins: true,
			generateId: () => createId(),
			defaultFindManyLimit: 50
		},
		useSecureCookies: process.env.NODE_ENV === "production",
		cookiePrefix: "auth",
		crossSubDomainCookies: {
			enabled: true,
			domain:
				process.env.NODE_ENV === "production" ? ".clinic.com" : "localhost"
		}
	},
	logger: {
		level: process.env.NODE_ENV === "production" ? "error" : "info",
		disabled: false
	},
	user: {
		additionalFields: {
			role: {
				type: ["doctor", "staff", "patient", "admin"],
				required: false,
				input: false
			},
			clinicId: {
				type: "string",
				required: false,
				input: false
			},
			apiKey: { type: "string", required: false, input: false },
			address: { type: "string", required: false, input: true },
			phone: { type: "string", required: false, input: true }
		},
		deleteUser: {
			enabled: true,
			beforeDelete: async user => {
				const result = await db
					.select({ role: schema.user.role })
					.from(schema.user)
					.where(eq(schema.user.id, user.id))
					.limit(1);
				const [fullUser] = result;

				if (fullUser?.role?.toLowerCase() === "doctor") {
					const patientCount = await db
						.select({ count: schema.patients.id })
						.from(schema.patients)
						.where(eq(schema.patients.userId, user.id))
						.limit(1);

					if (patientCount.length > 0) {
						throw new APIError("BAD_REQUEST", {
							message: "Doctor has active patients and cannot be deleted"
						});
					}
				}
			}
		},
		changeEmail: {
			enabled: true
		}
	},
	updateUser: {
		enabled: true
	},
	databaseHooks: {
		user: {
			create: {
				before: async user => {
					const email = user.email?.trim().toLowerCase();
					if (!(email && EMAIL_REGEX.test(email))) {
						throw new APIError("BAD_REQUEST", {
							message: "Invalid email format"
						});
					}
					return {
						data: {
							...user,
							email,
							name: user.name?.trim() || "Unnamed User",
							role: "patient",
							isAdmin: false
						}
					};
				}
			}
		}
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		minPasswordLength: 8,
		resetPassword: {
			enabled: true,
			expiresIn: 60 * 60
		}
	},
	email: {
		from: "Pediatric Care <noreply@pediatriccare.com>",
		sendResetPassword: async ({
			email,
			url
		}: {
			email: string;
			url: string;
			_token: string;
		}) => {
			await sendPasswordResetEmail(email, url);
		}
	}
});

export type AuthInstance = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = (typeof auth.$Infer.Session)["user"];
export type UserId = (typeof auth.$Infer.Session)["user"]["id"];
