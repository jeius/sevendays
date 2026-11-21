import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Slide } from 'yet-another-react-lightbox';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import { MOSAIC_CAROUSEL, MOSAIC_CONTROLLER, VIEWER_LABELS } from '../lib/viewer';

// The viewer composition (#336 D2/D6/D7): one Lightbox over the seam's
// mosaic vocabulary. The two laws the library does NOT carry live here —
// the live-index track (a re-render while open must re-sync to the CURRENT
// slide, never snap the carousel back to the opening photo) and the
// focus-restore (the library moves focus IN on open but never back).
// #340 widens this with the lone-image cover variant; nothing here branches.

// Focus-restore capture must run BEFORE the library's focus-on-open —
// which registers as a PASSIVE effect in the shipped dist (verified
// 3.33.1: `React.useEffect(focusOnMount, …)` in the Controller), so every
// layout effect outruns it. SSR renders the closed viewer, where
// useLayoutEffect would warn — the isomorphic swap keeps the server on
// the passive hook (a no-op there: `index` is null before hydration).
const useRestoreEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function PhotoViewer({
  slides,
  index,
  onClose,
}: {
  /** The mapped slides (the lib seam) — pass a STABLE reference (memoized at the surface). */
  slides: Slide[];
  /** null = closed; a number opens AT that photo (the clicked one). */
  index: number | null;
  onClose: () => void;
}) {
  const open = index !== null;
  // D6: `live` tracks navigation (on.view) so the surface's `index` sets
  // only the OPENING slide; while open, the Lightbox re-syncs to `live`.
  const [live, setLive] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) setLive(null); // closing resets: reopening starts at the clicked photo (D6)
  }, [open]);

  // D7: capture the trigger on the open edge (before the library's passive
  // focus-on-open runs), restore it on the close edge — the only focus law
  // the spec adds by hand.
  useRestoreEffect(() => {
    if (open) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) trigger.focus();
  }, [open]);

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={live ?? index ?? 0}
      on={{ view: ({ index: current }) => setLive(current) }}
      slides={slides}
      plugins={[Captions, Counter, Zoom]}
      carousel={MOSAIC_CAROUSEL}
      controller={MOSAIC_CONTROLLER}
      labels={VIEWER_LABELS}
    />
  );
}
