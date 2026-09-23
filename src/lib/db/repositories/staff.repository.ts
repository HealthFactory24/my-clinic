// src/db/repositories/staff.repository.ts
import { and, asc, desc, eq, type SQL, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
	type DB,
	type DBorTx,
	db,
	type Transaction,
	withTransaction
} from "#/lib/db";
import { escapeRegExp, queryCache } from "#/lib/db/cache";
import {
	type Encounter,
	type NewStaff,
	type Patient,
	type Prescription,
	type Role,
	type Staff,
	staff
} from "#/lib/db/schema";

import { BaseRepository, type BaseRow } from "./base.repository";

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;

// ============================================================
// Types
// ============================================================

type StaffWithPatients = Staff & {
	patients: Array<Patient>;
};

type StaffWithEncounters = Staff & {
	encounters: Array<Encounter & { patient: Patient }>;
};

type StaffWithPrescriptions = Staff & {
	prescriptions: Array<Prescription & { patient: Patient }>;
};

export type FindAllOptions = {
	isActive?: boolean;
	limit?: number;
	offset?: number;
	orderBy?: "name" | "createdAt";
	orderDirection?: "asc" | "desc";
	role?: Role;
	search?: string;
};

export type CountOptions = {
	isActive?: boolean;
	role?: Role;
};

export type StaffStats = {
	total: number;
	active: number;
	inactive: number;
	byRole: Record<Role, number>;
};

// ============================================================
// Cast helpers
// ============================================================
//
// The base's `*Impl` methods return `BaseRow` because the base is
// table-agnostic. Here we know the table, so we narrow to the concrete row
// type. Every cast in this file lives in one of these helpers, so the
// linter's `no-unsafe-type-assertion` fires once per helper rather than at
// every call site.

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing BaseRow to the concrete Staff row type
const asStaff = (row: BaseRow): Staff => row as Staff;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
const asStaffs = (rows: Array<BaseRow>): Array<Staff> => rows as Array<Staff>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `with.patients` declared in relations.ts
const asStaffWithPatients = (row: BaseRow): StaffWithPatients =>
	row as StaffWithPatients;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `with.encounters.patient` declared in relations.ts
const asStaffWithEncounters = (row: BaseRow): StaffWithEncounters =>
	row as StaffWithEncounters;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `with.prescriptions.patient` declared in relations.ts
const asStaffWithPrescriptions = (row: BaseRow): StaffWithPrescriptions =>
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	row as StaffWithPrescriptions;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- widening; no runtime effect
const toBaseRow = (data: object): BaseRow => data as BaseRow;

// ============================================================
// Guards
// ============================================================

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ============================================================
// Filters
// ============================================================

function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, ch => `\\${ch}`);
}

/**
 * Single source of truth for staff filters. Used by `findAll` (page + count),
 * `countBy`, and any future query that needs a `WHERE` on the `staff` table.
 */
function buildStaffWhere(options: FindAllOptions): SQL | undefined {
	const conditions: Array<SQL> = [];
	const { role, isActive, search } = options;

	if (role) {
		conditions.push(eq(staff.role, role));
	}
	if (isActive !== undefined) {
		conditions.push(eq(staff.isActive, isActive));
	}
	if (search) {
		const pattern = `%${escapeLikePattern(search)}%`;
		conditions.push(
			sql`(${staff.name} ILIKE ${pattern} OR ${staff.email} ILIKE ${pattern} OR ${staff.title} ILIKE ${pattern})`
		);
	}

	if (conditions.length === 0) return undefined;
	if (conditions.length === 1) return conditions[0];
	return and(...conditions);
}

// ============================================================
// Repository
// ============================================================

export class StaffRepository extends BaseRepository {
	protected readonly table = staff;
	protected readonly idColumn: PgColumn = staff.id;
	protected readonly tableName = "staff";

	constructor(database: DB | Transaction | DBorTx = db) {
		super(database);
	}

	// --------------------------------------------------------------------------
	// Public CRUD
	// --------------------------------------------------------------------------

