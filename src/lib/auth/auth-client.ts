// src/lib/auth/auth-client.ts
import {
	adminClient,
	customSessionClient,
	emailOTPClient,
	inferAdditionalFields,
	lastLoginMethodClient,
	magicLinkClient,
	organizationClient,
	twoFactorClient
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "../../env/client";
import type { auth } from "./auth";
import { ac, roles } from "./roles";

export const authClient = createAuthClient({
	baseURL: env.VITE_BASE_URL,

	plugins: [
		magicLinkClient(),
		customSessionClient<typeof auth>(),
		adminClient({ ac, roles }),
		organizationClient({
			ac,
			roles,
			dynamicAccessControl: { enabled: true }
		}),
		emailOTPClient(),
		twoFactorClient(),
		lastLoginMethodClient(),
		inferAdditionalFields<typeof auth>()
	]
});

export const { useSession, signIn, signUp, signOut } = authClient;

export type AuthSession = Awaited<ReturnType<typeof authClient.getSession>>;
export type AuthUser = NonNullable<AuthSession["data"]>["user"];
export type Role = AuthUser["role"];
36;
