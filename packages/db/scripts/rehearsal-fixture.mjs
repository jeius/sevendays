// M1.5 rehearsal fixture (throwaway tooling): inserts one appointment + one
// add-on join into the COMPOSE database only. Never points at Supabase —
// it reads TEST_DATABASE_URL and refuses to run without it.
import postgres from 'postgres';

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error('TEST_DATABASE_URL is not set — this fixture only ever runs against compose.');
  process.exit(1);
}
if (/supabase/i.test(url)) {
  console.error('refusing: TEST_DATABASE_URL looks like a Supabase URL');
  process.exit(1);
}
const sql = postgres(url, { prepare: false, max: 1 });
await sql`delete from appointment_addon_services where appointment_id in (select id from appointments where customer_name = 'M1.5 Rehearsal')`;
await sql`delete from appointments where customer_name = 'M1.5 Rehearsal'`;
await sql`delete from addon_services where name = 'Rehearsal Add-on'`;
await sql`delete from service_packages where name = 'Rehearsal Package'`;
await sql`delete from branches where name = 'Rehearsal Branch'`;

const [branch] = await sql`
  insert into branches (name, address, phone, accepts_walk_ins)
  values ('Rehearsal Branch', 'Rehearsal Address', '+63 900 000 000', false) returning *`;
const [pkg] = await sql`
  insert into service_packages (name, description, price_cents)
  values ('Rehearsal Package', 'Rehearsal description', 99000) returning *`;
const [addon] = await sql`
  insert into addon_services (name, description, price_cents)
  values ('Rehearsal Add-on', 'Rehearsal add-on', 6000) returning *`;
const [appt] = await sql`
  insert into appointments
    (branch_id, service_package_id, customer_name, customer_email, customer_phone,
     scheduled_at, status, kind, package_price_cents, notes)
  values (${branch.id}, ${pkg.id}, 'M1.5 Rehearsal', 'rehearsal@example.com', '+63 900 000 000',
          '2026-10-01 09:00:00+08', 'pending', 'scheduled', 99000, 'rehearsal')
  returning id`;
// The probe's confirm mode asserts the add-on join rows too — the fixture
// must create the same shape the API's POST writes (plan T2 defect: the
// original rehearsal fixture omitted this insert, so addonCount mismatched).
await sql`
  insert into appointment_addon_services (appointment_id, addon_service_id, price_cents)
  values (${appt.id}, ${addon.id}, 6000)`;

console.log(
  JSON.stringify({
    id: appt.id,
    branchId: branch.id,
    servicePackageId: pkg.id,
    customerName: 'M1.5 Rehearsal',
    customerEmail: 'rehearsal@example.com',
    customerPhone: '+63 900 000 000',
    scheduledAt: new Date('2026-10-01T01:00:00.000Z').toISOString(),
    status: 'pending',
    kind: 'scheduled',
    packagePriceCents: 99000,
    notes: 'rehearsal',
    addonServices: [{ addonServiceId: addon.id, name: 'Rehearsal Add-on', priceCents: 6000 }],
  })
);
await sql.end({ timeout: 5 });
