// oxlint-disable typescript/no-unsafe-type-assertion
// lib/db/repositories/appointment.repository.ts
import {
	and,
	count,
	countDistinct,
	eq,
	gt,
	gte,
	ilike,
	inArray,
	lt,
	lte,
	ne,
	or,
	type SQL,
	sql
} from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import {
	type DB,
	type DBorTx,
	db as dbClient,
	type Transaction,
	withTransaction
} from "#/lib/db";
import { queryCache } from "#/lib/db/cache";
import {
	type Appointment,
	type AppointmentStatus,
	appointments,
	type NewAppointment,
	type Patient,
	patients,
	type Staff,
	type VisitType
} from "#/lib/db/schema";

import { BaseRepository, type BaseRow } from "./base.repository";

const CACHE_TTL = 60_000;
const LIST_CACHE_TTL = 30_000;
const AVAILABILITY_CACHE_TTL = 30_000;

// ============================================================
// Availability cache (per-staff eviction)
// ============================================================
//
// TODO: This hand-rolled Map should eventually be replaced by relying on the
// database + `queryCache`. It exists today because `isTimeSlotAvailable` is
// called on every appointment-form keystroke. Once you have an integration
// test that exercises concurrent bookings, remove this and cache via
// `cacheQuery(key, fn, ttl, tags)` with per-staff tags.

/**
 * Key format: `${staffId}|${startMs}|${durationMinutes}|${excludeAppointmentId ?? ""}`
 *
 * The leading `staffId|` segment is load-bearing — `invalidateAvailabilityCacheForStaff`
 * relies on it to evict only the entries touched by a single staff member's write.
 * Do not reorder the key without updating both helpers.
 */
const availabilityCache = new Map<
	string,
	{ available: boolean; timestamp: number }
>();

function invalidateAvailabilityCache(): void {
	availabilityCache.clear();
}

function invalidateAvailabilityCacheForStaff(staffId: string): void {
	const prefix = `${staffId}|`;
	for (const key of Array.from(availabilityCache.keys())) {
		if (key.startsWith(prefix)) availabilityCache.delete(key);
	}
}

// ============================================================
// Types
// ============================================================

export type FindByPatientOptions = {
	appointmentType?: VisitType;
	endDate?: Date;
	limit?: number;
	offset?: number;
	startDate?: Date;
	status?: AppointmentStatus;
};

export type FindByStaffOptions = FindByPatientOptions;

export type SearchOptions = {
	appointmentType?: VisitType;
	endDate?: Date;
	limit?: number;
	offset?: number;
	patientId?: string;
	query?: string;
	staffId?: string;
	startDate?: Date;
	status?: AppointmentStatus;
};

export type CountOptions = Omit<SearchOptions, "limit" | "offset" | "query">;

type AppointmentWithRelations = Appointment & {
	patient: Patient;
	staff: Staff;
};

type AppointmentWithPatient = Appointment & {
	patient: Patient;
	staff?: Staff;
};

type AppointmentStats = {
	total: number;
	scheduled: number;
	checkedIn: number;
	inProgress: number;
	completed: number;
	cancelled: number;
	noShow: number;
	today: number;
	thisWeek: number;
	byPatient: number;
};

// ============================================================
// Cast helpers
// ============================================================
//
// The base's `*Impl` methods return `BaseRow` (`Record<string, unknown>`)
// because the base is table-agnostic. Here we know the table, so we narrow
// to the concrete row types. Every cast in this file lives in one of these
// helpers, so the linter's `no-unsafe-type-assertion` fires once per helper
// rather than at every call site.

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing BaseRow to the concrete Appointment row type
const asAppointment = (row: BaseRow): Appointment => row as Appointment;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
const asAppointments = (rows: Array<BaseRow>): Array<Appointment> =>
	rows as Array<Appointment>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- relational payload: `with.patient` and `with.staff` are declared in relations.ts
const asAppointmentWithRelations = (row: BaseRow): AppointmentWithRelations =>
	row as AppointmentWithRelations;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
const asAppointmentsWithRelations = (
	rows: Array<BaseRow>
): Array<AppointmentWithRelations> => rows as Array<AppointmentWithRelations>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above; only `with.patient` is populated
const asAppointmentsWithPatient = (
	rows: Array<BaseRow>
): Array<AppointmentWithPatient> => rows as Array<AppointmentWithPatient>;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- widening; no runtime effect
const toBaseRow = (data: object): BaseRow => data as BaseRow;

