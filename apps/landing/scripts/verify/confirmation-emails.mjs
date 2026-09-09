// Email-delivery evidence (issue #48): given the two booking ids from
// booking-e2e.mjs's BOOKINGS line, retrieve each confirmation email from the
// Resend API and assert delivery + the pinned content rules on the REAL
// artifact — exact from/subject, the money-free rule (no peso mark anywhere
// in the HTML), add-on name-only rows present (package) / the section
// omitted (service), the Notes row only when notes exist, and the CTA href
// built from LANDING_ORIGIN. Expectations are re-derived from the live API
// and the sent records — nothing about the emails is hard-coded here. Needs
// the REAL RESEND_API_KEY (the sandbox account is the delivery target) and
// the LANDING_ORIGIN value as sent — source both from apps/api/.dev.vars
// without printing them:
//   set -a; source <(grep -E '^(RESEND_API_KEY|LANDING_ORIGIN)=' apps/api/.dev.vars); set +a
//   E2E_CUSTOMER_EMAIL=<owner address> \
//     node apps/landing/scripts/verify/confirmation-emails.mjs <pkgId> <svcId>
// Exit 0 = both emails found, content proven, delivered. 1 = a check failed.
// 2 = the Resend list endpoint is unavailable on this account (machine
// evidence impossible — the owner's inbox check becomes the recorded proof).

const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const LANDING_ORIGIN = (process.env.LANDING_ORIGIN ?? '').replace(/\/+$/, '');
const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL ?? '';
const DELIVERY_TIMEOUT_MS = 90_000;
const POLL_MS = 3000;

if (!RESEND_API_KEY || !LANDING_ORIGIN || !CUSTOMER_EMAIL) {
  console.error(
    'usage: RESEND_API_KEY + LANDING_ORIGIN (source from apps/api/.dev.vars) and E2E_CUSTOMER_EMAIL are required; pass the two booking ids as argv'
  );
  process.exit(1);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// The builder's pinned semantics (apps/api services/confirmation-email.ts):
// en-PH / Asia/Manila, medium date + short time, then " (PHT)". Full-ICU
// Node only — never edit an expectation to match broken output.
const PH_DATE_TIME = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  dateStyle: 'medium',
  timeStyle: 'short',
});
const phDateTime = (iso) => `${PH_DATE_TIME.format(new Date(iso))} (PHT)`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const [pkgId, svcId] = process.argv.slice(2);
if (!UUID_RE.test(pkgId ?? '') || !UUID_RE.test(svcId ?? '')) {
  console.error('usage: confirmation-emails.mjs <packageBookingId> <serviceBookingId> (uuids)');
  process.exit(1);
}

async function resend(path) {
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw Object.assign(new Error(`Resend HTTP ${res.status}: ${body.slice(0, 200)}`), {
      status: res.status,
    });
  }
  return res.json();
}

async function listEmails() {
  try {
    const data = (await resend('/emails?limit=100')).data ?? [];
    // Newest first — on a re-run, the newest send with a given subject is
    // this run's (bookings are sequential; see the plan's retry note).
    return data.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      console.error(
        `RESEND LIST UNAVAILABLE (HTTP ${err.status}) — this account can't enumerate sends. ` +
          'Fall back: confirm both emails in the Resend dashboard / the owner inbox and record that as the proof (plan Task 2, Step 6 note).'
      );
      process.exit(2);
    }
    throw err;
  }
}

