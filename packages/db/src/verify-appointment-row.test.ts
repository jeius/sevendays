import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// Helpers under test are exported from the script; the import path keeps the
// script a plain ESM module so both the CLI and this test can load it.
async function loadProbe() {
  return import('../scripts/verify-appointment-row.mjs');
}

async function seedProbeFixtures(sql: postgres.Sql) {
  // Two catalog rows + one appointment + one add-on join — the minimal shape
  // confirm mode asserts. Insert with explicit uuids so expectations are stable.
  const [branch] = await sql`
    insert into branches (id, name, address, phone, accepts_walk_ins)
    values ('11111111-1111-4111-8111-111111111111', 'Probe Branch', 'Test Address', '+63 900 000 0000', false)
    returning id`;
  const [pkg] = await sql`
    insert into service_packages (id, name, description, price_cents)
    values ('22222222-2222-4222-8222-222222222222', 'Probe Package', 'Probe description', 150000)
    returning id`;
  const [addon] = await sql`
    insert into addon_services (id, name, description, price_cents)
    values ('33333333-3333-4333-8333-333333333333', 'Make-up', 'Probe add-on', 12000)
    returning id`;
  const [appt] = await sql`
    insert into appointments
      (id, branch_id, service_package_id, customer_name, customer_email, customer_phone,
       scheduled_at, status, kind, package_price_cents, notes)
    values
      ('44444444-4444-4444-8444-444444444444',
       ${branch?.id}, ${pkg?.id},
       'M1.5 Exit Verification', 'm15-verify@example.com', '+63 900 000 0000',
       '2026-09-15 10:00:00+08', 'pending', 'scheduled', 150000, 'probe row')
    returning id`;
  if (!branch || !pkg || !addon || !appt) {
    throw new Error('probe fixture seed failed: one or more inserts returned no row');
  }
  await sql`
    insert into appointment_addon_services (appointment_id, addon_service_id, price_cents)
    values (${appt.id}, ${addon.id}, 12000)`;
  return {
    appointmentId: appt.id as string,
    branchId: branch.id as string,
    packageId: pkg.id as string,
    addonId: addon.id as string,
  };
}

describe.skipIf(!TEST_DATABASE_URL)('verify-appointment-row probe (live compose db)', () => {
  let sql: postgres.Sql;
  let ids: Awaited<ReturnType<typeof seedProbeFixtures>>;

  beforeAll(async () => {
    sql = postgres(TEST_DATABASE_URL as string, { prepare: false, max: 1 });
    const { migrateDatabase } = await import('./migrate.js');
    await migrateDatabase(TEST_DATABASE_URL as string);
    ids = await seedProbeFixtures(sql);
  });

  afterAll(async () => {
    if (!ids) {
      await sql?.end({ timeout: 5 });
      return;
    }
    await sql`delete from appointment_addon_services where appointment_id = ${ids.appointmentId}`;
    await sql`delete from appointments where id = ${ids.appointmentId}`;
    await sql`delete from addon_services where id = ${ids.addonId}`;
    await sql`delete from service_packages where id = ${ids.packageId}`;
    await sql`delete from branches where id = ${ids.branchId}`;
    await sql.end({ timeout: 5 });
  });

  it('confirm mode: row exists, expected columns match', async () => {
    const probe = await loadProbe();
    const expected = {
      id: ids.appointmentId,
      branchId: ids.branchId,
      servicePackageId: ids.packageId,
      customerName: 'M1.5 Exit Verification',
      customerEmail: 'm15-verify@example.com',
      kind: 'scheduled',
      status: 'pending',
      packagePriceCents: 150000,
      notes: 'probe row',
      addonServices: [{ addonServiceId: ids.addonId, name: 'Make-up', priceCents: 12000 }],
    };
    await expect(probe.assertAppointmentRecord(sql, expected)).resolves.toMatchObject({
      ok: true,
    });
  });

  it('confirm mode: mismatched snapshot fails the assertion', async () => {
    const probe = await loadProbe();
    const expected = {
      id: ids.appointmentId,
      branchId: ids.branchId,
      servicePackageId: ids.packageId,
      customerName: 'M1.5 Exit Verification',
      customerEmail: 'm15-verify@example.com',
      kind: 'scheduled',
      status: 'pending',
      packagePriceCents: 999999,
      notes: 'wrong notes',
      addonServices: [{ addonServiceId: ids.addonId, name: 'Make-up', priceCents: 12000 }],
    };
    const result = await probe.assertAppointmentRecord(sql, expected);
    expect(result.ok).toBe(false);
    const failedLabels = (result.failed ?? []).map((c) => c.label);
    expect(failedLabels).toContain('notes');
    expect(failedLabels).toContain('packagePriceCents');
  });

  it('confirm mode: missing row reports not found', async () => {
    const probe = await loadProbe();
    const missing = '55555555-5555-4555-8555-555555555555';
    const result = await probe.assertAppointmentRecord(sql, {
      id: missing,
      branchId: ids.branchId,
      servicePackageId: ids.packageId,
      customerName: 'x',
      customerEmail: 'x@example.com',
      kind: 'scheduled',
      status: 'pending',
      packagePriceCents: 0,
      addonServices: [],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not_found');
  });

  it('delete + absent mode: row and join rows are removed', async () => {
    const probe = await loadProbe();
    await expect(probe.deleteAppointmentRow(sql, ids.appointmentId)).resolves.toMatchObject({
      deleted: true,
    });
    const gone = await probe.assertAppointmentAbsent(sql, ids.appointmentId);
    expect(gone.absent).toBe(true);
    // Junction rows are gone too — deleteAppointmentRow removes them
    // explicitly (the FK is ON DELETE no action, so no DB-side cascade).
    const joinRows =
      await sql`select * from appointment_addon_services where appointment_id = ${ids.appointmentId}`;
    expect(joinRows.length).toBe(0);
  });
});
