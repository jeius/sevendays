// PROTOTYPE (throwaway) — wayfinder #131: shared composition pieces for the
// admin CMS screens. Copy is pinned by the plan's Global Constraints —
// transcribe, never re-draft. Nothing persists.
//
// Round 3: row action icons grow tooltips (label = the aria-label text) and
// the Reactivate icon turns green to match the status-dot palette.
//
// Round 4: in the actions cluster the expand chevron renders AFTER the icon
// actions — [Edit] [Deactivate/Reactivate] [Chevron] (owner ruling) — still
// always visible, rotation and aria-expanded intact.
//
// G1 radius note (spec): every card in this prototype renders one radius
// step down (rounded-xl → rounded-lg) via className overrides at the usage
// sites — packages/ui is untouched. If the owner keeps this, the step-down
// is a design-system TOKEN decision (the Card primitive's own radius), not
// a prototype-local patch to carry forward.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@sevendays/ui/components/alert-dialog';
import { Button } from '@sevendays/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@sevendays/ui/components/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@sevendays/ui/components/sheet';
import { TableCell, TableRow } from '@sevendays/ui/components/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sevendays/ui/components/tooltip';
import { ChevronDown, Power, PowerOff } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

/**
 * T3 expand mechanism: a persistent grid whose template-rows transition
 * 0fr ↔ 1fr animates open AND closed (Base UI's Collapsible panel has no
 * animation styles in the shared primitive, so the CSS grid trick wins).
 * The element stays mounted in both states, which is what makes the close
 * transition play.
 */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className='min-h-0 overflow-hidden'>{children}</div>
    </div>
  );
}

/**
 * T3 desktop reveal: a full-width panel TableRow rendered under its row
 * (always mounted, so Collapse animates both ways). Collapsed it is 0px tall
 * and borderless; the activated row keeps its own border-b as the separator.
 */
