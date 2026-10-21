import { useEffect, useRef, useState } from 'react';

/**
 * The truncation gate (#164 owner rulings): measures whether a clamped
 * element ACTUALLY overflows — the tooltip/expand affordances render only
 * when it does. Re-measures on every render pass (cheap: one layout read),
 * on window resize, and after fonts settle (a late font swap changes the
 * wrap). The ref goes on the clamped element.
 */
export function useTruncated<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  truncated: boolean;
} {
  const ref = useRef<T>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      setTruncated(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const fontTick = window.setTimeout(measure, 400);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(fontTick);
      window.removeEventListener('resize', measure);
    };
  });

  return { ref, truncated };
}
