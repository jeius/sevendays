// psql-equivalent Appointment row probe (M1.5, Q1=A). Prints derived facts
// only — never a connection string. Modes:
//   confirm <appointmentId>  — assert the row + add-on join rows against
//                              expectations read from stdin (JSON)
//   delete  <appointmentId>  — delete the single row, re-assert absence
//   absent  <appointmentId>  — assert the row is gone
// Exit 0 = verified; exit 1 = mismatch/missing/error. Run from packages/db:
//   node --env-file=.env scripts/verify-appointment-row.mjs confirm <id>
import postgres from 'postgres';

const url = process.env.DATABASE_MIGRATE_URL;

export async function assertAppointmentRecord(sql, expected) {
  const rows = await sql`
    select id, branch_id, service_package_id, customer_name, customer_email,
           customer_phone, scheduled_at, status, kind, package_price_cents,
           notes, created_at, updated_at
    from appointments
    where id = ${expected.id}`;
  const row = rows[0];
  if (!row) return { ok: false, reason: 'not_found' };

  const addons = await sql`
    select a.addon_service_id, s.name, a.price_cents, a.created_at
    from appointment_addon_services a
    join addon_services s on s.id = a.addon_service_id
    where a.appointment_id = ${expected.id}
    order by a.created_at`;

  const checks = [];
  const push = (label, dbValue, expectedValue) => {
    checks.push({ label, ok: String(dbValue) === String(expectedValue) });
  };
  push('id', row.id, expected.id);
  push('branchId', row.branch_id, expected.branchId);
  push('servicePackageId', row.service_package_id, expected.servicePackageId);
  push('customerName', row.customer_name, expected.customerName);
  push('customerEmail', row.customer_email, expected.customerEmail);
  if (expected.customerPhone !== undefined) {
    push('customerPhone', row.customer_phone, expected.customerPhone);
  }
  push('kind', row.kind, expected.kind);
  push('status', row.status, expected.status);
  push('packagePriceCents', row.package_price_cents, expected.packagePriceCents);
  if (expected.scheduledAt !== undefined) {
    const dbIso =
      row.scheduled_at instanceof Date ? row.scheduled_at.toISOString() : String(row.scheduled_at);
    const expIso = new Date(expected.scheduledAt).toISOString();
    push('scheduledAt', dbIso, expIso);
  }

  const expectedAddons = expected.addonServices ?? [];
  push('addonCount', addons.length, expectedAddons.length);
  for (let i = 0; i < Math.min(addons.length, expectedAddons.length); i += 1) {
    push(
      `addon[${i}].addonServiceId`,
      addons[i].addon_service_id,
      expectedAddons[i].addonServiceId
    );
    push(`addon[${i}].name`, addons[i].name, expectedAddons[i].name);
    push(`addon[${i}].priceCents`, addons[i].price_cents, expectedAddons[i].priceCents);
  }

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? '[ok]' : '[MISMATCH]'} ${c.label}`);
  }
  console.log(
    failed.length === 0
      ? `CONFIRM: PASS — appointment ${expected.id} matches every expected value (${checks.length} checks)`
      : `CONFIRM: FAIL — ${failed.length} mismatch(es)`
  );
  return { ok: failed.length === 0, row, addons, failed };
}

export async function deleteAppointmentRow(sql, id) {
  // Cascade-safe: the junction FK is ON DELETE no action, so remove the
  // add-on join rows first, then the single appointment row.
  await sql`delete from appointment_addon_services where appointment_id = ${id}`;
  const result = await sql`
    delete from appointments where id = ${id} returning id`;
  const deleted = result.length === 1;
  console.log(deleted ? `DELETE: removed appointment ${id}` : `DELETE: no row with id ${id}`);
  return { deleted };
}

export async function assertAppointmentAbsent(sql, id) {
  const rows = await sql`select id from appointments where id = ${id}`;
  const joinRows = await sql`
    select a.addon_service_id from appointment_addon_services a where a.appointment_id = ${id}`;
  const absent = rows.length === 0 && joinRows.length === 0;
  console.log(
    absent
      ? `ABSENT: verified — no appointment row, no join rows for ${id}`
      : `ABSENT: FAIL — rows remain`
  );
  return { absent };
}

function printUsageAndExit() {
  console.error(
    'usage: node scripts/verify-appointment-row.mjs <confirm|delete|absent> <appointmentId>'
  );
  console.error('  confirm reads expectations JSON from stdin (the POST response body).');
  process.exit(1);
}

if (process.argv[1]?.endsWith('verify-appointment-row.mjs')) {
  const [mode, rawId] = process.argv.slice(2);
  if (!mode || !rawId) printUsageAndExit();
  let uuidOk = true;
  try {
    crypto.randomUUID();
    uuidOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
  } catch {
    uuidOk = false;
  }
  if (!uuidOk) {
    console.error('invalid appointment id (not a uuid)');
    process.exit(1);
  }
  if (!url) {
    console.error('DATABASE_MIGRATE_URL is not set (run scripts/check-env.mjs)');
    process.exit(1);
  }
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
  try {
    if (mode === 'confirm') {
      const stdin = await new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
          data += chunk;
        });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', reject);
      });
      let expected;
      try {
        expected = JSON.parse(stdin);
      } catch {
        console.error('stdin is not valid JSON (pass the saved POST response body)');
        process.exit(1);
      }
      const result = await assertAppointmentRecord(sql, expected);
      process.exit(result.ok ? 0 : 1);
    }
    if (mode === 'delete') {
      const result = await deleteAppointmentRow(sql, rawId);
      if (!result.deleted) process.exit(1);
      const absent = await assertAppointmentAbsent(sql, rawId);
      process.exit(absent.absent ? 0 : 1);
    }
    if (mode === 'absent') {
      const result = await assertAppointmentAbsent(sql, rawId);
      process.exit(result.absent ? 0 : 1);
    }
    printUsageAndExit();
  } finally {
    await sql.end({ timeout: 5 });
  }
}
