import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

// PROTOTYPE (#111) — the floating variant switcher (prototype skill, UI
// shape): bottom-centre pill, arrows cycle `?variant=` shareably, arrow
// keys work (except while typing). Dev-only so a stray merge can't ship it.
export function PrototypeSwitcher({
  current,
  variants,
}: {
  current: string;
  variants: { key: 'base' | 'a' | 'b' | 'c' | 'd'; name: string }[];
}) {
  const navigate = useNavigate();
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Latest-values ref keeps the key listener mounted once (lint-clean
  // without a dependency dance in a throwaway prototype).
  const latest = useRef({ current, variants, navigate });
  latest.current = { current, variants, navigate };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      const { current: cur, variants: vs, navigate: nav } = latest.current;
      const idx = vs.findIndex((v) => v.key === cur);
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const next = vs[(((idx + delta) % vs.length) + vs.length) % vs.length];
      if (!next) return;
      nav({
        to: '/',
        search: next.key === 'base' ? {} : { variant: next.key },
        replace: true,
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cycle = (delta: number) => {
    const idx = variants.findIndex((v) => v.key === current);
    const next = variants[(((idx + delta) % variants.length) + variants.length) % variants.length];
    if (!next) return;
    navigate({
      to: '/',
      search: next.key === 'base' ? {} : { variant: next.key },
      replace: true,
    });
  };

  const currentName = variants.find((v) => v.key === current)?.name ?? current;

  return (
    <div className='fixed inset-x-0 bottom-4 z-100 flex justify-center' data-prototype-switcher>
      <div className='relative flex items-center gap-1 rounded-full border border-brand-gray-cool bg-brand-ink p-1.5 shadow-lg'>
        <button
          type='button'
          aria-label='Previous variant'
          onClick={() => cycle(-1)}
          className='flex size-9 cursor-pointer items-center justify-center rounded-full text-lg text-white/85 transition-colors hover:bg-white/10 hover:text-white'
        >
          ←
        </button>
        <span className='font-mono text-white text-xs uppercase tracking-wider'>
          <span className='text-brand-300'>{current}</span> · {currentName}
        </span>
        <button
          type='button'
          aria-label='Next variant'
          onClick={() => cycle(1)}
          className='flex size-9 cursor-pointer items-center justify-center rounded-full text-lg text-white/85 transition-colors hover:bg-white/10 hover:text-white'
        >
          →
        </button>
        {hint && (
          <p className='absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-ink/90 px-3 py-1 font-mono text-[11px] text-white/70'>
            ← → to flip · stand-in photos &amp; DRAFT copy throughout
          </p>
        )}
      </div>
    </div>
  );
}

// Renders the switcher only in dev builds (the prototype skill's
// stray-merge guard).
export function DevOnlySwitcher(props: {
  current: string;
  variants: { key: 'base' | 'a' | 'b' | 'c' | 'd'; name: string }[];
}) {
  if (!import.meta.env.DEV) return null;
  return <PrototypeSwitcher {...props} />;
}
