import { cn } from 'cn';
import type { ReactNode } from 'react';

// The wizard's select card (#58 inventory): one shell for the branch /
// offering / add-on steps — radio semantics where the step is single-select
// (branch, offering), checkbox semantics where it's multi-select (add-ons).
// Frozen-flow adjudication (#99): the M2 keyboard behavior is Tab + Enter
// per card, so the honest ARIA mapping is the toggle button (aria-pressed) —
// real radio/checkbox roles would promise arrow-key group navigation the
// frozen flow doesn't have. offeringId is the CDP seam (data-offering).
export function ChoiceCard({
  selected,
  onSelect,
  offeringId,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  offeringId?: string;
  children: ReactNode;
}) {
  return (
    <button
      type='button'
      aria-pressed={selected}
      data-offering={offeringId}
      onClick={onSelect}
      className={cn(
        'focus-visible:ring-brand-focus-ring rounded-xl border p-4 text-left transition-colors focus-visible:ring-3',
        selected
          ? 'border-primary bg-brand-50 ring-1 ring-primary'
          : 'border-brand-gray-cool bg-card hover:border-brand-400'
      )}
    >
      {children}
    </button>
  );
}
