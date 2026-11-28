// The ?focus= landing hook (M9 #316, D10's honoring half): scrolls the
// focused row into view and stamps the data-focused attribute for
// FOCUS_HIGHLIGHT_MS, imperatively, the four screens only stamp
// data-row-id + FOCUS_ROW_CLASS on their row elements (BOTH postures
// where a screen renders a desktop table and a mobile stack; the gallery
// renders one grid), and this hook owns every dynamic bit, so no
// highlight state threads through the dnd row wrappers. React never
// renders data-focused, so re-renders never fight the fade. SSR-safe
// (effects never run server-side); tolerant by construction, an unknown
// id, a hidden row (the user narrowed the segment or category), or a
// not-yet-loaded list simply no-ops, never throws (the audit-log
// posture). `ready` is the screen's data-arrival flag: the effect waits
// for rows to exist, fires once per focus value per arrival, and does
// not re-fire on background refetches (ready stays true). The param
// itself arrived uuid-validated through focusSearchSchema, so the
// attribute selector below is quote-safe by construction.
import { useEffect } from 'react';
import { FOCUS_HIGHLIGHT_MS } from '#/lib/focus-landing';

/**
 * The first VISIBLE element carrying data-row-id, the folded
 * table/mobile-stack pair renders both subtrees and CSS hides one
 * (display:none subtrees answer a null offsetParent), so visibility, not
 * document order, picks the posture that actually scrolls.
 */
function visibleRow(id: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>(`[data-row-id="${id}"]`)).find(
      (el) => el.offsetParent !== null
    ) ?? null
  );
}

export function useFocusLanding(focus: string | undefined, ready: boolean): void {
  useEffect(() => {
    if (focus === undefined || !ready) return;
    const row = visibleRow(focus);
    if (row === null) return;
    row.scrollIntoView({ block: 'center' });
    // Stamp every match (both postures), only the visible one paints.
    const stamped = Array.from(document.querySelectorAll<HTMLElement>(`[data-row-id="${focus}"]`));
    for (const el of stamped) el.setAttribute('data-focused', 'true');
    const timer = window.setTimeout(() => {
      for (const el of stamped) el.removeAttribute('data-focused');
    }, FOCUS_HIGHLIGHT_MS);
    return () => {
      window.clearTimeout(timer);
      for (const el of stamped) el.removeAttribute('data-focused');
    };
  }, [focus, ready]);
}
