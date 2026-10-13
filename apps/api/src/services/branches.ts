import type { Database } from '@sevendays/db';
import { branches } from '@sevendays/db';
import type { BranchRead } from '@sevendays/types';
import { asc, eq } from 'drizzle-orm';
import type { Env } from '../env.js';
import { resolveMediaUrl } from './media.js';

type MediaEnv = Pick<Env, 'MEDIA_PUBLIC_BASE_URL'>;

/** The row → read resolution (M7 #214, the packages-covers precedent):
 * the raw key stays server-side; the wire carries the absolute URL, null
 * passthrough for a null key. */
function toBranchRead(row: typeof branches.$inferSelect, env: MediaEnv): BranchRead {
  const { coverImageKey, ...rest } = row;
  return { ...rest, coverImageUrl: resolveMediaUrl(env, coverImageKey) };
}

/**
 * The public branches read (M5 #138): ACTIVE rows only, name-ordered, the
 * row-level flip never a shape change — plus the M7 #214 cover resolution
 * (coverImageUrl on the wire, raw keys never leaving). Gated appointment
 * reads resolve deactivated branches independently — they never join this
 * read (the appointments projection carries branchId; the landing's
 * confirmation join degrades to its documented '—' fallback).
 */
export async function listBranches(db: Database, env: MediaEnv): Promise<BranchRead[]> {
  const rows = await db
    .select()
    .from(branches)
    .where(eq(branches.isActive, true))
    .orderBy(asc(branches.name));
  return rows.map((row) => toBranchRead(row, env));
}
