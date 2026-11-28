// The ?focus= landing seam (M9 #316, D10's honoring half): the receiving
// side of the Global Search deep link, #315's focusUrlFor emits
// `/packages?focus=<id>`-shaped hrefs and THIS seam is the one uniform
// mechanism the four list screens honor them by. The param is tolerant by
// construction (the audit-log / ?tab= posture): absent, empty, non-uuid,
// or wrong-typed values drop to undefined and the visit never fails, an
// unknown-but-well-formed id simply matches no row (the landing no-ops,
// honest). uuid-shape validation also keeps the row selector quote-safe
// by construction: a uuid's charset cannot break out of an attribute
// selector. The highlight's look and duration are the plan-time rulings
// of 2026-11-17 (re-confirmed at the owner's variants round); the styles
// compose semantic tokens only (the #217 law) and ride as a class
// constant Tailwind v4's auto-scan picks up from this file (styles.css's
// @source adds only packages/ui, the admin's own src/ is auto-scanned).
import { z } from 'zod';

/**
 * The highlight duration (plan-time ruling 2026-11-17): the tint rides
 * the row this long, then the rows' own transition-colors plays the fade.
 */
export const FOCUS_HIGHLIGHT_MS = 1600;

/**
 * The highlight's look (plan-time ruling 2026-11-17): semantic tokens
 * only, and every utility is data-[focused]:-prefixed, the class paints
 * NOTHING without the attribute the hook stamps, so carrying it on every
 * row is free.
 */
export const FOCUS_ROW_CLASS =
  'transition-colors data-[focused]:bg-primary/10 data-[focused]:ring-1 data-[focused]:ring-primary/30';

/** The ?focus= param: optional + uuid-shaped + catch-dropped, garbage never fails a visit. */
export const focusSearchParam = z.uuid().optional().catch(undefined);

/** The search schema for the three single-param routes (packages index, branches, gallery). */
export const focusSearchSchema = z.object({ focus: focusSearchParam });

export type FocusSearch = z.infer<typeof focusSearchSchema>;
