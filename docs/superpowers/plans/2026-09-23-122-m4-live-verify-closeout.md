# M4 Live Verify + v1 Picks + Docs Rotation (#122) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Milestone 4 by proving the auth surface live (secrets on all four Worker targets, login + gating + revocation on the teaser, login on `v1`), then rotating the docs to the integrated posture.

**Architecture:** No source code changes — this ticket is live operations plus docs. First repair the two broken `BETTER_AUTH_SECRET` puts on the api Workers (recon finding: they landed empty and currently 500 every `/api/v1/*` request on both editions), then reset the staff user's password via the documented provisioning path, run the milestone gate as curl probes against the deployed Workers with the session row checked in Postgres, then rotate five docs surfaces and land the close-out PR — whose own AGENTS/tech-stack/CONTEXT hunks are picked to `v1` as the ticket's final act.

**Tech Stack:** Cloudflare Workers (wrangler CLI, OAuth-authenticated as the owner), BetterAuth 1.7.5 HTTP surface (`/api/auth/*`), Supabase Postgres via `packages/db` (migrate URL), curl, GitHub CLI.

**Spec:** GitHub issue #122 (this ticket); M4 spec issue #117 § "Verification (the milestone gate)" + § "v1 edition posture (picks)"; the v1-picks runbook `docs/agents/v1-picks.md`; provisioning runbook `docs/staff-provisioning.md`.

## Recon state this plan starts from (verified live 2026-09-23, pre-plan)