/**
 * Compute Monday 00:00 of the current week in local time.
 * `getDay()` returns 0 for Sunday, so we shift to make Monday the start.
 */
function startOfIsoWeek(reference: Date): Date {
	const d = new Date(reference);
	d.setHours(0, 0, 0, 0);
	const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
	const diff = (day + 6) % 7; // Mon → 0, Sun → 6
	d.setDate(d.getDate() - diff);
	return d;
}

/**
 * Escape `%` and `_` in a user-supplied LIKE pattern.
 */
function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, ch => `\\${ch}`);
}

/**
 * Build a single Drizzle `SQL` condition from search options.
 *
 * This is the *only* filter builder for appointments. Both the page query and
 * the count query use the same `SQL`, so list/count results cannot drift.
 */
function buildAppointmentWhere(
	options: SearchOptions,
	scope?: { clinicId: string }
): SQL | undefined {
	const conditions: Array<SQL> = [];
	const {
		query,
		status,
		patientId,
		staffId,
		appointmentType,
		startDate,
		endDate
	} = options;

	if (status) conditions.push(eq(appointments.status, status));
	if (patientId) conditions.push(eq(appointments.patientId, patientId));
	if (staffId) conditions.push(eq(appointments.staffId, staffId));
	if (appointmentType) conditions.push(eq(appointments.type, appointmentType));
	if (startDate) conditions.push(gte(appointments.startTime, startDate));
	if (endDate) conditions.push(lte(appointments.startTime, endDate));

	if (query) {
		const pattern = `%${escapeLikePattern(query)}%`;
		const search = or(
			ilike(patients.firstName, pattern),
			ilike(patients.lastName, pattern),
			ilike(patients.mrn, pattern),
			ilike(appointments.notes, pattern)
		);
		if (search) conditions.push(search);
	}

	if (scope) {
		// Scope via a subquery on patients — keeps the join optional.
		conditions.push(
			sql`${appointments.patientId} IN (SELECT id FROM ${patients} WHERE clinic_id = ${scope.clinicId})`
		);
	}

	if (conditions.length === 0) return undefined;
	if (conditions.length === 1) return conditions[0];
	return and(...conditions);
}

// ============================================================
// Repository
// ============================================================

export class AppointmentRepository extends BaseRepository {
	protected readonly table = appointments;
	protected readonly idColumn: PgColumn = appointments.id;
	protected readonly tableName = "appointments";

	constructor(database: DB | Transaction | DBorTx = dbClient) {
		super(database);
	}

	// --------------------------------------------------------------------------
	// Availability
	// --------------------------------------------------------------------------

	async isTimeSlotAvailable(
		staffId: string,
		appointmentDate: Date | string,
		durationMinutes = 30,
		excludeAppointmentId?: string
	): Promise<boolean> {
		const date = new Date(appointmentDate);
		const endTime = new Date(date.getTime() + durationMinutes * 60 * 1000);
		const cacheKey = `${staffId}|${date.getTime()}|${durationMinutes}|${excludeAppointmentId ?? ""}`;

		const cached = availabilityCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < AVAILABILITY_CACHE_TTL) {
			return cached.available;
		}

		const [row] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(appointments)
			.where(
				and(
					eq(appointments.staffId, staffId),
					lt(appointments.startTime, endTime),
					gt(appointments.endTime, date),
					ne(appointments.status, "Cancelled"),
					ne(appointments.status, "No Show"),
					excludeAppointmentId
						? ne(appointments.id, excludeAppointmentId)
						: undefined
				)
			);