async function main() {
  const [pkgRecord, svcRecord, packages, services, branches] = await Promise.all([
    fetch(`${API}/api/v1/appointments/${pkgId}`).then((r) => r.json()),
    fetch(`${API}/api/v1/appointments/${svcId}`).then((r) => r.json()),
    fetch(`${API}/api/v1/service-packages`).then((r) => r.json()),
    fetch(`${API}/api/v1/studio-services`).then((r) => r.json()),
    fetch(`${API}/api/v1/branches`).then((r) => r.json()),
  ]);

  // Every displayed value derives from the stored snapshot + the same reads
  // the page uses — mirroring the builder's resolve-at-send-time rules.
  function expectation(record) {
    const offeringName =
      record.servicePackageId !== null
        ? packages.find((p) => p.id === record.servicePackageId)?.name
        : services.find((s) => s.id === record.studioServiceId)?.name;
    const branch = branches.find((b) => b.id === record.branchId);
    const when = phDateTime(record.scheduledAt);
    return {
      record,
      offeringName,
      branch,
      when,
      subject: `Booking scheduled: ${offeringName} — ${when}`,
      bookingUrl: `${LANDING_ORIGIN}/booking/${record.id}`,
    };
  }
  const expected = [
    { label: 'package', ...expectation(pkgRecord) },
    { label: 'service', ...expectation(svcRecord) },
  ];

  // Both sends may lag the 201 by the waitUntil scheduling — poll the list.
  let found;
  const deadline = Date.now() + DELIVERY_TIMEOUT_MS;
  do {
    const listed = await listEmails();
    found = expected.map((e) => ({
      ...e,
      listId:
        listed.find((m) => m.to.includes(CUSTOMER_EMAIL) && m.subject === e.subject)?.id ?? null,
    }));
    if (found.every((e) => e.listId)) break;
    await new Promise((r) => setTimeout(r, POLL_MS));
  } while (Date.now() < deadline);

  for (const e of found) {
    check(
      `${e.label} email found in the Resend list`,
      Boolean(e.listId),
      e.listId ??
        `no send to ${CUSTOMER_EMAIL} with subject "${e.subject}" within ${DELIVERY_TIMEOUT_MS / 1000}s`
    );
    if (!e.listId) continue;
    const email = await resend(`/emails/${e.listId}`);
    const html = email.html ?? '';
    check(
      `${e.label} email envelope: from, to, exact subject`,
      email.from === 'Sevendays Photography <onboarding@resend.dev>' &&
        email.to.includes(CUSTOMER_EMAIL) &&
        email.subject === e.subject,
      `${email.from} → ${email.to.join(', ')}`
    );
    check(
      `${e.label} email body: greeting, offering, branch + phone, schedule, footer`,
      html.includes(`Hi ${e.record.customerName}`) &&
        html.includes(e.offeringName) &&
        html.includes(e.branch.name) &&
        html.includes(`scheduled for ${e.when}`) &&
        html.includes(e.branch.phone) &&
        html.includes(
          `${e.record.customerName} · ${e.record.customerEmail} · ${e.record.customerPhone}`
        ),
      `subject "${email.subject}"`
    );
    check(
      `${e.label} email CTA href is ${e.bookingUrl}`,
      html.includes(`href="${e.bookingUrl}"`) && html.includes(e.bookingUrl)
    );
    const isPackage = e.record.servicePackageId !== null;
    const addonNames = e.record.addonServices.map((a) => a.name);
    check(
      isPackage
        ? `${e.label} email: add-on name-only rows present, money-free`
        : `${e.label} email: no add-on section, notes row present, money-free`,
      isPackage
        ? addonNames.length > 0 &&
            addonNames.every((n) => html.includes(n)) &&
            html.includes('Add-on') &&
            !html.includes('₱')
        : !html.includes('Add-on') &&
            html.includes('Notes') &&
            Boolean(e.record.notes) &&
            html.includes(e.record.notes) &&
            !html.includes('₱')
    );
    // Receipt: poll until Resend reports the delivered event.
    let last = email.last_event;
    const deliveryDeadline = Date.now() + DELIVERY_TIMEOUT_MS;
    while (
      last !== 'delivered' &&
      last !== 'bounced' &&
      last !== 'failed' &&
      Date.now() < deliveryDeadline
    ) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      last = (await resend(`/emails/${e.listId}`)).last_event;
    }
    check(`${e.label} email delivered`, last === 'delivered', `last_event ${last}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('EMAIL EVIDENCE ERROR:', e.message);
  process.exit(1);
});
