// PROTOTYPE (throwaway) — wayfinder #59 variant switcher: a floating
// bottom bar for flipping shells. Deliberately high-contrast so it reads
// as evaluation chrome, not part of any variant's design.

import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';

// The union lives here (not in the route) because navigate()'s search param
// is typed by validateSearch's zod enum — a plain `string` key does not
// satisfy it (spiked in this package's typecheck, 2026-09-14).
export type VariantKey = 'a' | 'b' | 'c';

export interface VariantOption {
  key: VariantKey;
  label: string;
}

export function PrototypeSwitcher({
  options,
  current,
}: {
  options: VariantOption[];
  current: VariantKey;
}) {
  const navigate = useNavigate();

  const cycle = (dir: 1 | -1) => {
    const i = options.findIndex((o) => o.key === current);
    // noUncheckedIndexedAccess: indexed access is T | undefined — guard it.
    const next = options[(i + dir + options.length) % options.length] ?? options[0];
    if (!next) return;
    navigate({ to: '/prototype-shell', search: { variant: next.key }, replace: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      cycle(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const label = options.find((o) => o.key === current)?.label ?? current;

  return (
    <div className='fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground px-2 py-1 text-background shadow-lg'>
      <button
        type='button'
        onClick={() => cycle(-1)}
        aria-label='Previous variant'
        className='rounded-full p-2 hover:bg-background/15'
      >
        <ChevronLeft className='size-4' aria-hidden='true' />
      </button>
      <span className='min-w-44 text-center font-mono font-semibold text-xs uppercase tracking-wider'>
        {label}
      </span>
      <button
        type='button'
        onClick={() => cycle(1)}
        aria-label='Next variant'
        className='rounded-full p-2 hover:bg-background/15'
      >
        <ChevronRight className='size-4' aria-hidden='true' />
      </button>
    </div>
  );
}
