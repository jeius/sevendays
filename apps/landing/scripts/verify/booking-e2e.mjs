// MUTATING end-to-end (issue #45 AC 1; #48 extends it): drives two REAL
// bookings through /book — one package (with an add-on) and one studio
// service — against the live seeded stack, then reads each back through the
// public single-get AND its /booking/:id page, asserting the server snapshot
// (bookedPriceCents, add-on entries, status, notes) and the rendered
// read-back (ticket 08). Rows persist in the target db by design (tiny
// volume; the studio reconciles manually until M3 availability) — #48's live
// run books with E2E_CUSTOMER_EMAIL (the Resend sandbox delivers only to the
// account owner's address) and deletes its rows after the evidence is
// recorded (the M1.5 Q3=A ruling). Run at verification time:
//   E2E_CUSTOMER_EMAIL=<owner address> node apps/landing/scripts/verify/booking-e2e.mjs
//
// The final BOOKINGS line is machine-parseable — confirmation-emails.mjs and
// the packages/db row probe take the two ids from it.
//
// Controller-ruled deviations from the plan snippet (mirroring the Task 5
// scenario fixes, live-proven there): (1) step-4 Continue is
// `section[data-step='4'] > button` — `button:last-of-type` matches the last
// hour chip per CSS per-parent semantics; (2) step-3 Continue is
// `section[data-step='3'] > button` for the same reason (the add-on cards
// are buttons inside a sibling grid div); (3) fillContactAndConfirm polls
// location.pathname for /booking/<uuid> instead of a fixed 1.5s wait — the
// dev server-fn round-trip measured ~2.6s (Task 5 check 13).
import { connect } from './lib.mjs';

const LANDING = process.env.LANDING_VERIFY_URL ?? 'http://localhost:3000';
const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';

