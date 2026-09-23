// src/lib/auth/roles.ts
import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	userAc
} from "better-auth/plugins/admin/access";

// ============================================================================
// 1. Define Resources and Actions
// ============================================================================

const statement = {
	patients: ["create", "read", "update", "delete", "list"],
	appointments: ["create", "read", "update", "delete", "list"],
	records: ["create", "read", "update", "delete", "list"],
	staff: ["create", "read", "update", "delete", "list"],
	payments: ["create", "read", "update", "delete", "list"],
	immunization: ["create", "read", "update", "delete"],
	prescription: ["create", "read", "update", "delete"],
	growth: ["create", "read", "update", "delete"],
	system: ["backup", "restore", "configure", "monitor"],
	reports: ["generate", "export", "view", "schedule"],
	settings: ["read", "update"],
	audit: ["read", "export"]
} as const;

const statements = {
	...defaultStatements,
	...statement
};

// ============================================================================
// 2. Create Access Control Instance
// ============================================================================

export const ac = createAccessControl(statements);

// ============================================================================
// 3. Define Roles
// ============================================================================

const admin = ac.newRole({
	...statements,
	...adminAc.statements
});

const doctor = ac.newRole({
	...userAc.statements,
	patients: ["create", "read", "update", "list"],
	appointments: ["create", "read", "update", "delete", "list"],
	records: ["create", "read", "update", "list"],
	immunization: ["create", "read", "update"],
	prescription: ["create", "read", "update"],
	growth: ["create", "read", "update"],
	payments: ["read", "list"],
	reports: ["generate", "view"],
	settings: ["read"],
	staff: [],
	system: [],
	audit: []
});

const staff = ac.newRole({
	...userAc.statements,
	patients: ["create", "read", "update", "list"],
	appointments: ["create", "read", "update", "delete", "list"],
	payments: ["create", "read", "update", "list"],
	records: ["read", "list"],
	staff: ["read"],
	immunization: ["read"],
	prescription: ["read"],
	growth: ["read"],
	reports: ["view"],
	settings: ["read"],
	system: [],
	audit: []
});

const patient = ac.newRole({
	...userAc.statements,
	appointments: ["create", "read"],
	records: ["read"],
	payments: ["read"],
	immunization: ["read"],
	prescription: ["read"],
	growth: ["read"],
	patients: [], // Cannot access other patients
	staff: [],
	system: [],
	reports: [],
	settings: [],
	audit: []
});

export const roles = {
	admin,
	doctor,
	staff,
	patient
};

// ============================================================================
// 4. Role Types and Constants
// ============================================================================

export type UserRoles = keyof typeof roles;
export type Role = UserRoles;
export type Permission = keyof typeof statements;

/**
 * NOTE: ROLE_PRIORITY is strictly intended for UI sorting, display ordering,
 * and administrative hierarchy scope (e.g., determining if a user can manage
 * another user's profile). Security permission enforcement must rely exclusively
 * on Better-Auth's access control (`ac`) checks.
 */
export const ROLE_PRIORITY: Record<Role, number> = {
	admin: 100,
	doctor: 80,
	staff: 60,
	patient: 40
};

export const ROLE_LABELS: Record<
	Role,
	{ en: string; ar: string; color: string }
> = {
	admin: {
		en: "Administrator",
		ar: "مدير النظام",
		color: "text-red-600 bg-red-50"
	},
	doctor: {
		en: "Pediatrician / Doctor",
		ar: "طبيب أطفال",
		color: "text-blue-600 bg-blue-50"
	},
	staff: {
		en: "Clinic Staff",
		ar: "موظف عيادة",
		color: "text-green-600 bg-green-50"
	},
	patient: {
		en: "Patient / Parent",
		ar: "مريض / ولي أمر",
		color: "text-gray-600 bg-gray-50"
	}
};

// ============================================================================
// 5. Helper Functions
// ============================================================================

export function getRolePriority(role: Role): number {
	return ROLE_PRIORITY[role] || 0;
}

export function isHigherOrEqualRole(role1: Role, role2: Role): boolean {
	return getRolePriority(role1) >= getRolePriority(role2);
}

export function getEffectivePermissions(role: Role): Array<string> {
	const roleConfig = roles[role];
	if (!roleConfig) return [];

	// Use an unknown intermediate cast to bypass the readonly tuple vs mutable string[] mismatch
	const configRecord = roleConfig;

	const statementsMap = configRecord.statements || configRecord;
	const permissions: Array<string> = [];

	for (const [resource, actions] of Object.entries(statementsMap)) {
		if (Array.isArray(actions)) {
			for (const action of actions) {
				permissions.push(`${resource}:${action}`);
			}
		}
	}

	return permissions;
}

// ============================================================================
// 6. Role Validation
// ============================================================================

export function isValidRole(role: string): role is Role {
	return role in roles;
}

export function getDefaultRole(): Role {
	return "patient";
}

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(
	([value, label]) => ({
		value: value,
		label: label.en,
		labelAr: label.ar
	})
);

// ============================================================================
// 7. Exports
// ============================================================================

export { statements };
