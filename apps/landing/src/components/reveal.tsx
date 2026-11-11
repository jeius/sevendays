import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';

// The viewport reveal (#164 owner rulings, Rounds 2 + 3): fade-and-rise
// once when the element enters the viewport; staggered per column via
// `delay`; prefers-reduced-motion shows immediately. Lives in its own
// module so the home mosaic and the (#224) catalog index share the one
// motion grammar.
// The e2e visual seam (#255): every wrapper carries `data-reveal`, and
// `data-shown` flips with the state — inert DOM hooks (zero pixel
// impact) that the visual spec's reveal-complete wait targets under the
// tall-viewport capture law (e2e/README.md).
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  /** Grid-span classes land here — the reveal div IS the grid child. */
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=''
      data-shown={shown ? 'true' : undefined}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}