export function ExpandPanel({
  open,
  colSpan,
  children,
}: {
  open: boolean;
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <TableRow className='border-b-0 hover:bg-transparent'>
      <TableCell colSpan={colSpan} className='p-0 text-left align-top whitespace-normal'>
        <Collapse open={open}>
          <div className='text-muted-foreground px-2 pb-3 text-sm'>{children}</div>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}

/**
 * N1: an icon-only action shows its label on hover/focus — the tooltip
 * content IS the button's aria-label text (which stays for AT).
 */
function ActionTooltip({ label, button }: { label: string; button: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * T2 icon-only row actions: Edit (caller-rendered — packages routes to the
 * editor screen, others open the sheet) / Deactivate (PowerOff) / Reactivate
 * (Power), each with aria-label + a tooltip carrying the same text.
 *
 * N1 FLAG: the green reactivate tint matches the StatusBadge dot palette —
 * the token layer has no success semantics, so the Tailwind default stands
 * in (the same spec-token decision as the dots).
 */
export function RowIconActions({
  edit,
  isActive,
  onDeactivate,
  onReactivate,
}: {
  edit: ReactElement;
  isActive: boolean;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  return (
    <TooltipProvider>
      <ActionTooltip label='Edit' button={edit} />
      {isActive ? (
        <ActionTooltip
          label='Deactivate'
          button={
            <Button
              variant='ghost'
              size='icon-sm'
              type='button'
              aria-label='Deactivate'
              className='text-destructive hover:bg-destructive/10 hover:text-destructive'
              onClick={onDeactivate}
            >
              <PowerOff aria-hidden='true' />
            </Button>
          }
        />
      ) : (
        <ActionTooltip
          label='Reactivate'
          button={
            <Button
              variant='ghost'
              size='icon-sm'
              type='button'
              aria-label='Reactivate'
              className='text-green-600 hover:bg-green-600/10 hover:text-green-600'
              onClick={onReactivate}
            >
              <Power aria-hidden='true' />
            </Button>
          }
        />
      )}
    </TooltipProvider>
  );
}

/**
 * T2 actions cluster: the hover/focus-within-revealed icon actions from the
 * T7 audit, then the expand chevron (always visible, rotates when open) —
 * round-4 ruling: the chevron comes AFTER the icons. No chevron when the row
 * has nothing to reveal (attires).
 */
export function RowActionsCluster({
  edit,
  isActive,
  onDeactivate,
  onReactivate,
  onToggle,
  expanded = false,
}: {
  edit: ReactElement;
  isActive: boolean;
  onDeactivate: () => void;
  onReactivate: () => void;
  onToggle?: () => void;
  expanded?: boolean;
}) {
  return (
    <div className='flex items-center justify-end gap-1'>
      <div className='flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'>
        <RowIconActions
          edit={edit}
          isActive={isActive}
          onDeactivate={onDeactivate}
          onReactivate={onReactivate}
        />
      </div>
      {onToggle ? (
        <Button
          variant='ghost'
          size='icon-sm'
          type='button'
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse row' : 'Expand row'}
          title={expanded ? 'Collapse' : 'Expand'}
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          onClick={onToggle}
        >
          <ChevronDown aria-hidden='true' />
        </Button>
      ) : null}
    </div>
  );
}

/** Peso format pinned to the landing precedent (test-pinned there as ₱1,100.00). */
export function peso(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}

/** One h1 per screen — house rule. Subline muted under it, actions right-aligned on the row. */
export function PageHeader({
  title,
  subline,
  actions,
}: {
  title: string;
  subline?: string;
  actions?: ReactNode;
}) {
  return (
    <div className='flex flex-wrap items-start justify-between gap-4'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
        {subline ? <p className='text-muted-foreground text-sm'>{subline}</p> : null}
      </div>
      {actions ? <div className='flex items-center gap-2'>{actions}</div> : null}
    </div>
  );
}

/**
 * Ruled status indicator (owner verdict): a color dot + sr-only text, so
 * color is never the only signal. FLAG: the active/deactivated palette is a
 * spec-token decision — the token layer has no success/grey semantics, so
 * Tailwind defaults stand in here.
 */
export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span
        aria-hidden='true'
        className={`size-2.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}
      />
      <span className='sr-only'>{isActive ? 'Active' : 'Deactivated'}</span>
    </span>
  );
}

/** Controlled deactivate confirm. onConfirm never deletes — the screen flips isActive. */
export function DeactivateConfirm({
  name,
  open,
  onOpenChange,
  onConfirm,
}: {
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Deactivated items are hidden from the landing site immediately. History is untouched,
            and you can reactivate any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant='destructive' onClick={onConfirm}>
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The StubScreen posture: centered muted line in a dashed-border card, optional action. */
export function EmptyState({ line, children }: { line: string; children?: ReactNode }) {
  return (
    <div className='border-border flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center'>
      <p className='text-muted-foreground text-sm'>{line}</p>
      {children ? <div className='mt-4'>{children}</div> : null}
    </div>
  );
}

/**
 * The light-entity editor shell: entity-name title, the screen's fields, and
 * Save changes / Cancel. Owner verdict (V1 ruled): Sheet everywhere —
 * `chrome` defaults to 'sheet' and no screen passes it anymore.
 */
export function LightEntityEditor({
  title,
  open,
  onOpenChange,
  chrome = 'sheet',
  children,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chrome?: 'dialog' | 'sheet';
  children: ReactNode;
}) {
  if (chrome === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side='right'>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>Prototype: changes stay on this page.</SheetDescription>
          </SheetHeader>
          <div className='flex-1 space-y-5 overflow-y-auto px-6 pb-6'>{children}</div>
          <SheetFooter>
            <Button variant='outline' type='button' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='button' onClick={() => onOpenChange(false)}>
              Save changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Prototype: changes stay on this page.</DialogDescription>
        </DialogHeader>
        <div className='space-y-5'>{children}</div>
        <DialogFooter>
          <Button variant='outline' type='button' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='button' onClick={() => onOpenChange(false)}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