	async findById(
		id: string,
		scope?: { clinicId: string }
	): Promise<Staff | StaffWithPatients | null> {
		if (!scope) {
			const row = await this.findByIdImpl(id);
			return row ? asStaff(row) : null;
		}

		const cacheKey = `staff:${scope.clinicId}:${id}`;
		const cached = queryCache.get<Staff>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(staff.id, id),
			with: { user: true }
		});

		if (!isRecord(row)) return null;

		// Verify scope post-fetch: the joined `user.clinicId` must match.
		const user = row["user"];
		if (!isRecord(user) || user["clinicId"] !== scope.clinicId) {
			return null;
		}

		// Strip the joined `user` relation — this method returns a `Staff`.
		const { user: _omit, ...base } = row;
		void _omit;
		const result = asStaff(base);

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`staff:${id}`]
		});

		return result;
	}

	async delete(id: string, scope?: { clinicId: string }): Promise<boolean> {
		const staffMember = await withTransaction(async (tx: Transaction) => {
			const existing = await tx.query.staff.findFirst({
				where: scope ? { id, user: { clinicId: scope.clinicId } } : { id }
			});
			if (!existing) return null;

			await tx.delete(staff).where(eq(staff.id, id));
			return existing;
		});

		if (!staffMember) return false;

		this.invalidateAfterWrite([staffMember.id], staffMember.email);
		return true;
	}

	// --------------------------------------------------------------------------
	// Reads
	// --------------------------------------------------------------------------

	async findByEmail(
		email: string,
		scope: { clinicId: string }
	): Promise<Staff | null> {
		const cacheKey = `staff:email:${scope.clinicId}:${email}`;
		const cached = queryCache.get<Staff>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(staff.email, email),
			with: { user: true }
		});

		if (!isRecord(row)) return null;

		const user = row["user"];
		if (!isRecord(user) || user["clinicId"] !== scope.clinicId) {
			return null;
		}

		const { user: _omit, ...base } = row;
		void _omit;
		const result = asStaff(base);

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`staff:${result.id}`]
		});

		return result;
	}

	async findAll(
		options: FindAllOptions = {}
	): Promise<{ data: Array<Staff>; total: number }> {
		const {
			limit = 50,
			offset = 0,
			orderBy = "name",
			orderDirection = "asc"
		} = options;

		const cacheKey = `staff:list:${JSON.stringify(options)}`;
		const cached = queryCache.get<{ data: Array<Staff>; total: number }>(
			cacheKey
		);
		if (cached) return cached;

		const where = buildStaffWhere(options);

		// Map orderBy to a concrete column expression.
		const orderColumn = orderBy === "createdAt" ? staff.createdAt : staff.name;
		const orderExpr =
			orderDirection === "desc" ? desc(orderColumn) : asc(orderColumn);

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${orderExpr}`
			}),
			this.count(where)
		]);

		const result = {
			data: asStaffs(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["staff:list"]
		});

		return result;
	}

	async findActive(): Promise<Array<Staff>> {
		const cacheKey = "staff:active";
		const cached = queryCache.get<Array<Staff>>(cacheKey);
		if (cached) return cached;

		const rows = await this.findManyImpl(eq(staff.isActive, true), {
			orderBy: sql`${staff.name} ASC`
		});
		const result = asStaffs(rows);

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["staff:active"]
		});

		return result;
	}

	async findByRole(role: Role): Promise<Array<Staff>> {
		const cacheKey = `staff:role:${role}`;
		const cached = queryCache.get<Array<Staff>>(cacheKey);
		if (cached) return cached;

		const rows = await this.findManyImpl(eq(staff.role, role), {
			orderBy: sql`${staff.name} ASC`
		});
		const result = asStaffs(rows);

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`staff:role:${role}`]
		});

		return result;
	}

	async getStaffWithPatients(id: string): Promise<StaffWithPatients | null> {
		const cacheKey = `staff:${id}:with-patients`;
		const cached = queryCache.get<StaffWithPatients>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(staff.id, id),
			with: {
				patients: {
					limit: 10,
					orderBy: { createdAt: "desc" }
				}
			}
		});

		if (!isRecord(row)) return null;

		const result = asStaffWithPatients(row);
		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`staff:${id}`, `staff:${id}:patients`]
		});

		return result;
	}

	async getStaffWithEncounters(
		id: string
	): Promise<StaffWithEncounters | null> {
		const cacheKey = `staff:${id}:with-encounters`;
		const cached = queryCache.get<StaffWithEncounters>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(staff.id, id),
			with: {
				encounters: {
					limit: 20,
					orderBy: { encounterDate: "desc" },
					with: { patient: true }
				}
			}
		});

		if (!isRecord(row)) return null;

		const result = asStaffWithEncounters(row);
		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`staff:${id}`, `staff:${id}:encounters`]
		});

		return result;
	}

	async getStaffWithPrescriptions(
		id: string
	): Promise<StaffWithPrescriptions | null> {
		const cacheKey = `staff:${id}:with-prescriptions`;
		const cached = queryCache.get<StaffWithPrescriptions>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const row: unknown = await query.findFirst({
			where: eq(staff.id, id),
			with: {
				prescriptions: {
					limit: 20,
					orderBy: { createdAt: "desc" },
					with: { patient: true }
				}
			}
		});

		if (!isRecord(row)) return null;

		const result = asStaffWithPrescriptions(row);
		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`staff:${id}`, `staff:${id}:prescriptions`]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Count
	// --------------------------------------------------------------------------

	async countBy(options: CountOptions = {}): Promise<number> {
		const cacheKey = `staff:count:${JSON.stringify({
			role: options.role,
			isActive: options.isActive
		})}`;
		const cached = queryCache.get<number>(cacheKey);
		if (cached !== null) return cached;

		const where = buildStaffWhere(options);
		const value = await this.count(where);

		queryCache.set(cacheKey, value, {
			ttl: CACHE_TTL,
			tags: ["staff:count"]
		});

		return value;
	}

	// --------------------------------------------------------------------------
	// Statistics
	// --------------------------------------------------------------------------

	async getStats(): Promise<StaffStats> {
		const cacheKey = "staff:stats";
		const cached = queryCache.get<StaffStats>(cacheKey);
		if (cached) return cached;

		const [row] = await this.db
			.select({
				total: sql<number>`count(*)::int`,
				active: sql<number>`count(*) filter (where ${staff.isActive} = true)::int`,
				inactive: sql<number>`count(*) filter (where ${staff.isActive} = false)::int`,
				admin: sql<number>`count(*) filter (where ${staff.role} = 'admin')::int`,
				doctor: sql<number>`count(*) filter (where ${staff.role} = 'doctor')::int`,
				staffCount: sql<number>`count(*) filter (where ${staff.role} = 'staff')::int`,
				patient: sql<number>`count(*) filter (where ${staff.role} = 'patient')::int`
			})
			.from(staff);

		const result: StaffStats = {
			total: row?.total ?? 0,
			active: row?.active ?? 0,
			inactive: row?.inactive ?? 0,
			byRole: {
				admin: row?.admin ?? 0,
				doctor: row?.doctor ?? 0,
				staff: row?.staffCount ?? 0,
				patient: row?.patient ?? 0
			}
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["staff:stats"]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Writes
	// --------------------------------------------------------------------------

	async create(data: NewStaff): Promise<Staff> {
		const row = await this.createImpl(toBaseRow(data));
		const result = asStaff(row);

		this.invalidateAfterWrite([result.id], result.email);
		return result;
	}

	async bulkCreate(data: Array<NewStaff>): Promise<Array<Staff>> {
		if (data.length === 0) return [];

		const results = await withTransaction(async (tx: Transaction) =>
			tx.insert(staff).values(data).returning()
		);

		results.forEach(s => {
			this.invalidateAfterWrite([s.id], s.email);
		});
		return results;
	}

	async update(
		id: string,
		data: Partial<NewStaff>,
		scope?: { clinicId: string }
	): Promise<Staff | null> {
		if (scope) {
			// Scoped update: verify the staff member belongs to the clinic first.
			const result = await withTransaction(async (tx: Transaction) => {
				const existing = await tx.query.staff.findFirst({
					where: { id, user: { clinicId: scope.clinicId } }
				});
				if (!existing) return null;

				const [updated] = await tx
					.update(staff)
					.set({ ...data, updatedAt: new Date() })
					.where(eq(staff.id, id))
					.returning();

				return updated ? { previous: existing, current: updated } : null;
			});

			if (!result) return null;

			this.invalidateAfterWrite(
				[result.current.id],
				result.previous.email,
				result.current.email
			);
			return result.current;
		}

		const row = await this.updateImpl(
			id,
			toBaseRow(data),
			/* hasUpdatedAt */ true
		);
		if (!row) return null;

		const result = asStaff(row);
		this.invalidateAfterWrite([result.id], result.email);
		return result;
	}

	async toggleActive(
		id: string,
		scope: { clinicId: string }
	): Promise<Staff | null> {
		const result = await withTransaction(async (tx: Transaction) => {
			const staffMember = await tx.query.staff.findFirst({
				where: { id, user: { clinicId: scope.clinicId } }
			});
			if (!staffMember) return null;

			const [updated] = await tx
				.update(staff)
				.set({ isActive: !staffMember.isActive, updatedAt: new Date() })
				.where(eq(staff.id, id))
				.returning();

			return updated ?? null;
		});

		if (!result) return null;

		this.invalidateAfterWrite([result.id], result.email);
		return result;
	}

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	private invalidateAfterWrite(
		staffIds: Array<string>,
		...emails: Array<string | undefined | null>
	): void {
		queryCache.invalidateTag("staff:list");
		queryCache.invalidateTag("staff:active");
		queryCache.invalidateTag("staff:count");
		queryCache.invalidateTag("staff:stats");

		for (const staffId of new Set(staffIds)) {
			queryCache.invalidate(`staff:${staffId}`);
			queryCache.invalidatePrefix(`staff:${staffId}:`);
			queryCache.invalidatePattern(
				new RegExp(`^staff:[^:]+:${escapeRegExp(staffId)}$`)
			);
		}

		for (const email of new Set(emails)) {
			if (!email) continue;
			queryCache.invalidatePrefix("staff:email:");
			queryCache.invalidatePattern(
				new RegExp(`^staff:email:[^:]+:${escapeRegExp(email)}$`)
			);
		}
	}
}

export const staffRepository = new StaffRepository(db);
