// Scripted CDP checks for the booking wizard /book (issue #45). READ-ONLY
// over the data: the one submit this scenario drives is a past-date booking
// the API REJECTS — no row is written (the happy path is Task 6's e2e
// script). Seeded-state notes: all four services bookable at all three
// branches, and only Portraits & ID Photo carries applicable add-ons —
// checks 6/7 lean on that (no-addons service ⇒ skip case is live-real;
// the matrix-equality check is vacuous-by-seed and says so).
import { connect } from './lib.mjs';

const LANDING = process.env.LANDING_VERIFY_URL ?? 'http://localhost:3000';
const API = process.env.API_VERIFY_URL ?? 'http://127.0.0.1:8787';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const peso = (cents) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
// PH wall-clock YYYY-MM-DD offset by N days from now (en-CA emits ISO order).
const phDate = (days) =>
  new Date(Date.now() + days * 86400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

async function main() {
  const [svcRes, pkgRes, addonRes, branchRes] = await Promise.all([
    fetch(`${API}/api/v1/studio-services`),
    fetch(`${API}/api/v1/service-packages`),
    fetch(`${API}/api/v1/addon-services`),
    fetch(`${API}/api/v1/branches`),
  ]);
  const services = await svcRes.json();
  const packages = await pkgRes.json();
  const addons = await addonRes.json();
  const branches = await branchRes.json();
  if (!services.length || !packages.length || !addons.length || !branches.length) {
    throw new Error('seed drift: wizard scenario needs non-empty catalog reads');
  }
  const _addonNames = (svc) =>
    addons.filter((a) => svc.applicableAddonServiceIds.includes(a.id)).map((a) => a.name);
  const svcNoAddons = services.find((s) => s.applicableAddonServiceIds.length === 0);
  const pkgWithAddons = packages[0]; // package ⇒ uniform (all active add-ons)
  const totalAddonsForPackage = addons.length;

  const page = await connect();
  const { go, evaluate, close } = page;
  const q = (sel) => JSON.stringify(sel);
  const click = async (sel) => evaluate(`document.querySelector(${q(sel)})?.click() ?? 'missing'`);
  const setInput = async (sel, value) =>
    evaluate(`
      (() => {
        const el = document.querySelector(${q(sel)});
        if (!el) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, ${q(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
  const stepText = (n) =>
    evaluate(`document.querySelector("section[data-step='${n}']")?.innerText ?? null`);

  // 1 — branch step renders the live branches
  await go(`${LANDING}/book`);
  const step1 = await stepText(1);
  check(
    'book: branch step renders every live branch',
    step1 !== null && branches.every((b) => step1.includes(b.name))
  );

  // 2 — ?service= filters the branch step to the re-derived bookable set
  const svcForFilter = services[0];
  const expectedBranches = branches.filter((b) => svcForFilter.bookableBranchIds.includes(b.id));
  await go(`${LANDING}/book?service=${svcForFilter.id}`);
  const step1Filtered = await stepText(1);
  const vacuous = expectedBranches.length === branches.length;
  check(
    'book: ?service= branch step equals the re-derived bookable set',
    step1Filtered !== null && expectedBranches.every((b) => step1Filtered.includes(b.name)),
    vacuous ? 'vacuous-by-seed: service bookable at every branch' : ''
  );

  // 3 — unknown deep-link ids drop silently (no error card, all branches)
  await go(
    `${LANDING}/book?branch=99999999-9999-4999-8999-999999999999&package=99999999-9999-4999-8999-999999999999`
  );
  const step1Clean = await stepText(1);
  const noCard = await evaluate(`document.querySelector('[data-rejection-card]') === null`);
  check(
    'book: stale deep-link ids drop silently',
    step1Clean !== null && branches.every((b) => step1Clean.includes(b.name)) && noCard
  );

  // 4 — branch pick auto-advances to the offering step (packages grid live)
  await go(`${LANDING}/book`);
  await click(`section[data-step='1'] button`);
  const step2 = await stepText(2);
  check(
    'book: branch pick auto-advances; packages grid renders live names',
    step2 !== null && packages.every((p) => step2.includes(p.name))
  );

  // 5 — offering step lists services bookable at the chosen branch
  const branchPicked = branches[0];
  const bookableHere = services.filter((s) => s.bookableBranchIds.includes(branchPicked.id));
  check(
    'book: offering step lists the re-derived services at the branch',
    bookableHere.every((s) => step2.includes(s.name)),
    `branch ${branchPicked.name}: ${bookableHere.length}/${services.length} bookable`
  );

  // 6 — a package lands on the add-ons step (uniform ⇒ live add-ons list)
  await click(`section[data-step='2'] button`);
  const step3 = await stepText(3);
  check(
    'book: package offering shows the add-ons step with every active add-on',
    step3 !== null && addons.every((a) => step3.includes(a.name))
  );

  // 7 — a service with no applicable add-ons skips straight to date/time
  await go(`${LANDING}/book?service=${svcNoAddons.id}`);
  await click(`section[data-step='1'] button`);
  await click(`section[data-step='2'] button[data-offering='${svcNoAddons.id}']`);
  const step4Direct = await stepText(4);
  const noStep3 = await evaluate(`document.querySelector("section[data-step='3']") === null`);
  check(
    'book: offering with no applicable add-ons skips to date/time',
    svcNoAddons.applicableAddonServiceIds.length === 0 && step4Direct !== null && noStep3,
    `service: ${svcNoAddons.name}`
  );

  // 8 — Back from date/time (skip case) returns to the OFFERING step
  await click('[data-back]');
  const step2Again = await stepText(2);
  check('book: Back from date/time (skip case) returns to the offering step', step2Again !== null);

  // 9/10 — past pick shows the inline hint; future pick clears it
  await click(`section[data-step='2'] button[data-offering='${svcNoAddons.id}']`); // re-choose the no-addons service
  await setInput(`section[data-step='4'] input[type='date']`, phDate(-1));
  await click(`section[data-step='4'] button`); // first hour chip
  const hintPast = await evaluate(`document.querySelector('[data-past-hint]') !== null`);
  check('book: past pick shows the inline already-passed hint', hintPast);
  await setInput(`section[data-step='4'] input[type='date']`, phDate(1));
  await click(`section[data-step='4'] button`);
  const hintGone = await evaluate(`document.querySelector('[data-past-hint]') === null`);
  check('book: future pick clears the hint', hintGone);

  // 11 — Continue reaches the contact step
  await click(`section[data-step='4'] > button`);
  const step5 = await stepText(5);
  check('book: date/time Continue reaches the contact step', step5 !== null);

  // 12 — contact gate: confirm disabled until the three fields are set
  const confirmSel = `section[data-step='5'] button[type='button']:last-of-type`;
  const disabledBefore = await evaluate(
    `document.querySelector(${q(confirmSel)})?.disabled ?? null`
  );
  await setInput(`section[data-step='5'] input[placeholder='Full name']`, 'Verify Bot');
  await setInput(`section[data-step='5'] input[placeholder='Email']`, 'verify@example.com');
  await setInput(`section[data-step='5'] input[placeholder='Phone (+63…)']`, '+63 917 000 0000');
  const disabledAfter = await evaluate(
    `document.querySelector(${q(confirmSel)})?.disabled ?? null`
  );
  check(
    'book: confirm gated on the three contact fields',
    disabledBefore === true && disabledAfter === false
  );

  // 13 — past-slot submit renders the typed rejection card (API 400; no row).
  // Back to date/time (wizard state persists — the fields stay filled), set
  // the past date, come back, confirm.
  await click('[data-back]');
  await setInput(`section[data-step='4'] input[type='date']`, phDate(-1));
  await click(`section[data-step='4'] button`);
  await click(`section[data-step='4'] > button`);
  await click(confirmSel);
  // Dev-stack server fns take ~2-3s (wrangler + SSR round-trip) — poll for
  // the card instead of a fixed sleep (a fixed 1.2s false-failed this check).
  let card = null;
  for (let i = 0; i < 20; i++) {
    await page.wait(500);
    card = await evaluate(`document.querySelector('[data-rejection-card]')?.innerText ?? null`);
    if (card !== null) break;
  }
  check(
    'book: past-slot submit renders the typed rejection card (friendly + API reason)',
    card !== null &&
      card.includes('already passed in the Philippines') &&
      card.includes('API reason:')
  );

  // 14 — the rail shows branch/offering/total derived from live data
  const pkg = pkgWithAddons;
  await go(`${LANDING}/book?package=${pkg.id}`);
  await click(`section[data-step='1'] button`);
  await click(`section[data-step='2'] button`);
  await click(`section[data-step='3'] button`); // select first add-on
  const rail = await evaluate(`document.querySelector('[data-summary-rail]')?.innerText ?? null`);
  const expectedTotal = pkg.priceCents + addons[0].priceCents;
  check(
    'book: rail runs the live total (offering + selected add-on)',
    rail?.includes('Your booking') &&
      rail.includes(peso(expectedTotal)) &&
      rail.includes(addons[0].name),
    `expected total ${peso(expectedTotal)} (${pkg.name} + ${addons[0].name}); uniform package add-ons: ${totalAddonsForPackage}`
  );

  close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('SCENARIO ERROR:', e.message);
  process.exit(1);
});
