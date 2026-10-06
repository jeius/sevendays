// The time-window toggle (#186): 24h/7d/30d as route search params
// (shareable, SSR-stable), 7d the spec's default. The DB-probe and Content
// widgets are point-in-time and windowless — the toggle visually scopes
// only the windowed widgets (each carries its own badge).
import { Link } from '@tanstack/react-router';

import type { MetricsWindow } from '#/lib/metrics/cf';

const WINDOWS: Array<{ value: MetricsWindow; label: string }> = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

export function WindowToggle({ window }: { window: MetricsWindow }) {
  return (
    <div
      role='group'
      aria-label='Time window'
      className='border-input bg-background inline-flex overflow-hidden rounded-lg border'
    >
      {WINDOWS.map(({ value, label }) => {
        const active = value === window;
        return (
          <Link
            key={value}
            to='/'
            search={{ window: value }}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium'
                : 'hover:bg-accent hover:text-accent-foreground px-3 py-1.5 text-xs'
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
