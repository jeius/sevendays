# Context Map

Sevendays is one product domain surfaced through three deployable apps. The core vocabulary (Appointment, Branch, Service Package, Slot, …) lives in `apps/api/CONTEXT.md` — the shared data model in `packages/db`/`packages/types` is owned there — and the other contexts reference it rather than restate it.

## Contexts

- [API](./apps/api/CONTEXT.md): owns the shared data model and every read/write to it — appointments, availability, catalog
- [Landing](./apps/landing/CONTEXT.md): the public site where customers browse and book
- [Admin](./apps/admin/CONTEXT.md): the staff site for managing appointments and site content

## Relationships

- **Landing → API**: landing reads catalog and Availability from, and writes Appointments through, the API; customers never authenticate
- **Admin → API**: staff read and mutate Appointments and the catalog through the API, authenticated via BetterAuth (ADR-0004)
- **Shared**: `packages/types` (Zod schemas) and `packages/db` (Drizzle) define the entities named in the API glossary; all three apps speak them
