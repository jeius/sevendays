import {
  boolean,
  doublePrecision,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// Draft v1 schema. Adjust once real requirements (hours, geo, etc.) are confirmed.
export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    address: text('address').notNull(),
    phone: text('phone').notNull(),
    acceptsWalkIns: boolean('accepts_walk_ins').notNull().default(false),
    // Deactivation (M5): hidden from public reads (#138 makes them
    // active-only), reversible, never a delete — the same posture
    // service_packages has had since M1.
    isActive: boolean('is_active').notNull().default(true),
    // R2 object key for the cover image (M7 #214, the packages-covers
    // precedent / ADR-0019): resolved to coverImageUrl at read time — raw
    // keys never leave the API. Born nullable: the live branches carry no
    // covers yet.
    coverImageKey: text('cover_image_key'),
    // Branch coordinates (M7 #248, the owner's Maps request): manually
    // entered in the admin (no geocoding), consumed by the landing's
    // Google Maps new-tab pin. Born nullable — the live branches carry no
    // coordinates yet; both-or-neither is enforced at the wire schema
    // (packages/types), not here. doublePrecision, not numeric: the wire
    // carries numbers and drizzle's numeric maps to string.
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    // Pasted Maps links (M7 #273, the owner's v2 of #248): the branch's
    // Google/Apple Maps share URLs, entered manually in the admin — the
    // button's source of truth (stored coordinates are SET ASIDE, dormant;
    // see the #273 progress bullet). Any https URL passes; each is
    // independently optional.
    googleMapsUrl: text('google_maps_url'),
    appleMapsUrl: text('apple_maps_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Natural key: the seed upserts branches by name (re-runnable, ids stable).
  },
  (table) => [unique('branches_name_unique').on(table.name)]
);
