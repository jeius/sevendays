import type { Database } from '@sevendays/db';
import { addonServices } from '@sevendays/db';
import type { AddonService } from '@sevendays/types';
import { asc, eq } from 'drizzle-orm';

export async function listActiveAddonServices(db: Database): Promise<AddonService[]> {
  return db
    .select()
    .from(addonServices)
    .where(eq(addonServices.isActive, true))
    .orderBy(asc(addonServices.name));
}