		const available = (row?.count ?? 0) === 0;
		availabilityCache.set(cacheKey, { available, timestamp: Date.now() });
		return available;
	}

	// --------------------------------------------------------------------------
	// Public CRUD — wrap the base *Impl methods with concrete types
	// --------------------------------------------------------------------------

	async findById(
		id: string,
		scope?: { clinicId: string }
	): Promise<AppointmentWithRelations | null> {
		const cacheKey = `appointment:${scope?.clinicId ?? "all"}:${id}`;
		const cached = queryCache.get<AppointmentWithRelations>(cacheKey);
		if (cached) return cached;

		const query = this.getQueryBuilder();
		const where = scope
			? and(eq(appointments.id, id), eq(patients.clinicId, scope.clinicId))
			: eq(appointments.id, id);

		const row: unknown = await query.findFirst({
			where,
			with: { patient: true, staff: true }
		});

		if (!isBaseRow(row)) return null;

		const result = asAppointmentWithRelations(row);
		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [
				`appointment:${id}`,
				`patient:${result.patientId}:appointments`,
				`staff:${result.staffId}:appointments`
			]
		});

		return result;
	}

	async delete(id: string, scope?: { clinicId: string }): Promise<boolean> {
		const appointment = await withTransaction(async (tx: Transaction) => {
			const existing = await tx.query.appointments.findFirst({
				where: scope ? { id, patient: { clinicId: scope.clinicId } } : { id }
			});
			if (!existing) return null;

			await tx.delete(appointments).where(eq(appointments.id, id));
			return existing;
		});

		if (!appointment) return false;

		this.invalidateAfterWrite(
			[appointment.patientId],
			[appointment.staffId],
			id
		);
		return true;
	}

	// --------------------------------------------------------------------------
	// Reads
	// --------------------------------------------------------------------------

	async search(
		options: SearchOptions = {},
		scope?: { clinicId: string }
	): Promise<{ data: Array<AppointmentWithPatient>; total: number }> {
		const { limit = 50, offset = 0, query } = options;
		const scopeKey = scope?.clinicId ?? "all";
		const cacheKey = `appointment:list:${scopeKey}:${JSON.stringify(options)}`;
		const cached = queryCache.get<{
			data: Array<AppointmentWithPatient>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		// One `where` for both queries. The count joins patients only when the
		// search term actually references patient fields.
		const where = buildAppointmentWhere(options, scope);

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${appointments.startTime} ASC`,
				with: { patient: true }
			}),
			this.countWithJoin(where, query !== undefined)
		]);

		const result = {
			data: asAppointmentsWithPatient(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: ["appointments:list"]
		});

		return result;
	}

	async findByPatientId(
		patientId: string,
		options: FindByPatientOptions = {}
	): Promise<{ data: Array<AppointmentWithRelations>; total: number }> {
		const {
			limit = 50,
			offset = 0,
			status,
			startDate,
			endDate,
			appointmentType
		} = options;

		const cacheKey = `appointment:patient:${patientId}:${JSON.stringify(options)}`;
		const cached = queryCache.get<{
			data: Array<AppointmentWithRelations>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const where = buildAppointmentWhere({
			patientId,
			status,
			appointmentType,
			startDate,
			endDate
		});

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${appointments.startTime} ASC`,
				with: { patient: true, staff: true }
			}),
			this.count(where)
		]);

		const result = {
			data: asAppointmentsWithRelations(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`patient:${patientId}`, `patient:${patientId}:appointments`]
		});

		return result;
	}

	async findByStaffId(
		staffId: string,
		options: FindByStaffOptions = {}
	): Promise<{ data: Array<AppointmentWithRelations>; total: number }> {
		const {
			limit = 50,
			offset = 0,
			status,
			startDate,
			endDate,
			appointmentType
		} = options;

		const cacheKey = `appointment:staff:${staffId}:${JSON.stringify(options)}`;
		const cached = queryCache.get<{
			data: Array<AppointmentWithRelations>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const where = buildAppointmentWhere({
			staffId,
			status,
			appointmentType,
			startDate,
			endDate
		});

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${appointments.startTime} ASC`,
				with: { patient: true, staff: true }
			}),
			this.count(where)
		]);

		const result = {
			data: asAppointmentsWithRelations(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [`staff:${staffId}`, `staff:${staffId}:appointments`]
		});

		return result;
	}

	async findByDate(
		date: Date,
		options: { limit?: number; offset?: number } = {}
	): Promise<{ data: Array<AppointmentWithRelations>; total: number }> {
		const { limit = 50, offset = 0 } = options;

		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		const dateKey = date.toISOString().split("T")[0];
		const cacheKey = `appointment:date:${dateKey}:${limit}:${offset}`;
		const cached = queryCache.get<{
			data: Array<AppointmentWithRelations>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const where = and(
			gte(appointments.startTime, startOfDay),
			lte(appointments.startTime, endOfDay)
		);

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${appointments.startTime} ASC`,
				with: { patient: true, staff: true }
			}),
			this.count(where)
		]);

		const result = {
			data: asAppointmentsWithRelations(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: [`appointment:date:${dateKey}`]
		});

		return result;
	}

	async findUpcomingByPatientId(
		patientId: string,
		limit = 10
	): Promise<Array<AppointmentWithRelations>> {
		const cacheKey = `appointment:patient:${patientId}:upcoming`;
		const cached = queryCache.get<Array<AppointmentWithRelations>>(cacheKey);
		if (cached) return cached;

		const now = new Date();
		const where = and(
			eq(appointments.patientId, patientId),
			sql`${appointments.status} NOT IN ('Completed', 'Cancelled', 'No Show')`,
			gte(appointments.startTime, now)
		);

		const rows = await this.findManyImpl(where, {
			limit,
			orderBy: sql`${appointments.startTime} ASC`,
			with: { patient: true, staff: true }
		});

		const result = asAppointmentsWithRelations(rows);

		queryCache.set(cacheKey, result, {
			ttl: LIST_CACHE_TTL,
			tags: [
				`patient:${patientId}`,
				`patient:${patientId}:appointments:upcoming`
			]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Statistics
	// --------------------------------------------------------------------------

	async getStats(): Promise<AppointmentStats> {
		const cacheKey = "appointment:stats";
		const cached = queryCache.get<AppointmentStats>(cacheKey);
		if (cached) return cached;

		const now = new Date();
		const todayStart = new Date(now);
		todayStart.setHours(0, 0, 0, 0);
		const todayEnd = new Date(todayStart);
		todayEnd.setDate(todayEnd.getDate() + 1);

		const weekStart = startOfIsoWeek(now);
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekEnd.getDate() + 7);

		const [row] = await this.db
			.select({
				total: count(),
				scheduled: sql<number>`count(*) filter (where ${appointments.status} = 'Scheduled')::int`,
				checkedIn: sql<number>`count(*) filter (where ${appointments.status} = 'Checked In')::int`,
				inProgress: sql<number>`count(*) filter (where ${appointments.status} = 'In Progress')::int`,
				completed: sql<number>`count(*) filter (where ${appointments.status} = 'Completed')::int`,
				cancelled: sql<number>`count(*) filter (where ${appointments.status} = 'Cancelled')::int`,
				noShow: sql<number>`count(*) filter (where ${appointments.status} = 'No Show')::int`,
				today: sql<number>`count(*) filter (where ${appointments.startTime} >= ${todayStart} and ${appointments.startTime} < ${todayEnd})::int`,
				thisWeek: sql<number>`count(*) filter (where ${appointments.startTime} >= ${weekStart} and ${appointments.startTime} < ${weekEnd})::int`,
				byPatient: countDistinct(appointments.patientId)
			})
			.from(appointments);

		const result: AppointmentStats = {
			total: row?.total ?? 0,
			scheduled: row?.scheduled ?? 0,
			checkedIn: row?.checkedIn ?? 0,
			inProgress: row?.inProgress ?? 0,
			completed: row?.completed ?? 0,
			cancelled: row?.cancelled ?? 0,
			noShow: row?.noShow ?? 0,
			today: row?.today ?? 0,
			thisWeek: row?.thisWeek ?? 0,
			byPatient: row?.byPatient ?? 0
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["appointment:stats"]
		});

		return result;
	}

	/**
	 * Count appointments matching the given filter options.
	 *
	 * Named `countBy` to avoid clashing with the base's `count(where: SQL)`.
	 */
	async countBy(options: CountOptions = {}): Promise<number> {
		const cacheKey = `appointment:count:${JSON.stringify(options)}`;
		const cached = queryCache.get<number>(cacheKey);
		if (cached !== null) return cached;

		const where = buildAppointmentWhere(options);
		const value = await this.count(where);

		queryCache.set(cacheKey, value, {
			ttl: CACHE_TTL,
			tags: ["appointment:count"]
		});

		return value;
	}

	// --------------------------------------------------------------------------
	// Writes
	// --------------------------------------------------------------------------

	async create(
		data: NewAppointment,
		scope?: { clinicId: string }
	): Promise<Appointment> {
		if (!scope) {
			const row = await this.createImpl(toBaseRow(data));
			const created = asAppointment(row);
			this.invalidateAfterWrite([created.patientId], [created.staffId]);
			return created;
		}

		const appointment = await withTransaction(async (tx: Transaction) => {
			const patient = await tx.query.patients.findFirst({
				where: { id: data.patientId, clinicId: scope.clinicId }
			});
			if (!patient) {
				throw new Error("Patient not found in clinic");
			}

			const [created] = await tx.insert(appointments).values(data).returning();
			if (!created) {
				throw new Error("Failed to create appointment");
			}
			return created;
		});

		this.invalidateAfterWrite([appointment.patientId], [appointment.staffId]);
		return appointment;
	}

	async createBatch(
		data: Array<NewAppointment>,
		scope: { clinicId: string }
	): Promise<Array<Appointment>> {
		if (data.length === 0) return [];

		const result = await withTransaction(async (tx: Transaction) => {
			const patientIds = [...new Set(data.map(a => a.patientId))];
			const found = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						inArray(patients.id, patientIds),
						eq(patients.clinicId, scope.clinicId)
					)
				);

			const foundSet = new Set(found.map(p => p.id));
			const missing = patientIds.filter(id => !foundSet.has(id));
			if (missing.length > 0) {
				throw new Error(`Patients not found in clinic: ${missing.join(", ")}`);
			}

			return tx.insert(appointments).values(data).returning();
		});

		const patientIds = [...new Set(result.map(a => a.patientId))];
		const staffIds = [...new Set(result.map(a => a.staffId))];
		this.invalidateAfterWrite(patientIds, staffIds);

		return result;
	}

	async update(
		id: string,
		data: Partial<NewAppointment>,
		scope?: { clinicId: string }
	): Promise<Appointment | null> {
		if (scope) {
			// Scoped update: verify the appointment belongs to the clinic first.
			const row = await withTransaction(async (tx: Transaction) => {
				const existing = await tx.query.appointments.findFirst({
					where: { id, patient: { clinicId: scope.clinicId } }
				});
				if (!existing) return null;

				const [updated] = await tx
					.update(appointments)
					.set({ ...data, updatedAt: new Date() })
					.where(eq(appointments.id, id))
					.returning();

				return updated ?? null;
			});

			if (!row) return null;

			const appointment = asAppointment(toBaseRow(row));
			this.invalidateAfterWrite(
				[appointment.patientId],
				[appointment.staffId],
				id
			);
			return appointment;
		}

		const row = await this.updateImpl(
			id,
			toBaseRow(data),
			/* hasUpdatedAt */ true
		);
		if (!row) return null;

		const appointment = asAppointment(row);
		this.invalidateAfterWrite(
			[appointment.patientId],
			[appointment.staffId],
			id
		);
		return appointment;
	}

	async updateStatus(
		id: string,
		status: AppointmentStatus,
		scope: { clinicId: string }
	): Promise<Appointment | null> {
		return this.update(id, { status }, scope);
	}

	async checkIn(
		id: string,
		scope: { clinicId: string }
	): Promise<Appointment | null> {
		return this.update(id, { status: "Checked In" }, scope);
	}

	async startAppointment(
		id: string,
		scope: { clinicId: string }
	): Promise<Appointment | null> {
		return this.update(id, { status: "In Progress" }, scope);
	}

	async completeAppointment(
		id: string,
		scope: { clinicId: string }
	): Promise<Appointment | null> {
		return this.update(id, { status: "Completed" }, scope);
	}

	async cancelAppointment(
		id: string,
		reason: string | undefined,
		scope: { clinicId: string }
	): Promise<Appointment | null> {
		const updates: Partial<NewAppointment> = { status: "Cancelled" };
		if (reason) updates.notes = reason;
		return this.update(id, updates, scope);
	}

	async markNoShow(
		id: string,
		scope: { clinicId: string }
	): Promise<Appointment | null> {
		return this.update(id, { status: "No Show" }, scope);
	}

	// --------------------------------------------------------------------------
	// Slots
	// --------------------------------------------------------------------------

	async getAvailableSlots(
		staffId: string,
		date: string,
		durationMinutes = 30
	): Promise<Array<{ startTime: string; endTime: string }>> {
		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		const where = and(
			eq(appointments.staffId, staffId),
			gte(appointments.startTime, startOfDay),
			lte(appointments.startTime, endOfDay),
			sql`${appointments.status} NOT IN ('Cancelled', 'No Show')`
		);

		const rows = await this.findManyImpl(where, {
			orderBy: sql`${appointments.startTime} ASC`
		});
		const booked = asAppointments(rows);

		const slots: Array<{ startTime: string; endTime: string }> = [];
		let cursor = new Date(startOfDay);

		const pushSlot = (start: Date, end: Date) => {
			if (end <= endOfDay) {
				slots.push({
					startTime: start.toISOString(),
					endTime: end.toISOString()
				});
			}
		};

		for (const appt of booked) {
			const apptStart = new Date(appt.startTime);
			const apptEnd = new Date(appt.endTime);

			while (
				cursor.getTime() + durationMinutes * 60_000 <=
				apptStart.getTime()
			) {
				const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
				pushSlot(new Date(cursor), slotEnd);
				cursor = slotEnd;
			}

			if (apptEnd > cursor) cursor = apptEnd;
		}

		while (cursor.getTime() + durationMinutes * 60_000 <= endOfDay.getTime()) {
			const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
			pushSlot(new Date(cursor), slotEnd);
			cursor = slotEnd;
		}

		return slots;
	}

	async getByDateRange(
		startDate: Date,
		endDate: Date,
		options: { limit?: number; offset?: number } = {}
	): Promise<{ data: Array<AppointmentWithPatient>; total: number }> {
		const { limit = 100, offset = 0 } = options;

		const cacheKey = `appointment:range:${startDate.toISOString()}:${endDate.toISOString()}:${limit}:${offset}`;
		const cached = queryCache.get<{
			data: Array<AppointmentWithPatient>;
			total: number;
		}>(cacheKey);
		if (cached) return cached;

		const where = and(
			gte(appointments.startTime, startDate),
			lte(appointments.startTime, endDate)
		);

		const [rows, total] = await Promise.all([
			this.findManyImpl(where, {
				limit,
				offset,
				orderBy: sql`${appointments.startTime} ASC`,
				with: { patient: true }
			}),
			this.count(where)
		]);

		const result = {
			data: asAppointmentsWithPatient(rows),
			total
		};

		queryCache.set(cacheKey, result, {
			ttl: CACHE_TTL,
			tags: ["appointments:date"]
		});

		return result;
	}

	// --------------------------------------------------------------------------
	// Internal helpers
	// --------------------------------------------------------------------------

	/**
	 * Count with an optional `LEFT JOIN patients`. Used by `search` when the
	 * search term references patient columns. The base `count(where)` doesn't
	 * join, so we implement a targeted variant here.
	 */
	private async countWithJoin(
		where: SQL | undefined,
		joinPatients: boolean
	): Promise<number> {
		if (!joinPatients) return this.count(where);

		const base = this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.id));
		const query = where ? base.where(where) : base;
		const rows = await query;
		return rows[0]?.count ?? 0;
	}

	// --------------------------------------------------------------------------
	// Cache invalidation
	// --------------------------------------------------------------------------

	/**
	 * Evict every cache entry that could contain a stale view after a write
	 * touching the given patients / staff members.
	 */
	private invalidateAfterWrite(
		patientIds: Array<string>,
		staffIds: Array<string>,
		appointmentId?: string
	): void {
		const uniqueStaff = [...new Set(staffIds)];
		if (uniqueStaff.length <= 1) {
			for (const staffId of uniqueStaff) {
				invalidateAvailabilityCacheForStaff(staffId);
			}
		} else {
			invalidateAvailabilityCache();
		}

		if (appointmentId) {
			queryCache.invalidate(`appointment:${appointmentId}`);
		}

		queryCache.invalidateTag("appointments:list");
		queryCache.invalidateTag("appointments:date");
		queryCache.invalidateTag("appointment:stats");
		queryCache.invalidateTag("appointment:count");

		for (const patientId of new Set(patientIds)) {
			queryCache.invalidateTag(`patient:${patientId}:appointments`);
			queryCache.invalidatePrefix(`appointment:patient:${patientId}:`);
		}

		for (const staffId of new Set(staffIds)) {
			queryCache.invalidateTag(`staff:${staffId}:appointments`);
			queryCache.invalidatePrefix(`appointment:staff:${staffId}:`);
		}
	}
}

// Local guard for `findFirst` results.
function isBaseRow(value: unknown): value is BaseRow {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const appointmentRepository = new AppointmentRepository(dbClient);
