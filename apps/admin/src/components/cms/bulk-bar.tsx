// The #131 bulk ruling + relations ruling (M5 #140): bulk selection + the fixed selected-actions bar are NEW compositions — the mechanics (Base-UI indeterminate, click-swallowed cells, desktop pill / mobile dock, the DeactivateConfirm Motion latch) port the composition of record (prototype/131-admin-cms-compositions, rounds 1–9) per the #140 plan.
import { Button } from '@sevendays/ui/components/button';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import { TableCell, TableHead } from '@sevendays/ui/components/table';
import { useIsMobile } from '@sevendays/ui/hooks/use-mobile';
import { cn } from 'cn';
import { Power, PowerOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

/**
 * The select-all header checkbox. `indeterminate` rides Base-UI's root prop
 * (present at @base-ui/react 1.8.0 — probed per the #140 plan): a partial
 * selection reads as the ruled indeterminate glyph — the check in an
 * unfilled, primary-bordered box (#155) — never a full filled check. The
 * next state is computed from the counts, never from the event, so the
 * toggle is authoritative against stale checkbox state.
 */
export function BulkSelectHeader({
  total,
  selectedCount,
  onToggleAll,
}: {
  total: number;
  selectedCount: number;
  onToggleAll: (next: boolean) => void;
}) {
  return (
    <TableHead>
      <Checkbox
        checked={total > 0 && selectedCount === total}
        indeterminate={selectedCount > 0 && selectedCount < total}
        aria-label='Select all'
        onCheckedChange={() => onToggleAll(selectedCount !== total)}
      />
    </TableHead>
  );
}

/**
 * The per-row select cell. The cell swallows clicks so a tap on the checkbox
 * NEVER toggles the row's expansion — the row's own click handling stays
 * untouched (the #131 composition's explicit carve-out).
 */
export function BulkSelectCell({
  selected,
  onToggle,
  label,
}: {
  selected: boolean;
  onToggle: (next: boolean) => void;
  label: string;
}) {
  return (
    <TableCell onClick={(e) => e.stopPropagation()}>
      <Checkbox
        checked={selected}
        aria-label={`Select ${label}`}
        onCheckedChange={(next) => onToggle(next)}
      />
    </TableCell>
  );
}

/**
 * The selected-actions bar. The parent mounts it only while `selectedCount >
 * 0`; DeactivateConfirm's close-latch recipe (ported from #139's shared.tsx,
 * minus the portal machinery — this bar is a plain fixed element) makes
 * Clear's exit play before the parent unmounts: Clear flips only the local
 * `visible` latch, AnimatePresence plays the slide-down exit, and
 * onExitComplete notifies the parent via `onClear`. Deactivate/Reactivate
 * fire the parent's handlers directly — confirm-before-deactivate lives in
 * the parent (the #140 screens).
 *
 * Placement (pinned): desktop (≥ 768px) a centered pill (`bottom-6`,
 * rounded-full, shadow-lg); mobile a full-width dock (`inset-x-0 bottom-0`,
 * rounded-t-xl, border-t — the DeactivateConfirm dock posture). The
 * `-translate-x-1/2` centering composes with the slide: Tailwind v4's
 * `translate` property is independent of the `transform` motion animates
 * (same composition as the DeactivateConfirm popup). Enter/exit: translateY
 * slide-up + opacity, 300ms ease-out.
 */
export function BulkActionBar({
  selectedCount,
  busy,
  onDeactivate,
  onReactivate,
  onClear,
}: {
  selectedCount: number;
  busy: boolean;
  onDeactivate: () => void;
  onReactivate: () => void;
  onClear: () => void;
}) {
  const isMobile = useIsMobile();
  // Mount sets the latch true (the parent mounts the bar only when a
  // selection exists); only Clear flips it.
  const [visible, setVisible] = useState(true);
  const variants = isMobile
    ? {
        initial: { opacity: 0, transform: 'translateY(100%)' },
        animate: { opacity: 1, transform: 'translateY(0)' },
        exit: { opacity: 0, transform: 'translateY(100%)' },
      }
    : {
        initial: { opacity: 0, transform: 'translateY(24px)' },
        animate: { opacity: 1, transform: 'translateY(0)' },
        exit: { opacity: 0, transform: 'translateY(24px)' },
      };
  return (
    <AnimatePresence onExitComplete={onClear}>
      {visible && (
        <motion.div
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          aria-busy={busy}
          className={cn(
            'fixed z-40 flex flex-wrap items-center gap-3',
            isMobile
              ? 'inset-x-0 bottom-0 rounded-t-xl border-t bg-card p-4'
              : 'bottom-6 left-1/2 -translate-x-1/2 rounded-full border bg-card px-4 py-2 shadow-lg'
          )}
        >
          <span className='text-sm font-medium tabular-nums'>{selectedCount} selected</span>
          <Button
            variant='outline'
            type='button'
            disabled={busy}
            className='text-destructive'
            onClick={onDeactivate}
          >
            <PowerOff aria-hidden='true' />
            Deactivate
          </Button>
          {/* TODO(token-ruling): status palette pending the owner's design-system ruling (#134 open items) */}
          <Button
            variant='outline'
            type='button'
            disabled={busy}
            className='text-green-600'
            onClick={onReactivate}
          >
            <Power aria-hidden='true' />
            Reactivate
          </Button>
          <Button variant='ghost' type='button' disabled={busy} onClick={() => setVisible(false)}>
            Clear
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
