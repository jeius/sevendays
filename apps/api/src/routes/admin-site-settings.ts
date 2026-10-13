import { saveSiteSettingsSchema } from '@sevendays/types';
import { Hono } from 'hono';
import { logAdminMutation } from '../observability/events.js';
import { auditActor } from '../services/audit.js';
import type { ApiEnv } from '../services/db.js';
import { badRequest } from '../services/errors.js';
import { saveSiteSettings } from '../services/site-settings.js';
import { validatedJson } from '../services/validator.js';

// The singleton full-object PUT (M7 #215) behind the admin root's one
// requireSession (401 structurally precedes this validator). The
// admin_mutation line carries entityId null — the order-PUT law: the
// singleton is family-grain on the wire (the read carries no id); the
// DURABLE audit row inside the save carries the real row id.
export const adminSiteSettings = new Hono<ApiEnv>().put(
  '/',
  validatedJson(saveSiteSettingsSchema),
  async (c) => {
    const result = await saveSiteSettings(
      c.get('db'),
      c.env,
      auditActor(c),
      c.req.valid('json'),
      c.get('logger')
    );
    if (!result.ok) {
      return badRequest(c, result.message, result.details);
    }
    logAdminMutation(c, { entity: 'site-settings', entityId: null });
    return c.json(result.row);
  }
);