// Recipient for both confirmation emails (#48). The sandbox 403s every other
// address, so the live email run books with the account owner's address; the
// default keeps prior (compose) run behavior unchanged.
const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL ?? 'e2e@example.com';
// The service booking carries notes so the real email proves the
// Notes-row-only-when-non-null rule on a live artifact (the package booking
// stays notes-less and proves the opposite side).
const SERVICE_NOTES = 'E2E verification booking — safe to discard.';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}
const peso = (cents) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
const phDate = (days) =>
  new Date(Date.now() + days * 86400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

async function main() {
  const [pkgRes, svcRes, addonRes, branchRes] = await Promise.all([
    fetch(`${API}/api/v1/service-packages`),
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/addon-services`),
    fetch(`${API}/api/v1/branches`),
  ]);
  const packages = await pkgRes.json();
  const services = await svcRes.json();
  const addons = await addonRes.json();
  const branches = await branchRes.json();
  const pkg = packages[0];
  const svc = services.find((s) => s.applicableAddonServiceIds.length === 0);
  const branch = branches[0];

  const page = await connect();
  const { go, evaluate, wait, close } = page;
  const q = (s) => JSON.stringify(s);
  const click = async (sel) => evaluate(`document.querySelector(${q(sel)})?.click() ?? 'missing'`);
  const setInput = async (sel, value) =>
    evaluate(`
      (() => {
        const el = document.querySelector(${q(sel)});
        if (!el) return false;
        const proto =
          el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, ${q(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
  async function fillContactAndConfirm(notes = '') {
    await setInput(`section[data-step='5'] input[placeholder='Full name']`, 'E2E Booking');
    await setInput(`section[data-step='5'] input[placeholder='Email']`, CUSTOMER_EMAIL);
    await setInput(`section[data-step='5'] input[placeholder='Phone (+63…)']`, '+63 917 000 0000');
    if (notes) await setInput(`section[data-step='5'] textarea`, notes);
    await click(`section[data-step='5'] button[type='button']:last-of-type`);
    // Dev server-fn round-trip ≈ 2.6s — poll for the redirect (check-13 precedent).
    for (let i = 0; i < 20; i++) {
      await wait(500);
      const path = await evaluate(`location.pathname`);
      if (/^\/booking\//.test(path)) return path;
    }
    return evaluate(`location.pathname`);
  }
  async function pickDate() {
    await setInput(`section[data-step='4'] input[type='date']`, phDate(2));
    await click(`section[data-step='4'] button`); // first chip
    await click(`section[data-step='4'] > button`); // Continue
  }

  // Booking 1 — package + first add-on
  await go(`${LANDING}/book?package=${pkg.id}&branch=${branch.id}`);
  await click(`section[data-step='1'] button`); // branch (prefilled, confirm the pick)
  await click(`section[data-step='2'] button[data-offering='${pkg.id}']`); // the preselected package card
  await click(`section[data-step='3'] button`); // first add-on
  await click(`section[data-step='3'] > button`); // Continue · total
  await pickDate();
  const pkgPath = await fillContactAndConfirm();
  check(
    'package booking redirects to /booking/:id',
    /^\/booking\/[0-9a-f-]{36}$/.test(pkgPath),
    pkgPath
  );
  const pkgId = pkgPath?.split('/').pop();
  const pkgRes2 = await fetch(`${API}/api/v1/appointments/${pkgId}`);
  const pkgRecord = await pkgRes2.json();
  check(
    'package booking snapshot: pending, package ref, booking-time price',
    pkgRecord?.status === 'pending' &&
      pkgRecord?.servicePackageId === pkg.id &&
      pkgRecord?.studioServiceId === null &&
      pkgRecord?.bookedPriceCents === pkg.priceCents,
    `bookedPriceCents ${pkgRecord?.bookedPriceCents} vs live ${pkg.priceCents}`
  );
  check(
    'package booking carries the selected add-on with snapshot price',
    pkgRecord?.addonServices?.length === 1 &&
      pkgRecord.addonServices[0].addonServiceId === addons[0].id &&
      pkgRecord.addonServices[0].priceCents === addons[0].priceCents
  );
  // Ticket 08: the read-back page is live — assert the rendered snapshot
  // (names joined from the sibling reads; prices from the record only).
  // React SSR splits interpolated text nodes with <!-- --> markers, so
  // strip them before plain-substring matching (live-run finding).
  const stripSsrMarkers = (html) => html.replace(/<!-- -->/g, '');
  const confHtml = stripSsrMarkers(await (await fetch(`${LANDING}${pkgPath}`)).text());
  const expectedTotal = peso(
    pkgRecord.bookedPriceCents + pkgRecord.addonServices.reduce((s, a) => s + a.priceCents, 0)
  );
  check(
    'package read-back renders the booked snapshot (heading, names, PHT schedule, snapshot total, email line)',
    confHtml.includes('Booking confirmed ✓') &&
      confHtml.includes(pkg.name) &&
      confHtml.includes(branch.name) &&
      confHtml.includes(addons[0].name) &&
      confHtml.includes(expectedTotal) &&
      confHtml.includes('(PHT)') &&
      confHtml.includes(`A confirmation email was sent to ${CUSTOMER_EMAIL}.`) &&
      confHtml.includes('Need to change something? Call the branch.'),
    `expected total ${expectedTotal}`
  );

  // Booking 2 — studio service (no applicable add-ons ⇒ skips the step)
  await go(`${LANDING}/book?service=${svc.id}&branch=${branch.id}`);
  await click(`section[data-step='1'] button`);
  await click(`section[data-step='2'] button[data-offering='${svc.id}']`);
  await pickDate();
  const svcPath = await fillContactAndConfirm(SERVICE_NOTES);
  check(
    'service booking redirects to /booking/:id',
    /^\/booking\/[0-9a-f-]{36}$/.test(svcPath),
    svcPath
  );
  const svcId = svcPath?.split('/').pop();
  const svcRecord = await (await fetch(`${API}/api/v1/appointments/${svcId}`)).json();
  check(
    'service booking snapshot: service ref, exactly-one, snapshot price, notes',
    svcRecord?.studioServiceId === svc.id &&
      svcRecord?.servicePackageId === null &&
      svcRecord?.bookedPriceCents === svc.priceCents &&
      svcRecord?.addonServices?.length === 0 &&
      svcRecord?.notes === SERVICE_NOTES
  );

  // Ticket 08: the service read-back — no add-on rows render when the
  // booking carries none (the page's 'Add-on' rows are the only source of
  // that string).
  const svcHtml = stripSsrMarkers(await (await fetch(`${LANDING}${svcPath}`)).text());
  check(
    'service read-back renders the booked snapshot with no add-on rows',
    svcHtml.includes('Booking confirmed ✓') &&
      svcHtml.includes(svc.name) &&
      svcHtml.includes(branch.name) &&
      !svcHtml.includes('Add-on') &&
      svcHtml.includes(peso(svcRecord.bookedPriceCents))
  );

  close();
  console.log(
    `BOOKINGS ${JSON.stringify({
      customerEmail: CUSTOMER_EMAIL,
      bookings: [
        { kind: 'package', id: pkgId },
        { kind: 'service', id: svcId },
      ],
    })}`
  );
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('E2E ERROR:', e.message);
  process.exit(1);
});