- **All four `BETTER_AUTH_SECRET` puts exist** (`wrangler secret list` shows the name on `sevendays-admin`, `sevendays-api`, `sevendays-v1-admin`, `sevendays-v1-api`), and both GitHub environments carry `BETTER_AUTH_URL` + `API_URL` vars with `DATABASE_URL` secrets — the workflow wiring from #118 is complete.
- **The two ADMIN puts work**: `GET /api/auth/ok` → `200 {"ok":true}` on both editions, and a wrong-password sign-in returns the generic `401 {"code":"INVALID_EMAIL_OR_PASSWORD","message":"Invalid email or password"}` — which proves secret + DB + BetterAuth are functional on both admin Workers.
- **The two API puts are BROKEN (landed empty)**: every `/api/v1/*` request on both api Workers returns `500 {"error":"Internal server error."}` — including v1's absent routes, which must answer `404 {"error":"Not found."}` (live-verified green at the #121 pick the same morning). Mechanism: `apps/api/src/env.ts:19` carries `BETTER_AUTH_SECRET: z.string().min(1).optional()` — `undefined` passes (optional), an empty string fails `min(1)` — and `acquireDb` (`apps/api/src/routes/v1.ts:19-22`) runs `parseEnv` for **every** `/api/v1/*` request ahead of routing, so the throw lands in the root `onError` as the uniform 500. `/health` sits outside `v1` and stays 200. The `#121` progress bullet documents the *dormant-window* shape (branches 200 / bogus 404 / appointments 500); the live state exceeds it (all three 500), which is only consistent with parseEnv throwing — i.e. the put value is empty.
- **All four M4 v1-picks are already executed with ledger rows** (#118 → `70ba992`, #119 → `624b424`, #120 → `199aad7`, #121 → `bd066eb`, ledger tail in `docs/agents/v1-picks.md`). The ticket's AC "all M4 PRs triaged" is satisfied; what remains of the v1 leg is the live login check + the 404-by-absence confirmation. The v1 checkout `~/Projects/sevendays-v1-seed` is clean on `v1` at `bd066eb`.
- **The staff user's password is lost**: #119 provisioned `owner@sevendays.test` interactively (agent-session password, deliberately never recorded); #120 provisioned a second user `login-ui@sevendays.test` the same way. Neither password survives. The gate therefore runs the documented reset path (delete row + re-provision) for `owner@sevendays.test` and deletes the leftover `login-ui@sevendays.test` row as cleanup.
- Working tree at plan time: clean (`main` at `f584a76`); the session-start `routeTree.gen.ts` modification was transient and is gone.

## Global Constraints

- **Live targets (copy the URLs from here, never retype them):**
  - Teaser admin: `https://sevendays-admin.pahamajulius.workers.dev`
  - Teaser api: `https://sevendays-api.pahamajulius.workers.dev`
  - v1 admin: `https://sevendays-v1-admin.pahamajulius.workers.dev`
  - v1 api: `https://sevendays-v1-api.pahamajulius.workers.dev`
- **Pinned response literals** (assert these exact bodies; they come from the shipped code, already recon-verified live):
  - Ok probe: `200 {"ok":true}` (admin Workers only — the api exposes `/health` `{"status":"ok"}`, not an ok probe).
  - Auth 401 envelope: `401 {"error":"Authentication required."}` (api, gated list).
  - Uniform 404: `404 {"error":"Not found."}` (api, absent routes incl. v1's `/api/v1/appointments`).
  - Generic bad credentials: `401 {"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"}` (admin Workers).
  - Uniform 500 (the broken state): `500 {"error":"Internal server error."}`.
  - Shell gate redirect: `307` with `location: /login?redirect=%2F` for a signed-out `GET /` on the teaser admin.
- **The shared secret never appears in output, files that get committed, or the transcript.** It is 44 chars, lives in gitignored `apps/admin/.env.local` + `apps/api/.dev.vars`, and is moved shell-var → `wrangler secret put` stdin via `printf '%s'` (no trailing newline, never `echo`). Session tokens and passwords in evidence output: lengths and `true/false` booleans only (the #119 driver rule).
- **`wrangler` is OAuth-authenticated as the owner** (recon-verified: `pahamajulius@gmail.com`, workers write scope). Secret puts run from `apps/api` as `pnpm exec wrangler secret put <NAME> --name <worker>`. A changed secret value is live immediately — **no redeploy is needed**.
- **BetterAuth's rate limiter is on (3 requests / 10 s per sensitive endpoint, database-backed)**: every `POST /api/auth/sign-in/email` or `/api/auth/sign-out` in this plan is preceded by `sleep 10` unless the previous auth call was >10 s earlier. A `429` means wait 10 s and retry — it is the limiter working, not a failure.
- **The booking floor is the past-datetime instant**: the gate's `scheduledAt` is computed now-relative (`date -u -d '+7 days'`), never a hard-coded date.
- **No source-code changes in this ticket.** Files touched: `docs/*`, `AGENTS.md`, CONTEXT files, Worker secrets, live rows. If a gate step seems to need a code edit, stop — that is a defect to report, not a change to make.
- **Docs house rules:** checklist ticks are `- [✅]`; `docs/progress.md` and `docs/plan.md` are main-only (never picked); the new AGENTS/tech-stack/CONTEXT prose in Task 5 is written **edition-free** (no "v1"/"teaser"/"v2" naming) so Task 6's pick applies it clean.
- **House gates:** `pnpm check` from the repo root on the docs commit — expected `35/35` tasks green (the `admin#test` no-op warning is known noise); `pnpm build` `7/7`. Docs-only changes are turbo-cached but still run.
- `.scratch/` is gitignored — gate artifacts (password, tokens, fixture, evidence) live there with `umask 077`, and are deleted at close-out (Task 6 Step 9).
- **Scope fences ("not here"):** no appointments-dashboard work (v2), no CMS work (M5), no CI/workflow edits (the wiring landed at #118 and is verified green), no new picks beyond the ticket's own docs split, no `v1` hot-fixes. Tasks 1–4 record evidence into `.scratch/122-gate-evidence.md`; Tasks 5–6 consume it.

---

### Task 1: Repair the two broken api `BETTER_AUTH_SECRET` puts

**Files:**
- Modify: nothing in the repo — Cloudflare Worker secrets on `sevendays-api` + `sevendays-v1-api`
- Create: `.scratch/122-gate-evidence.md` (gitignored evidence log)

**Interfaces:**
- Consumes: the shared 44-char secret in gitignored `apps/admin/.env.local` (key `BETTER_AUTH_SECRET`); wrangler OAuth (owner).
- Produces: both api Workers parsing env again — the precondition every later gate step depends on (Task 2's fixture harvest reads the public list endpoints; Tasks 3–4 assert 401/404 envelopes).

- [ ] **Step 1: Open the evidence log**

```bash
cd /home/jeius/Projects/sevendays
mkdir -p .scratch && umask 077
cat > .scratch/122-gate-evidence.md <<'EOF'
# #122 gate evidence (scratch, gitignored)

## Task 1 — api secret repair
EOF
```

- [ ] **Step 2: Re-put `BETTER_AUTH_SECRET` on the teaser api**

One Bash invocation — the secret moves var→stdin without ever printing:

```bash
cd /home/jeius/Projects/sevendays
SECRET=$(node -e "
const fs = require('fs');
const m = fs.readFileSync('apps/admin/.env.local','utf8').match(/^BETTER_AUTH_SECRET=(.+)$/m);
if (!m) { console.error('BETTER_AUTH_SECRET missing from apps/admin/.env.local'); process.exit(1); }
process.stdout.write(m[1].trim());
")
if [ "${#SECRET}" -lt 32 ]; then echo "secret is only ${#SECRET} chars — refusing"; exit 1; fi
echo "secret loaded: ${#SECRET} chars (value not shown)"
cd apps/api
printf '%s' "$SECRET" | pnpm exec wrangler secret put BETTER_AUTH_SECRET --name sevendays-api
```

Expected: `✨ Success! 🌀 Creating the secret for the Worker sevendays-api` (an "updated"/overwrite phrasing is equally fine — the name already exists). The new value is live immediately.

- [ ] **Step 3: Verify the teaser api recovered — all three probes**

```bash
for path in branches bogus-xyz appointments; do
  printf '/api/v1/%s → ' "$path"
  curl -sS -m 20 -w ' [%{http_code}]\n' "https://sevendays-api.pahamajulius.workers.dev/api/v1/$path"
done
```

Expected, in order: `branches` → the seeded 3-branch JSON array `[200]`; `bogus-xyz` → `{"error":"Not found."} [404]`; `appointments` → `{"error":"Authentication required."} [401]`. The 401 is `requireSession` live with a working secret — the milestone's core posture, already proven before the gate proper.

- [ ] **Step 4: Re-put on the v1 api and verify**

```bash
cd /home/jeius/Projects/sevendays
SECRET=$(node -e "
const fs = require('fs');
const m = fs.readFileSync('apps/admin/.env.local','utf8').match(/^BETTER_AUTH_SECRET=(.+)$/m);
if (!m) { console.error('BETTER_AUTH_SECRET missing from apps/admin/.env.local'); process.exit(1); }
process.stdout.write(m[1].trim());
")
if [ "${#SECRET}" -lt 32 ]; then echo "secret is only ${#SECRET} chars — refusing"; exit 1; fi
cd apps/api
printf '%s' "$SECRET" | pnpm exec wrangler secret put BETTER_AUTH_SECRET --name sevendays-v1-api
for path in branches bogus-xyz appointments; do
  printf 'v1 /api/v1/%s → ' "$path"
  curl -sS -m 20 -w ' [%{http_code}]\n' "https://sevendays-v1-api.pahamajulius.workers.dev/api/v1/$path"
done
```

Expected: `branches` → 3-branch array `[200]`; `bogus-xyz` → `{"error":"Not found."} [404]`; `appointments` → `{"error":"Not found."} [404]` — **404-by-absence restored** (v1 has no appointments route to gate; the middleware's first v1 consumer is M5).

- [ ] **Step 5: Record evidence**

Append the actual probe outputs (values verbatim) under the Task 1 heading:

```bash
cd /home/jeius/Projects/sevendays
cat >> .scratch/122-gate-evidence.md <<'EOF'
Put re-executed on sevendays-api + sevendays-v1-api (source: apps/admin/.env.local,
44 chars, value never printed). Post-put probes (2026-09-23):
<paste the six probe lines from Steps 3–4>
Diagnosis recorded: the prior puts landed empty — envSchema's min(1) threw inside
acquireDb for every /api/v1 request (uniform 500 incl. v1's 404-by-absence routes,
/health unaffected, both admin Workers fully working). Repair verified by the
probes above.
EOF
```

**Not here:** no redeploy (secrets are live immediately), no CI edits, no teaser-admin/v1-admin secret puts (their values already work — recon-proven by the generic-401 probes; if Task 3 Step 6 ever suggests otherwise, that ticket's fallback step handles it).

### Task 2: Reset the staff user via the documented path + stage the gate fixtures

**Files:**
- Modify: live Postgres rows (`user`/`session`/`account` for `owner@sevendays.test`; `login-ui@sevendays.test` is deleted in Task 3's cleanup, not here)
- Create: `.scratch/122-staff-pass`, `.scratch/122-gate-fixture.json`

**Interfaces:**
- Consumes: Task 1's repaired public endpoints (fixture harvest); `packages/db/.env`'s `DATABASE_MIGRATE_URL`; the #119-proven interactive-pty driver pattern (`.superpowers/sdd/2026-09-22-119-admin-auth-server/task5-step3d.sh` — the ruling: this CLI's password prompt requires TRUE interactive typing; piped stdin doubles the password).
- Produces: a known-password `owner@sevendays.test` (role `admin`) whose password is in `.scratch/122-staff-pass` (0600, gitignored); a valid booking fixture `.scratch/122-gate-fixture.json` consumed verbatim by Task 3 Step 7.

- [ ] **Step 1: Delete the stale user row (runbook reset step 1)**

```bash
cd /home/jeius/Projects/sevendays/packages/db && node --env-file=.env -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_MIGRATE_URL);
const gone = await sql\`delete from \"user\" where email = 'owner@sevendays.test'\`;
console.log('deleted', gone.count, 'user row(s); sessions and accounts cascaded');
await sql.end();
"
```

Expected: `deleted 1 user row(s); sessions and accounts cascaded` (the FKs are `on delete cascade` — `docs/staff-provisioning.md` § Resetting).

- [ ] **Step 2: Re-provision through the real CLI via the interactive-pty driver**

One Bash invocation. The password is generated, stored 0600 in scratch, and fed to the CLI's prompt through a pty with echo off — the #119/#120-proven driver, with the two-flag confirmation handling (#120's variant, needed because `login-ui@sevendays.test` still exists and triggers the CLI's existing-users confirmation):

```bash
set -o pipefail
cd /home/jeius/Projects/sevendays
umask 077
export STAFF_PASS=$(openssl rand -base64 18)
printf '%s' "$STAFF_PASS" > .scratch/122-staff-pass
echo "password generated: ${#STAFF_PASS} chars (value only in .scratch/122-staff-pass)"
python3 - <<'PY'
import os, pty, select, subprocess, sys, termios, time

password = os.environ["STAFF_PASS"]
cmd = ["pnpm", "--filter", "@sevendays/admin", "create-staff",
       "--email", "owner@sevendays.test", "--name", "Studio Owner"]

master, slave = pty.openpty()
attrs = termios.tcgetattr(slave)
attrs[3] &= ~termios.ECHO                      # the password never echoes
termios.tcsetattr(slave, termios.TCSANOW, attrs)

p = subprocess.Popen(cmd, stdin=slave, stdout=slave, stderr=slave, close_fds=True)
os.close(slave)

confirm_fed, pass_fed = False, False
deadline = time.time() + 240
while time.time() < deadline:
    r, _, _ = select.select([master], [], [], 1.0)
    if master in r:
        try:
            chunk = os.read(master, 4096)
        except OSError:
            break
        if not chunk:
            break
        text = chunk.decode("utf-8", "replace")
        sys.stdout.write(text); sys.stdout.flush()
        low = text.lower()
        if not confirm_fed and ("already exist" in low or "y/n" in low):
            time.sleep(0.5); os.write(master, b"y\r"); confirm_fed = True
        if not pass_fed and "password" in low:
            time.sleep(0.5); os.write(master, password.encode() + b"\r"); pass_fed = True
    elif p.poll() is not None:
        break
try:
    rc = p.wait(timeout=60)
except subprocess.TimeoutExpired:
    p.kill()
    rc = 1
sys.exit(rc)
PY
PROVISION_RC=$?
echo "provisioner exit: $PROVISION_RC"
[ "$PROVISION_RC" -eq 0 ] || { echo "PROVISIONING FAILED"; exit 1; }
```

Expected: `provisioner exit: 0`, the CLI's confirmation answered with `y` (users exist — `login-ui@sevendays.test` is still live), masked password accepted, user created. If exit is non-zero, re-run Step 1 (the partial row must not survive) and retry once; two failures → stop and report (the fallback is the owner running `create-staff` interactively per `docs/staff-provisioning.md`).

- [ ] **Step 3: Verify the row exists with the expected shape**

```bash
cd /home/jeius/Projects/sevendays/packages/db && node --env-file=.env -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_MIGRATE_URL);
const rows = await sql\`select email, name, role, email_verified from \"user\" where email = 'owner@sevendays.test'\`;
console.log(JSON.stringify(rows));
await sql.end();
"
```

Expected: `[{"email":"owner@sevendays.test","name":"Studio Owner","role":"admin","email_verified":true}]` (column naming follows the generated BetterAuth schema — snake_case in Postgres; if a key renders camelCase, that is equally valid, assert on the values).

- [ ] **Step 4: Stage the booking fixture from the repaired public endpoints**

```bash
cd /home/jeius/Projects/sevendays
BRANCH_ID=$(curl -sS -m 20 https://sevendays-api.pahamajulius.workers.dev/api/v1/branches | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
PKG_ID=$(curl -sS -m 20 https://sevendays-api.pahamajulius.workers.dev/api/v1/service-packages | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
WHEN=$(date -u -d '+7 days' -Iseconds)
umask 077
python3 - "$BRANCH_ID" "$PKG_ID" "$WHEN" <<'PY' > .scratch/122-gate-fixture.json
import json, sys
print(json.dumps({
  "branchId": sys.argv[1],
  "servicePackageId": sys.argv[2],
  "scheduledAt": sys.argv[3],
  "customerName": "M4 Gate Check",
  "customerEmail": "m4-gate@sevendays.test",
  "customerPhone": "+63 900 000 001",
}))
PY
cat .scratch/122-gate-fixture.json
```

Expected: printed JSON with two distinct uuids and an ISO timestamp 7 days in the future (now-relative — the past-datetime floor would reject a stale date with a typed 400). `addonServiceIds` and `notes` stay omitted (schema defaults). The `m4-gate@sevendays.test` recipient makes the confirmation-email attempt fail harmlessly at Resend (sandbox 403) — logged, booking stands (the #47 fire-and-forget ruling).

**Not here:** no `login-ui@sevendays.test` changes (Task 3 cleanup deletes it); no admin-Worker secret puts (their values already work); the password is never echoed, committed, or placed outside `.scratch/`.

### Task 3: The teaser live gate — the milestone verification

**Files:**
- Create: `.scratch/122-gate-token`, `.scratch/122-gate-cookie`, `.scratch/122-signin-body.json` (0600)
- Modify: live rows (one gate booking created then deleted; `login-ui@sevendays.test` deleted)

**Interfaces:**
- Consumes: `.scratch/122-staff-pass` (Task 2), `.scratch/122-gate-fixture.json` (Task 2), Task 1's repaired teaser api.
- Produces: the evidence block in `.scratch/122-gate-evidence.md` that Task 5's progress bullet quotes; the gate booking id `.scratch/122-booking-id` (short-lived, deleted in Step 10).

- [ ] **Step 1: Ok probe**

```bash
curl -sS -m 20 -w ' [%{http_code}]\n' https://sevendays-admin.pahamajulius.workers.dev/api/auth/ok
```

Expected: `{"ok":true} [200]`.

- [ ] **Step 2: Shell gate live — signed-out `/` bounces to login**

```bash
curl -sS -o /dev/null -m 20 -w '%{http_code} %{redirect_url}\n' https://sevendays-admin.pahamajulius.workers.dev/
curl -sS -o /dev/null -m 20 -w '%{http_code}\n' https://sevendays-admin.pahamajulius.workers.dev/login
```

Expected: first line `307 https://sevendays-admin.pahamajulius.workers.dev/login?redirect=%2F` (the `_shell` beforeLoad gate live, aimed URL preserved); second line `200` (the login page serves).

- [ ] **Step 3: Wrong password fails generically**

```bash
sleep 10
curl -sS -m 20 -w '\n[%{http_code}]\n' -X POST https://sevendays-admin.pahamajulius.workers.dev/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d '{"email":"owner@sevendays.test","password":"definitely-wrong-password-123"}'
```

Expected: `{"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"}` `[401]` — the generic response; nothing names which field was wrong (story 5).

- [ ] **Step 4: Sign in with the CLI-provisioned user — harvest token + cookie**

```bash
cd /home/jeius/Projects/sevendays
sleep 10
PASS=$(cat .scratch/122-staff-pass)
umask 077
curl -sS -m 20 -D /tmp/122-signin-headers \
  -o .scratch/122-signin-body.json \
  -w '[%{http_code}]\n' \
  -X POST https://sevendays-admin.pahamajulius.workers.dev/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d "{\"email\":\"owner@sevendays.test\",\"password\":\"$PASS\"}"
grep -io '^set-cookie: __secure-better-auth\.session_token=[^;]\{0,12\}' /tmp/122-signin-headers && echo '(cookie name + 12-char prefix shown, value redacted)'
python3 -c 'import json;d=json.load(open(".scratch/122-signin-body.json"));print("body token present:", bool(d.get("token")), "| user email:", d["user"]["email"])'
TOKEN=$(python3 -c 'import json;print(json.load(open(".scratch/122-signin-body.json"))["token"])')
printf '%s' "$TOKEN" > .scratch/122-gate-token
grep -io '^set-cookie: __secure-better-auth\.session_token=[^;]*' /tmp/122-signin-headers | cut -d= -f2- > .scratch/122-gate-cookie
echo "token length: ${#TOKEN}"
```

Expected: `[200]`; the `set-cookie:` line names `__Secure-better-auth.session_token` (production prefix); `body token present: True | user email: owner@sevendays.test`; token length > 0. The body `token` is the bare session token (1.7.5); the api's bearer plugin re-signs bare tokens before HMAC-verifying, so it is a valid `Authorization: Bearer` value (#121's spike-pinned mechanics). The cookie file holds the signed value for Step 9's sign-out.

- [ ] **Step 5: The session row is visible in Postgres**

```bash
cd /home/jeius/Projects/sevendays/packages/db && TOKEN=$(cat ../../.scratch/122-gate-token) node --env-file=.env -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_MIGRATE_URL);
const rows = await sql\`select s.token, s.expires_at, u.email from session s join \"user\" u on u.id = s.user_id where u.email = 'owner@sevendays.test'\`;
for (const r of rows) {
  console.log('row token matches the sign-in token:', r.token === process.env.TOKEN,
    '| expires_at:', r.expires_at.toISOString(), '| created_at:', r.created_at.toISOString());
}
console.log('session rows for user:', rows.length);
await sql.end();
"
```

Expected: `row token matches the sign-in token: true`, `expires_at` ~7 days out, `session rows for user: 1`. (1.7.5 stores `session.token` verbatim — #119's recon finding — so the equality check is exact.)

- [ ] **Step 6: Unauthenticated list read → the 401 envelope; authenticated → 200**

```bash
cd /home/jeius/Projects/sevendays
echo '— anonymous:'
curl -sS -m 20 -w ' [%{http_code}]\n' https://sevendays-api.pahamajulius.workers.dev/api/v1/appointments
echo '— bearer:'
curl -sS -m 20 -H "Authorization: Bearer $(cat .scratch/122-gate-token)" \
  -w '\n[%{http_code}]\n' https://sevendays-api.pahamajulius.workers.dev/api/v1/appointments | tail -c 120
```

Expected: anonymous → `{"error":"Authentication required."} [401]`; bearer → `[200]` with a JSON array tail (the array may be empty — the M2 evidence rows were deleted; Step 7's booking populates it and Step 8 proves the read again).

**Fallback (only if the bearer read returns 401 with the token from a 200 sign-in):** the two ADMIN Workers' put values differ from `apps/admin/.env.local`'s — the api now re-signs with a secret the admin didn't sign with. Re-put `BETTER_AUTH_SECRET` on `sevendays-admin` **and** `sevendays-v1-admin` using Task 1 Step 2's exact block (swap `--name`), `sleep 10`, re-run Steps 4 and 6, and record the extra puts in the evidence log. No redeploy is needed.

- [ ] **Step 7: Guest booking still works — POST 201**

```bash
cd /home/jeius/Projects/sevendays
curl -sS -m 20 -o .scratch/122-booking-resp.json -w '[%{http_code}]\n' \
  -X POST https://sevendays-api.pahamajulius.workers.dev/api/v1/appointments \
  -H 'content-type: application/json' \
  -d "$(cat .scratch/122-gate-fixture.json)"
BOOKING_ID=$(python3 -c 'import json;print(json.load(open(".scratch/122-booking-resp.json"))["id"])')
echo "booking id: $BOOKING_ID" | tee .scratch/122-booking-id
```

Expected: `[201]`; a uuid booking id; the response body is the created record (status `pending`, kind `scheduled`, `bookedPriceCents` snapshotted by the server).

- [ ] **Step 8: The single-get stays public — GET /:id 200**

```bash
curl -sS -m 20 -w '\n[%{http_code}]\n' \
  "https://sevendays-api.pahamajulius.workers.dev/api/v1/appointments/$(sed 's/booking id: //' .scratch/122-booking-id)"
```

Expected: `[200]` with the record JSON (no Authorization header — the uuid-opacity ruling; the landing confirmation read-back contract).

- [ ] **Step 9: Sign-out revocation — the working read dies**

```bash
cd /home/jeius/Projects/sevendays
sleep 10
echo '— sign-out (cookie-authenticated, the admin instance reads cookies not bearer):'
curl -sS -m 20 -w '\n[%{http_code}]\n' -X POST https://sevendays-admin.pahamajulius.workers.dev/api/auth/sign-out \
  -H "Cookie: __Secure-better-auth.session_token=$(cat .scratch/122-gate-cookie)"
sleep 2
echo '— the same bearer token after sign-out:'
curl -sS -m 20 -H "Authorization: Bearer $(cat .scratch/122-gate-token)" \
  -w ' [%{http_code}]\n' https://sevendays-api.pahamajulius.workers.dev/api/v1/appointments
```

Expected: sign-out → `{"success":true}` `[200]`; the previously-working bearer read → `{"error":"Authentication required."} [401]`.

- [ ] **Step 10: Prove the row died, then clean up the gate's data**

```bash
cd /home/jeius/Projects/sevendays/packages/db && node --env-file=.env -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_MIGRATE_URL);
const live = await sql\`select count(*)::int as n from session s join \"user\" u on u.id = s.user_id where u.email = 'owner@sevendays.test'\`;
console.log('session rows for user after sign-out:', live[0].n);
const b = await sql\`delete from appointments where customer_email = 'm4-gate@sevendays.test'\`;
const lu = await sql\`delete from \"user\" where email = 'login-ui@sevendays.test'\`;
console.log('gate booking rows deleted:', b.count, '| leftover #120 user rows deleted:', lu.count);
await sql.end();
"
```

Expected: `session rows for user after sign-out: 0` (sign-out deletes the row); `gate booking rows deleted: 1` (its add-on rows cascade — none were booked — and no real customer data remains); `leftover #120 user rows deleted: 1` (`login-ui@sevendays.test`, the dead-password #120 verification user — its sessions/accounts cascade). `owner@sevendays.test` **stays** — it is the owner's login.

- [ ] **Step 11: Record the gate evidence**

Append the actual outputs of Steps 1–10 under a `## Task 3 — teaser gate` heading in `.scratch/122-gate-evidence.md` (same heredoc pattern as Task 1 Step 5; redact token/cookie/password values — the structural prints already do).

**Not here:** no browser/CDP pass (the UI was verified at #120; this gate is the HTTP surface the spec names); no appointments dashboard interaction (v2); no email-inbox check (the recipient is deliberately undeliverable); no rate-limit 429 probing (the limiter is database-backed and on — noted, not exercised).

### Task 4: The v1 leg — login on `sevendays-v1-admin`, 404-by-absence, cross-edition share

**Files:**
- Create: `.scratch/122-v1-token`, `.scratch/122-v1-cookie` (0600, short-lived)

**Interfaces:**
- Consumes: `.scratch/122-staff-pass` (Task 2 — the same user/password against the same shared tables); Task 1's repaired v1 api.
- Produces: the v1 evidence block in `.scratch/122-gate-evidence.md`; the cross-edition secret-share proof (a v1-admin-issued token verifying on the teaser api's gated list) quoted by Task 5's progress bullet.

- [ ] **Step 1: Ok probe + sign-in on the v1 admin**

```bash
cd /home/jeius/Projects/sevendays
curl -sS -m 20 -w ' [%{http_code}]\n' https://sevendays-v1-admin.pahamajulius.workers.dev/api/auth/ok
sleep 10
PASS=$(cat .scratch/122-staff-pass)
umask 077
curl -sS -m 20 -D /tmp/122-v1-headers -o /tmp/122-v1-body.json -w '[%{http_code}]\n' \
  -X POST https://sevendays-v1-admin.pahamajulius.workers.dev/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d "{\"email\":\"owner@sevendays.test\",\"password\":\"$PASS\"}"
grep -io '^set-cookie: __secure-better-auth\.session_token=[^;]\{0,12\}' /tmp/122-v1-headers && echo '(cookie prefix shown, value redacted)'
python3 -c 'import json;d=json.load(open("/tmp/122-v1-body.json"));print("v1 body token present:", bool(d.get("token")))'
python3 -c 'import json;print(json.load(open("/tmp/122-v1-body.json"))["token"])' > .scratch/122-v1-token
grep -io '^set-cookie: __secure-better-auth\.session_token=[^;]*' /tmp/122-v1-headers | cut -d= -f2- > .scratch/122-v1-cookie
wc -c < .scratch/122-v1-token
```

Expected: `{"ok":true} [200]`; sign-in `[200]`; `v1 body token present: True`; non-zero token byte count. Login works on the picked `v1` deployment against the same tables — the AC's v1 leg. (If Task 3 Step 6's fallback re-put the admin secrets, this sign-in uses the same local value by construction.)

- [ ] **Step 2: v1's appointments stay 404-by-absence**

```bash
curl -sS -m 20 -w ' [%{http_code}]\n' https://sevendays-v1-api.pahamajulius.workers.dev/api/v1/appointments
```

Expected: `{"error":"Not found."} [404]` — already restored by Task 1 Step 4; re-asserted here as the recorded gate line (nothing to gate on v1 until M5 mounts CMS routes behind the picked middleware).

- [ ] **Step 3: Cross-edition share — the v1-issued token verifies on the teaser api**

```bash
curl -sS -m 20 -H "Authorization: Bearer $(cat .scratch/122-v1-token)" \
  -w '\n[%{http_code}]\n' https://sevendays-api.pahamajulius.workers.dev/api/v1/appointments | tail -c 120
```

Expected: `[200]` with the JSON array tail. The editions share one session table and one secret (ADR-0004); a token issued by `sevendays-v1-admin` verifying on `sevendays-api`'s gate proves the secret values agree across the editions' issuers — the strongest cross-check available before M5 mounts a gated route on v1's own api. (A `401` here with a 200 sign-in means the v1-admin Worker's secret value ≠ the local value — apply Task 3 Step 6's fallback with `--name sevendays-v1-admin`, then re-run Steps 1 and 3.)

- [ ] **Step 4: Sign out on v1 and confirm the shared row died**

```bash
sleep 10
curl -sS -m 20 -w '\n[%{http_code}]\n' -X POST https://sevendays-v1-admin.pahamajulius.workers.dev/api/auth/sign-out \
  -H "Cookie: __Secure-better-auth.session_token=$(cat .scratch/122-v1-cookie)"
cd /home/jeius/Projects/sevendays/packages/db && node --env-file=.env -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_MIGRATE_URL);
const live = await sql\`select count(*)::int as n from session s join \"user\" u on u.id = s.user_id where u.email = 'owner@sevendays.test'\`;
console.log('session rows for user after v1 sign-out:', live[0].n);
await sql.end();
"
```

Expected: sign-out → `{"success":true}` `[200]`; `session rows for user after v1 sign-out: 0`. Append all of Task 4's outputs under `## Task 4 — v1 leg` in `.scratch/122-gate-evidence.md`.

**Not here:** no v1 picks (all four M4 picks are executed — ledger `70ba992`/`624b424`/`199aad7`/`bd066eb`; the only pick left in this ticket is its own docs split, Task 6); no v1-api gated-route probing (none exists — M5's); no secrets beyond the fallback named in Step 3.

### Task 5: Docs rotation — progress, tech-stack, AGENTS, CONTEXT glossaries, plan ticks

**Files:**
- Modify: `docs/progress.md` (new #122 bullet under `# Progress`; two Known-Gaps lines removed; Immediate Next Steps → M5; `_Last updated` line)
- Modify: `docs/tech-stack.md:38-40` (Auth section → integrated posture)
- Modify: `AGENTS.md:44` (auth-state line flips; migration count refreshed)
- Modify: `apps/admin/CONTEXT.md` (+ Staff User, + Session), `apps/api/CONTEXT.md` (+ Session)
- Modify: `docs/plan.md:115,120` (tick boxes 3 and 8 with dated close-out annotations)
- Create: `.superpowers/sdd/2026-09-23-122-m4-live-verify-closeout/pr-body.md`

**Interfaces:**
- Consumes: `.scratch/122-gate-evidence.md` (Tasks 1–4) — quote its lines in the progress bullet where the text below says so; the ledger SHAs from recon (`70ba992`, `624b424`, `199aad7`, `bd066eb`).
- Produces: the docs commit Task 6 ships; every AGENTS/tech-stack/CONTEXT hunk is edition-free so Task 6's v1 pick applies them without scrubs.

- [ ] **Step 1: Insert the #122 session record at the top of progress.md's history**

In `docs/progress.md`, directly under the `# Progress` heading (above the `2026-09-23 — #121 …` paragraph), insert — replacing the two `⟨…⟩` slots with the actual values as instructed, and adjusting any claim the evidence contradicted (if a step's expected output differed, the bullet must say what actually happened, not what was expected):

```markdown
2026-09-23 — #122 M4 ticket 05, the M4 live gate + close-out, landed: auth is integrated and proven live on both editions. Recon found the four `BETTER_AUTH_SECRET` puts already made but HALF-BROKEN — both admin Workers worked (ok probe + generic 401 on bad credentials prove secret+DB+BetterAuth), while both api Workers returned the uniform 500 for EVERY `/api/v1/*` request including v1's 404-by-absence routes: the api puts had landed an EMPTY value, and `envSchema`'s `BETTER_AUTH_SECRET: z.string().min(1).optional()` throws inside `acquireDb` (which runs for every `/api/v1` request ahead of routing) — the dormant-window shape #121 documented (branches 200 / bogus 404 / appointments 500) had collapsed to all-500. The ticket re-put the secret from the local shared value on both api Workers (no redeploy needed) and the public surface recovered: branches 200, absent routes 404, the appointments list 401-envelope. The staff password was lost with #119's session (deliberately never recorded), so the gate ran the documented reset path (delete row → re-provision via the #119/#120-proven interactive-pty driver; `owner@sevendays.test` now carries a fresh password — delivered to the owner out-of-band, never committed; the leftover #120 verification user `login-ui@sevendays.test` was deleted). The teaser gate, live: `GET /api/auth/ok` → `{"ok":true}`; signed-out `/` → `307 /login?redirect=%2F` (the `_shell` gate live) with `/login` 200; wrong password → the generic `401 INVALID_EMAIL_OR_PASSWORD`; sign-in with the CLI-provisioned user → 200 with the `__Secure-` cookie and the session row visible in Postgres (token equality exact — 1.7.5 stores it verbatim); anonymous `GET /api/v1/appointments` → the 401 envelope while the same read with `Authorization: Bearer` → 200; `GET /:id` → 200 unauthenticated (uuid-opacity) and `POST` → 201 (guest flow unbroken; the fixture recipient is undeliverable so the confirmation email 403s at Resend harmlessly — fire-and-forget stands); sign-out through the cookie-authenticated endpoint → `{"success":true}` and the previously-working bearer read → 401 with the session row gone. The v1 leg: `{"ok":true}` + login on `sevendays-v1-admin` against the same tables; `v1`'s `/api/v1/appointments` stays `404 {"error":"Not found."}` by absence; the v1-issued token verified on the teaser api's gated list (200) — the cross-edition proof that all issuers share one `BETTER_AUTH_SECRET` (ADR-0004). All four M4 picks were already executed with ledger rows (#118 `70ba992`, #119 `624b424`, #120 `199aad7`, #121 `bd066eb` — the predicted SPLIT on #121's appointments edits); this ticket's own docs split is the close-out loop's tail (⟨PICK_NOTE: one sentence — either "picked as ⟨V1_SHA⟩ with AGENTS/tech-stack/CONTEXT hunks applied clean, locks green" or, if Task 6 found nothing pickable, why⟩). Docs rotated: tech-stack Auth section → integrated posture with versions; AGENTS.md auth-state line flipped (migrations 0000–0005); CONTEXT glossaries gain Staff User + Session. `pnpm check` 35/35 on the docs commit (PR ⟨PR_NUM⟩).
```

Fill `⟨PR_NUM⟩` after Task 6 Step 1 creates the PR (amend the branch before merging); fill `⟨PICK_NOTE⟩` after Task 6 Step 4 (the docs commit can be amended pre-merge, or the sentence lands in the ledger-row commit of Task 6 Step 6 — either is fine, but the merged text must not carry an unfilled slot).

- [ ] **Step 2: Remove the two closed Known-Gaps lines**

In `docs/progress.md`'s "Known Gaps / Not Yet Done" section, delete these two lines exactly (they are closed by this ticket; historical session bullets that mention "public until M4" stay untouched — they are records, not gaps):

```markdown
- **`GET /api/v1/appointments` is public until M4** — the list returns customer names/emails/phones with no auth (Q9=A decision: pre-production only, no domains until M6; M4's BetterAuth closes this).
```

```markdown
- No auth anywhere yet (BetterAuth not integrated) — Milestone 4.
```

- [ ] **Step 3: Rotate Immediate Next Steps to M5**

Replace the section's item 1 (the `**Milestone 4 — Admin Auth (v1-track).** …` paragraph, keeping the superseded-step italic note below it) with:

```markdown
1. **Milestone 5 — Admin CMS.** M4 is closed (auth integrated and verified live on both editions, #118–#122). Next artifact is the M5 spec (the M3/M4 pattern: spec → tickets → build), covering `docs/plan.md`'s M5 block — package create/edit/deactivate, branch editing (incl. the `TODO(seed)` phones once the client supplies them), R2 bucket + cover-image upload, and the landing reflecting changes without a deploy. M5's mutating routes mount behind the proven M4 surfaces: `requireSession` (`apps/api/src/services/auth.ts`) and the admin's `getSessionScopedApiClient` seam.
```

- [ ] **Step 4: Rewrite the `_Last updated` line (progress.md line 11)**

Replace the whole italic line with:

```markdown
_Last updated: 2026-09-23 (M4 CLOSED — ticket #122's live gate: the four `BETTER_AUTH_SECRET` puts completed live (the two api puts had landed empty and 500'd every `/api/v1` request — repaired by re-putting from the shared local value), staff login verified against the real tables on the teaser with the session row in Postgres, the appointments list closed (401 anonymous / 200 bearer) with the single-get and guest POST untouched, sign-out revocation proven, and login verified on `sevendays-v1-admin` with the cross-edition token check. All M4 picks executed with ledger rows. Docs rotated to the integrated posture; Immediate Next Steps → M5 (Admin CMS).)_
```

- [ ] **Step 5: tech-stack.md Auth section → integrated posture**

Replace the section's single bullet (`docs/tech-stack.md:40`) with:

```markdown
- **BetterAuth 1.7.5** (`better-auth@^1.7.5`, integrated 2026-09-23 — Milestone 4) — `apps/admin` is the auth server: email+password staff login at `/login` with self-serve sign-up disabled; users are provisioned and reset by the owner CLI (`docs/staff-provisioning.md`); routes mount at `/api/auth/*` with per-request instances over `@sevendays/db` (ADR-0011). `apps/api` runs a verification-only instance (the `bearer` plugin) over the same tables — `requireSession` verifies `Authorization: Bearer` tokens and returns the uniform 401 envelope (ADR-0004); one `BETTER_AUTH_SECRET` is shared across both apps' Workers. The auth tables (user/session/account/verification + rate limit) live in `packages/db/src/schema/auth.ts`, migration 0005.
```

(Edition-free by design — no deploy-target names — so the Task 6 pick applies it clean.)

- [ ] **Step 6: AGENTS.md auth-state line flips**

Replace `AGENTS.md:44` with:

```markdown
- **The DB is provisioned, the catalog is seeded, and auth is wired in.** `packages/db`'s client works against the live Supabase database (migrations 0000–0005 applied, catalog seeded + verified). BetterAuth 1.7.5 is integrated (M4, closed 2026-09-23): staff email+password login at the admin, sessions verified by the API over the shared tables (ADR-0004), the appointments list session-gated. Staff provisioning and password resets are owner-operated — `docs/staff-provisioning.md` is the runbook.
```

- [ ] **Step 7: CONTEXT glossaries gain Staff User + Session**

Append to `apps/admin/CONTEXT.md`'s Language section (after the **Dashboard** entry):

```markdown
**Staff User**:
A studio employee who signs in to the admin site with an email and password provisioned by the owner (`create-staff`, `docs/staff-provisioning.md`) — there is no self-serve sign-up. Carries a role (admin) for future gates.
_Avoid_: member, account (for the person), customer

**Session**:
A signed-in Staff User's server-side state — the row BetterAuth writes at sign-in and the API verifies from the forwarded bearer token on gated routes (ADR-0004). Ends at sign-out or expiry (~7 days).
_Avoid_: login (as a noun for the state), JWT, cookie (the API never sees cookies)
```

Append to `apps/api/CONTEXT.md`'s Language section (after the **Print finish** entry):

```markdown
**Session**:
The auth record the API verifies on gated routes: BetterAuth's session row over the shared tables, presented as an `Authorization: Bearer` token and checked by `requireSession` (ADR-0004) — never a cookie crossing apps, never a hand-rolled token lookup.
_Avoid_: JWT, cookie, auth context
```

- [ ] **Step 8: Tick `docs/plan.md` M4 boxes 3 and 8 with dated close-out annotations**

Same rule as Step 1: these annotations are the record the executor lands — if any gate evidence contradicts a claim written here (a different status code, a fallback taken, a pick outcome), the annotation says what actually happened.

Line 115 (`Env + secrets posture: …`): `- [ ]` → `- [✅]`, and append after the line's existing closing `)_` (its `…until #122.)_` note stays verbatim — the house pattern stacks dated italic annotations, see plan.md's M2 boxes):

```markdown
 _(2026-09-23: ticket #122 closed the box — one shared `BETTER_AUTH_SECRET` live on all four Worker targets; the two api puts had initially landed EMPTY and 500'd every `/api/v1` request via `parseEnv`'s `min(1)` inside `acquireDb` — re-put from the local value, verified by the recovered public reads; both GitHub environments carry `BETTER_AUTH_URL` riding deploys; both admin Workers' `DATABASE_URL` sync green on every deploy.)_
```

Line 120 (`Verify: login against the real tables on the teaser, …`): `- [ ]` → `- [✅]`, and append at the end of the line:

```markdown
 _(2026-09-23: ticket #122 landed — verified live on the teaser: ok probe, generic wrong-password 401, CLI-provisioned sign-in with the session row in Postgres, list 401-anon/200-bearer, `GET /:id` 200, `POST` 201 (guest flow unbroken), sign-out revocation re-401ing the same token; v1: login live on `sevendays-v1-admin` against the same tables, `/api/v1/appointments` 404-by-absence, and a v1-issued token verified on the teaser's gated list (the cross-edition secret share). All four M4 picks executed with ledger rows (#118 `70ba992`, #119 `624b424`, #120 `199aad7`, #121 `bd066eb`); docs rotated — progress/tech-stack/AGENTS auth-state flip/CONTEXT Session + Staff User.)_
```

- [ ] **Step 9: graphify + house gate, then stage the PR body**

```bash
cd /home/jeius/Projects/sevendays
graphify update . || true
git status --short graphify-out
pnpm check
```

Expected: `pnpm check` green, 35/35 tasks (docs-only; the `admin#test` no-op warning is known noise). Then write `.superpowers/sdd/2026-09-23-122-m4-live-verify-closeout/pr-body.md` — structure: What (the repair + the gate + the v1 leg), Evidence (quote 6–10 lines from `.scratch/122-gate-evidence.md`, redacted), Docs rotation list, Pick plan (own split expected), and `Closes #122`. Commit nothing from the sdd dir itself (house rule).

**Not here:** no edits to `CONTEXT-MAP.md` (its "authenticated via BetterAuth (ADR-0004)" line is already accurate); no ADR (nothing architecturally new — the empty-put repair is operational and recorded in progress); no `docs/agents/v1-picks.md` edits in this task (the ledger row is Task 6 Step 6).

### Task 6: Land the docs PR, execute the ticket's own v1 pick, record the ledger row

**Files:**
- Create: branch `docs/122-m4-closeout`; PR; ledger row in `docs/agents/v1-picks.md`; a pick commit on `v1`

**Interfaces:**
- Consumes: Task 5's docs tree; the v1-picks runbook (`docs/agents/v1-picks.md` — SPLIT procedure + locks); the v1 checkout `~/Projects/sevendays-v1-seed` (clean on `v1` at `bd066eb`, recon-verified).
- Produces: the merged close-out PR (closes #122); the ticket's own pick on `v1` with all locks; the final ledger row; the delivered staff password (session summary only).

- [ ] **Step 1: Branch, commit, PR, merge**

```bash
cd /home/jeius/Projects/sevendays
git switch -c docs/122-m4-closeout
git add docs/progress.md docs/tech-stack.md docs/plan.md AGENTS.md apps/admin/CONTEXT.md apps/api/CONTEXT.md
git status --short graphify-out | grep -q . && git add graphify-out || true
git commit -m "docs: M4 closed — live gate + docs rotation (#122)

The four BETTER_AUTH_SECRET puts are live (the two api puts had landed
empty — repaired from the local shared value; public reads recovered);
the milestone gate verified live on the teaser (login, 401/200 gating,
guest POST, sign-out revocation) and on v1 (login + 404-by-absence +
the cross-edition token check). Docs rotated: progress session record
+ M5 next steps, tech-stack Auth integrated posture, AGENTS auth-state
flip, CONTEXT Session/Staff User, plan.md M4 boxes 3+8 ticked."
git push -u origin docs/122-m4-closeout
gh pr create --title "M4 ticket 05 — live verify + docs rotation (milestone close)" \
  --body-file .superpowers/sdd/2026-09-23-122-m4-live-verify-closeout/pr-body.md
```

Before merging: fill Task 5 Step 1's `⟨PR_NUM⟩` slot with the real PR number (amend the branch). Then `gh pr merge --squash --delete-branch` (house flow; `Closes #122` auto-closes the issue on merge). Record the squash SHA: `MERGE_SHA=$(git rev-parse origin/main)` after `git switch main && git pull --ff-only`.

- [ ] **Step 2: Triage the merge — expect SPLIT**

```bash
cd /home/jeius/Projects/sevendays
node scripts/v1-triage.mjs "$MERGE_SHA"
```

Expected verdict: SPLIT — v1-paths `AGENTS.md`, `docs/tech-stack.md`, `apps/admin/CONTEXT.md`, `apps/api/CONTEXT.md`; main-only `docs/progress.md`, `docs/plan.md`, the plan file, `graphify-out/*`. Content pass: every v1-path hunk was written edition-free in Task 5 (no teaser/v1/v2 naming, no edition mechanics) — expect a clean apply with nothing dropped.

- [ ] **Step 3: Execute the split per the runbook**

```bash
cd ~/Projects/sevendays-v1-seed
git switch v1 && git pull --ff-only origin v1 && git fetch origin main
git cherry-pick -n "$MERGE_SHA"          # exits 1 when a main-only path is "deleted by us" (DU) — expected
git status --short                       # DU = docs/progress.md + docs/plan.md (absent on v1); A = the plan file + graphify-out (new on main); M = the four v1-path docs
git rm -qrf --ignore-unmatch -- docs/progress.md docs/plan.md docs/superpowers/plans/2026-09-23-122-m4-live-verify-closeout.md graphify-out
git commit -F - <<EOF
$(git log -1 --format=%B origin/main)

(cherry picked from commit $(git rev-parse origin/main))
Split: main-only paths dropped — docs/progress.md, docs/plan.md, docs/superpowers/plans/2026-09-23-122-m4-live-verify-closeout.md, graphify-out
EOF
```

The blank line after the `%B` line is load-bearing (runbook § Executing a SPLIT). If any of the four doc hunks conflicts, resolve per the runbook's client-safe-docs class (keep v1's context, re-apply the intent — the hunks are additive prose, so conflicts should not occur; one hour of conflict work → stop, owner decides).

- [ ] **Step 4: Locks — gates, audit, push, run, live curl**

```bash
cd ~/Projects/sevendays-v1-seed
pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @sevendays/api build
pnpm check && pnpm build
cd /home/jeius/Projects/sevendays && node scripts/audit-v1-absence.mjs v1 --repo ~/Projects/sevendays-v1-seed   # exit 0
cd ~/Projects/sevendays-v1-seed && git push origin v1
RUN_ID=$(gh run list --branch v1 --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
gh run view "$RUN_ID" --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
curl -sS -m 20 -o /dev/null -w 'v1 landing: %{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/
curl -sS -m 20 -o /dev/null -w 'v1 /book (must be 404): %{http_code}\n' https://sevendays-v1-landing.pahamajulius.workers.dev/book
curl -sS -m 20 -w ' [%{http_code}]\n' https://sevendays-v1-admin.pahamajulius.workers.dev/api/auth/ok
```

Expected: check `35/35` + build `7/7` (docs-only — likely turbo-cached); audit exit 0 (0 hits / 18 tokens); the run shows `check: success`, `Deploy v1 (private): success`, `Deploy teaser (main): skipped`; live: landing 200, `/book` 404, v1 admin ok probe `{"ok":true} [200]`. Record the v1 pick SHA: `V1_SHA=$(git rev-parse HEAD)`.

- [ ] **Step 5: Fill the progress bullet's pick slot**

Back on main: `git switch main && git pull --ff-only`, then fill Task 5 Step 1's `⟨PICK_NOTE⟩` slot in `docs/progress.md` (e.g. `picked as $V1_SHA — the four edition-free doc hunks applied clean; locks green (audit 0/18, Deploy v1 success, Deploy teaser skipped)`) and `⟨PR_NUM⟩` if not already done. If the PR already merged with the slot unfilled, this edit rides the Step 6 ledger commit instead.

- [ ] **Step 6: Record the ledger row (a main docs commit — itself a skip, no row owed per the f584a76 precedent)**

Append to `docs/agents/v1-picks.md`'s ledger table (fill `⟨…⟩` from the actual values):

```markdown
| 2026-09-23 | ⟨PR_NUM⟩ | `⟨MERGE_SHA 7-char⟩` | split | `⟨V1_SHA 7-char⟩` | M4 ticket 05 — live verify + docs rotation: progress session record + M5 next steps, tech-stack Auth integrated posture, AGENTS auth-state flip (migrations 0000–0005), CONTEXT Session/Staff User, plan.md M4 ticks. Classifier SPLIT — 4 v1-paths + 4 main-only (progress/plan/plan-file/graphify, dropped). Content pass clean by construction (Task 5 wrote every v1-path hunk edition-free). Locks: ⟨gates result⟩, audit PASS 0/18; run ⟨RUN_ID⟩ `check` + `Deploy v1 (private)` success, `Deploy teaser (main)` skipped; live: landing 200, `/book` 404, v1-admin ok probe 200. The ticket's live gate itself (secret repair, teaser 401/200/revocation, v1 login + cross-edition token check) is recorded in progress.md — main-only by design |
```

Commit + push to main directly (docs-only, house precedent `f584a76`):

```bash
cd /home/jeius/Projects/sevendays
git switch main && git pull --ff-only
# (edit docs/agents/v1-picks.md + any Step 5 fills)
git add docs/agents/v1-picks.md docs/progress.md
git commit -m "docs(agents): v1-picks ledger — #122 docs split picked (#122)"
git push origin main
gh run list --branch main --limit 1 --json conclusion --jq '.[0].conclusion'   # expect success after the run finishes
```

- [ ] **Step 7: Clean up scratch secrets and hand over the password**

```bash
cd /home/jeius/Projects/sevendays
rm -f .scratch/122-gate-token .scratch/122-gate-cookie .scratch/122-v1-token .scratch/122-v1-cookie \
      .scratch/122-signin-body.json .scratch/122-booking-resp.json .scratch/122-booking-id .scratch/122-staff-pass \
      /tmp/122-signin-headers /tmp/122-v1-headers /tmp/122-v1-body.json
git status --short   # expect clean
```

Then, in the session's final summary (never in a committed file): report the gate results, the ledger row, and **the new `owner@sevendays.test` password** (read it before deletion — or state that it was delivered and point to `docs/staff-provisioning.md` § Resetting if the owner prefers to set their own).

**Not here:** no `v1` hot-fixes (a red v1 run for content reasons → revert per the runbook, never force-push); no M5 work; no issue reopening — #122 auto-closed at merge and the post-merge pick is the loop's normal tail (the #101 precedent).

---

## Self-review record (completed at plan time)

- Spec coverage: every #122 AC bullet maps to a task — secrets/vars (Task 1 + recon'd env vars/sync), teaser login + wrong-password + session row (T3.1–3.5), 401/200/single-get/POST (T3.6–3.8), revocation (T3.9–3.10), picks + v1 login + 404-by-absence (recon + T4), docs rotation (T5), plan ticks + `pnpm check` (T5.8–5.9).
- No placeholders: every command and every docs insertion is verbatim; the only fill-slots are `⟨PR_NUM⟩`, `⟨PICK_NOTE⟩`, `⟨V1_SHA⟩`, `⟨MERGE_SHA⟩`, `⟨RUN_ID⟩` — runtime-identifiers with explicit fill steps (T6.1, T6.4–6.6).
- Type/name consistency: `.scratch/122-staff-pass`, `122-gate-token`, `122-gate-cookie`, `122-gate-fixture.json`, `122-gate-evidence.md`, `122-v1-token`, `122-v1-cookie` spelled identically across Tasks 2–4 and deleted in T6.7; the four Worker names match the recon-verified live targets.
- The broken-secret diagnosis is pinned to code (`env.ts:19`, `routes/v1.ts:19-22`, root `onError` in `index.ts`) and to the live 500/200 pattern recon captured; the repair's success criteria (branches 200 / bogus 404 / appointments 401-or-404) distinguish it from every competing failure mode.



