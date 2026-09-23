// src/lib/auth/seed-admin.ts
//
// Seeds the first admin user, their clinic, and their staff profile.
//
// Design notes:
//   - Uses `auth.api.signUpEmail` (public, no session needed) to create the
//     user, because `auth.api.createUser` requires an admin session and we
//     don't have one yet. This is Better Auth's sanctioned bootstrap path.
//   - Role promotion is a direct UPDATE. The admin plugin's `setRole` also
//     requires an admin session, so we can't use it here. Since we're
//     literally bootstrapping the auth system, a DB write is correct.
//   - Password hashing is delegated to Better Auth via `auth.$context.password`
//     so the credential account always matches the sign-in algorithm.
//   - Every step is idempotent: re-running repairs/aligns instead of duplicating.

import console from "node:console";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { createId } from "@/utils/index";

import { auth } from "../lib/auth/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
	admin: {
		email: (process.env.SEED_ADMIN_EMAIL ?? "hazem032012@gmail.com")
			.trim()
			.toLowerCase(),
		password: (process.env.SEED_ADMIN_PASSWORD ?? "HealthF26").trim(),
		name: (process.env.SEED_ADMIN_NAME ?? "Dr. Hazem").trim(),
		address: process.env.SEED_ADMIN_ADDRESS ?? "Hurghada",
		phone: process.env.SEED_ADMIN_PHONE ?? "+1000000000",
		pin: process.env.SEED_STAFF_PIN ?? "1234"
	},
	clinic: {
		id: process.env.SEED_CLINIC_ID ?? "clinic-main",
		name: process.env.SEED_CLINIC_NAME ?? "Smart Clinic",
		address: process.env.SEED_CLINIC_ADDRESS ?? "Local",
		phone: process.env.SEED_CLINIC_PHONE ?? "+1000000000",
		email: process.env.SEED_CLINIC_EMAIL ?? "clinysmar@gmail.com",
		timezone: process.env.SEED_CLINIC_TIMEZONE ?? "Africa/Cairo",
		currency: process.env.SEED_CLINIC_CURRENCY ?? "EGP"
	}
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function validateConfig(): void {
	const errors: string[] = [];
	const { email, password, name } = CONFIG.admin;
	const { id, name: clinicName } = CONFIG.clinic;

	if (!email.includes("@"))
		errors.push("SEED_ADMIN_EMAIL must be a valid email");
	if (password.length < 8)
		errors.push("SEED_ADMIN_PASSWORD must be at least 8 characters");
	if (name.trim().length < 2)
		errors.push("SEED_ADMIN_NAME must be at least 2 characters");
	if (id.trim().length < 2)
		errors.push("SEED_CLINIC_ID must be at least 2 characters");
	if (clinicName.trim().length < 2)
		errors.push("SEED_CLINIC_NAME must be at least 2 characters");

	if (errors.length > 0) {
		throw new Error(`Seed config invalid:\n  - ${errors.join("\n  - ")}`);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Steps (each idempotent)
// ─────────────────────────────────────────────────────────────────────────────

async function ensureClinic(): Promise<string> {
	const { id, name, address, phone, email, timezone, currency } = CONFIG.clinic;

	const existing = await db.query.clinics.findFirst({ where: { id } });
	if (existing) {
		console.log(`🏥 Clinic exists: ${existing.name} (${existing.id})`);
		return existing.id;
	}

	console.log("🏥 Creating clinic...");
	const [created] = await db
		.insert(schema.clinics)
		.values({
			id,
			name,
			address,
			phone,
			email,
			active: true,
			timezone,
			currency,
			settings: {
				theme: "light",
				language: "en",
				features: {
					immunizations: true,
					growthCharts: true,
					prescriptions: true,
					labs: true
				}
			},
			createdAt: new Date(),
			updatedAt: new Date()
		})
		.returning();

	if (!created) throw new Error("Failed to create clinic");
	console.log(`✅ Clinic created: ${created.name} (${created.id})`);
	return created.id;
}

/**
 * Create the admin user via Better Auth's public `signUpEmail` endpoint.
 *
 * - `signUpEmail` is the only user-creation API that works without a prior
 *   admin session. It creates both the `user` row and the credential
 *   `account` row with the algorithm `signInEmail` will later verify against.
 * - If the user already exists we fall through to the existing-user branch.
 */
async function ensureUser(): Promise<{ userId: string; isNew: boolean }> {
	const { email, password, name } = CONFIG.admin;
	const existing = await db.query.user.findFirst({ where: { email } });
	if (existing) {
		console.log(`👤 Admin user exists: ${existing.email} (${existing.id})`);
		return { userId: existing.id, isNew: false };
	}
	console.log("👤 Creating admin user via Better Auth signUpEmail...");
	let result: unknown;
	try {
		// FIX: Use signUpEmail, NOT createUser
		result = await auth.api.signUpEmail({
			body: {
				email,
				password,
				name,
				rememberMe: true
			}
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`signUpEmail failed: ${message}`, { cause: err });
	}
	// FIX: Response structure for signUpEmail is different from createUser
	// signUpEmail returns { token?: string, user?: User }
	if (
		!isRecord(result) ||
		!isRecord(result.user) ||
		typeof result.user.id !== "string"
	) {
		throw new Error(`Unexpected signUpEmail result: ${JSON.stringify(result)}`);
	}
	const userId = result.user.id;
	console.log(`✅ Admin user created: ${email} (${userId})`);
	return { userId, isNew: true };
}
async function verifySignIn(): Promise<void> {
	const { email, password } = CONFIG.admin;

	console.log("\n🔍 Verifying credential account via signInEmail...");

	// FIX: signInEmail body structure
	const result = await auth.api.signInEmail({
		body: { email, password }
	});

	if (!isRecord(result) || !isRecord(result.user)) {
		throw new Error(`Unexpected signInEmail result: ${JSON.stringify(result)}`);
	}

	console.log("✅ Sign-in succeeded");
	console.log(`   User: ${result.user.name} (${result.user.email})`);

	// FIX: session token is on result, not result.token
	if (typeof result.token === "string") {
		await db
			.delete(schema.session)
			.where(eq(schema.session.token, result.token));
		console.log("🧹 Verification session cleaned up");
	}
}
/**
 * Promote the user to admin and mark the email verified.
 *
 * Both writes are direct DB updates because the admin plugin's `setRole`
 * and `setEmailVerified` APIs require an admin session, which we don't have
 * while bootstrapping. This is the one place where a raw UPDATE is correct.
 */
async function ensureAdminRoleAndVerification(userId: string): Promise<void> {
	const current = await db.query.user.findFirst({ where: { id: userId } });
	if (!current) throw new Error(`User ${userId} vanished mid-seed`);

	const patch: Partial<typeof schema.user.$inferInsert> = {};

	if (current.role !== "admin") {
		patch.role = "admin";
		console.log(`🔧 Promoting to admin (was: ${current.role ?? "unset"})`);
	}
	if (current.emailVerified) {
		patch.emailVerified = true;
		console.log("✅ Marking email verified");
	}

	if (Object.keys(patch).length > 0) {
		await db
			.update(schema.user)
			.set({ ...patch, updatedAt: new Date(), emailVerified: true })
			.where(eq(schema.user.id, userId));
	} else {
		console.log("✅ Role and emailVerified already correct");
	}
}

/**
 * Scope the user to the canonical clinic. `clinicId` is declared with
 * `input: false` in auth.ts, so it can't be set at sign-up; we set it here.
 */
async function ensureUserClinic(
	userId: string,
	clinicId: string
): Promise<void> {
	const current = await db.query.user.findFirst({ where: { id: userId } });
	if (current?.clinicId === clinicId) {
		console.log(`🔗 User already scoped to ${clinicId}`);
		return;
	}
	await db
		.update(schema.user)
		.set({ clinicId, updatedAt: new Date() })
		.where(eq(schema.user.id, userId));
	console.log(`🔗 User scoped to clinic ${clinicId}`);
}

/**
 * Ensure the credential account's password matches `CONFIG.admin.password`.
 *
 * This is a no-op on first run (signUpEmail just created it). On re-runs it
 * lets you rotate the password in `.env` without wiping the DB.
 */
async function ensureCredentialPassword(userId: string): Promise<void> {
	const { password } = CONFIG.admin;
	const ctx = await auth.$context;

	const existing = await db.query.account.findFirst({
		where: { userId, providerId: "credential" }
		//  and(eq(schema.account.userId, userId), eq(schema.account.providerId, "credential")),
	});

	const newHash = await ctx.password.hash(password);

	if (existing) {
		await db
			.update(schema.account)
			.set({ password: newHash, updatedAt: new Date() })
			.where(eq(schema.account.id, existing.id));
		console.log("🔐 Credential password synced with .env");
	} else {
		await db.insert(schema.account).values({
			id: createId(),
			userId,
			providerId: "credential",
			accountId: userId,
			password: newHash,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		console.log("🔐 Credential account created (user had none)");
	}
}

/**
 * Ensure a staff profile exists for the admin user.
 *
 * Uses `auth.$context.password.hash` for the staff PIN so PIN verification
 * (whenever you add it) matches Better Auth's current algorithm.
 */
async function ensureStaffProfile(
	userId: string,
	clinicId: string
): Promise<string> {
	const existing = await db.query.staff.findFirst({ where: { userId } });
	if (existing) {
		console.log(`👨‍⚕️ Staff profile exists: ${existing.name} (${existing.id})`);
		return existing.id;
	}

	console.log("👨‍⚕️ Creating staff profile...");
	const { name, email, pin } = CONFIG.admin;
	const ctx = await auth.$context;
	const pinHash = await ctx.password.hash(pin);

	const licenseNumber = `MD-${new Date().getFullYear()}-${String(
		Math.floor(1000 + Math.random() * 9000)
	).padStart(4, "0")}`;

	const [created] = await db
		.insert(schema.staff)
		.values({
			id: createId("staff"),
			name,
			clinicId,
			title: "Senior Pediatrician & Clinic Director",
			role: "admin",
			licenseNumber,
			avatarColor: "#0d9488",
			pinHash,
			userId,
			email,
			isActive: true,
			specialty: "General Pediatrics",
			department: "Pediatrics",
			createdAt: new Date(),
			updatedAt: new Date()
		})
		.returning();

	if (!created) throw new Error("Failed to create staff profile");
	console.log(`✅ Staff profile created: ${created.name} (${created.id})`);
	return created.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export async function seedAdmin(): Promise<void> {
	console.log("🌱 Seeding admin user, clinic, and staff profile...\n");

	validateConfig();

	const clinicId = await ensureClinic();
	const { userId } = await ensureUser();

	await ensureAdminRoleAndVerification(userId);
	await ensureUserClinic(userId, clinicId);
	await ensureCredentialPassword(userId);
	await ensureStaffProfile(userId, clinicId);

	await verifySignIn();

	console.log("\n✅ Admin seed complete!");
	console.log("📋 Summary:");
	console.log(`  🏥 Clinic: ${CONFIG.clinic.name} (${clinicId})`);
	console.log(`  👤 User:   ${CONFIG.admin.email} (${userId})`);
	console.log("\n🔑 Login credentials:");
	console.log(`  📧 Email:    ${CONFIG.admin.email}`);
	console.log(`  🔑 Password: ${CONFIG.admin.password}`);
	console.log(`  🔐 Staff PIN: ${CONFIG.admin.pin}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
	seedAdmin()
		.then(() => {
			console.log("✅ Done!");
			process.exit(0);
		})
		.catch(error => {
			console.error("❌ Seed failed:", error);
			process.exit(1);
		});
}
