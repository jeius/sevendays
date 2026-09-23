# Staff provisioning & password reset (v1)

The admin app has no self-serve sign-up (`disableSignUp: true` —
`apps/admin/src/lib/auth.ts`): the only way a staff user comes to exist is the
owner-run `create-staff` command, and the same command is the v1
password-reset path. There is no email flow — resets are owner-operated by
design (the #75 handover model: the owner operates v1's machinery for its
life). M4 spec: `docs/specs/2026-09-22-m4-admin-auth-spec.md` § Staff
provisioning.

## Creating a staff user

Prerequisites (the dev machine already has these; a fresh clone needs all):

1. `pnpm install && pnpm build:packages` — the CLI loads
   `apps/admin/src/lib/auth.config.ts`, which imports `@sevendays/db`'s
   built `dist/`.
2. `apps/admin/.env.local` carrying `DATABASE_URL` (the pooled transaction
   URL, ADR-0007), `BETTER_AUTH_SECRET` (32+ chars, shared with the api),
   and `BETTER_AUTH_URL` — see `apps/admin/.env.example`. For the deployed
   targets the same values live as Worker secrets/vars (#122's table).
3. The auth tables applied (migration 0005 — done on the shared database).

Run from anywhere in the repo:

```sh
pnpm --filter @sevendays/admin create-staff --email <email> --name "<name>"
```

- The command wraps the version-pinned BetterAuth CLI
  (`pnpm dlx auth@1.7.5 create-admin --config src/lib/auth.config.ts
  --role admin`); it creates the user through BetterAuth's own server-side
  `auth.api.createUser` path — password hashed with scrypt, `role` = admin,
  email marked verified.
- **The password is prompted interactively** — it never rides a flag, a
  file, or a script argument. Choose 12+ characters
  (`minPasswordLength: 12`).
- If users already exist, the CLI asks for confirmation before creating
  another.
- **Role (ADR-0018):** the script hardcodes `--role admin` — the owner's
  role, and the only one BetterAuth's `admin()` plugin answers its
  user-management endpoints (`/api/auth/admin/*`) for. Until the dashboard
  users page ships (M5.5), provision anyone other than the owner with a
  trailing `--role staff`:

  ```sh
  pnpm --filter @sevendays/admin create-staff --email <email> --name "<name>" --role staff
  ```

  The trailing flag overrides the script's hardcoded one — spike-verified
  2026-09-24 (the created row read `role: staff`). Verify the row after
  creating: nothing validates the role vocabulary at write time.

## Resetting a staff password

1. Remove the stale row — its sessions and accounts cascade with it (the
   FKs are `on delete cascade`):

```sh
cd packages/db && node --env-file=.env -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_MIGRATE_URL);
const gone = await sql`delete from \"user\" where email = 'OWNER_EMAIL_HERE'`;
console.log('deleted', gone.count, 'user row(s); sessions and accounts cascaded');
await sql.end();
"
```

2. Re-run the create command above with a new password.

Every session died with the row, so the staff member signs in again with the
new password. (`revokeSessionsOnPasswordReset` in the config covers future
in-app resets; v1 resets are this path.)

## Verifying sign-in (dev)

With `pnpm --filter @sevendays/admin dev` running (port 3000):

```sh
curl -sS -i -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d '{"email":"<email>","password":"…"}'
```

→ `200` with a `set-cookie: better-auth.session_token=…` header (dev; the
cookie is `__Secure-`-prefixed in production). A wrong password returns
`401 {"code":"INVALID_EMAIL_OR_PASSWORD","message":"Invalid email or
password"}` — the generic response; the login UI never says which field was
wrong.
