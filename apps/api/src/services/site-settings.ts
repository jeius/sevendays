import type { Database } from '@sevendays/db';
import { siteSettings } from '@sevendays/db';
import type { SaveSiteSettingsInput, SiteSettings } from '@sevendays/types';
import { EMPTY_SITE_SETTINGS } from '@sevendays/types';
import { eq } from 'drizzle-orm';
import type { Env } from '../env.js';
import { logMediaFailure } from '../observability/events.js';
import type { RequestLogger } from '../observability/logger.js';
import type { AdminCreateResult, AdminDetail, AdminWriteFailure } from './admin-shared.js';
import { type AuditActor, writeAuditRow } from './audit.js';
import { commitUpload, resolveMediaUrl } from './media.js';

// The site-settings seam (M7 #215, spec § Settings made real): the
// SINGLETON precedent — one row ever, born-empty (no row until the first
// save), full-object PUT with no per-field patching. Unset fields stay
// null on the wire; defaults live in packages/types and resolve at the
// consumers (the chrome never renders broken). The raw logo key never
// leaves: reads resolve logoImageUrl, saves ride the tri-state.

type SettingsEnv = Pick<Env, 'MEDIA_BUCKET' | 'MEDIA_PUBLIC_BASE_URL'>;

/** The row → read resolution (the #214 toBranchRead precedent): strip the
 * row's id/timestamps + the raw key, resolve the logo URL. The read type
 * is exhaustive by construction — a missed field fails typecheck. */
function toRead(row: typeof siteSettings.$inferSelect, env: SettingsEnv): SiteSettings {
  const { id: _id, logoImageKey, updatedAt: _updatedAt, ...content } = row;
  return { ...content, logoImageUrl: resolveMediaUrl(env, logoImageKey) };
}

/**
 * The public singleton read: the stored row, or the born-empty wire when
 * no row exists (every environment starts empty — live, compose, ship).
 * Defaults NEVER ride the read; resolution is the consumers' seam
 * (resolveSiteSettings in packages/types).
 */
export async function getSiteSettings(db: Database, env: SettingsEnv): Promise<SiteSettings> {
  const [row] = await db.select().from(siteSettings).limit(1);
  return row ? toRead(row, env) : EMPTY_SITE_SETTINGS;
}

// The logo commit (the resolveCover/resolveBranchCover controller
// ruling): HEAD-verify through commitUpload ONLY when a key is present —
// the tri-state makes "changed" structural (stored keys are immutable
// final keys, inputs are staging keys, and the staging-key regex rejects
// final keys, so a present string is always a new bind). undefined =
// unchanged, null = clear, string = bind/replace. A commit failure
// re-paths its details onto the payload field and resolves as the
// conflict failure (→ 400). Runs BEFORE the transaction — bucket I/O
// never holds a tx open.
async function resolveLogo(
  env: SettingsEnv,
  key: string | null | undefined,
  log?: RequestLogger
): Promise<{ ok: true; finalKey: string | null | undefined } | AdminWriteFailure> {
  if (key === undefined) return { ok: true, finalKey: undefined };
  if (key === null) return { ok: true, finalKey: null };
  const commit = await commitUpload(env.MEDIA_BUCKET, {
    stagingKey: key,
    purpose: 'site-logo',
  });
  if (!commit.ok) {
    // M6 #183: the cover-commit seam's typed failure (see
    // admin-packages's resolveCover — the route-level 'conflict' cannot
    // name it).
    if (log) {
      logMediaFailure(log, { op: 'commit', reason: commit.reason });
    }
    return {
      ok: false,
      reason: 'conflict',
      message: commit.message,
      details: (commit.details ?? [{ path: ['key'], message: commit.message }]).map(
        (detail): AdminDetail => ({ path: ['logoImageKey'], message: detail.message })
      ),
    };
  }
  return { ok: true, finalKey: commit.finalKey };
}

/**
 * The singleton full-object save: commit the logo (if any) → upsert the
 * one row in a transaction that also writes the audit row (create on the
 * first save, update after — the entity routers' semantics) → delete the
 * replaced/cleared logo's OLD object only after the commit (the #137
 * precedent: a rolled-back save never touches the bucket). The result is
 * the id-less write's (the order-PUT convention): the singleton save
 * structurally cannot answer not_found, so this is AdminCreateResult —
 * assignable wherever an AdminWriteResult is consumed.
 */
export async function saveSiteSettings(
  db: Database,
  env: SettingsEnv,
  audit: AuditActor,
  input: SaveSiteSettingsInput,
  log?: RequestLogger
): Promise<AdminCreateResult<SiteSettings>> {
  const logo = await resolveLogo(env, input.logoImageKey, log);
  if (!logo.ok) return logo;
  const [existing] = await db.select().from(siteSettings).limit(1);
  // The tri-state composes the stored key: absent = keep, null = clear,
  // string = the committed final key.
  const storedLogo = logo.finalKey === undefined ? existing?.logoImageKey : logo.finalKey;
  const { logoImageKey: _inputKey, ...fields } = input;
  const saved = await db.transaction(async (tx) => {
    let row: typeof siteSettings.$inferSelect;
    if (existing) {
      const [updated] = await tx
        .update(siteSettings)
        .set({ ...fields, logoImageKey: storedLogo, updatedAt: new Date() })
        .where(eq(siteSettings.id, existing.id))
        .returning();
      if (!updated) throw new Error('update site_settings: no row returned');
      row = updated;
    } else {
      const [inserted] = await tx
        .insert(siteSettings)
        .values({ ...fields, logoImageKey: storedLogo ?? null })
        .returning();
      if (!inserted) throw new Error('insert site_settings: no row returned');
      row = inserted;
    }
    await writeAuditRow(tx, audit, {
      entity: 'site-settings',
      entityId: row.id,
      action: existing ? 'update' : 'create',
      summary: null,
    });
    return row;
  });
  // After-commit bucket hygiene (#137's precedent): the replaced/cleared
  // logo's old object is deleted only AFTER the save committed.
  if (existing?.logoImageKey && storedLogo !== existing.logoImageKey) {
    await env.MEDIA_BUCKET.delete(existing.logoImageKey);
  }
  return { ok: true, row: toRead(saved, env) };
}
