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
// Round 5: ActionTooltip is exported (the identity cells reuse it to show the
// full row NAME on hover), and DeactivateConfirm renders a bottom sheet below
// the sm breakpoint (full-width, rounded top, slide-up) and the centered
// dialog above it — responsive classes on the content only.
//
// Round 5b: LightEntityEditor's right-side Sheet becomes a BOTTOM sheet below
// 768px (useIsMobile drives the side prop) — C1 extended to the catalog
// editors; desktop right-side behavior is untouched.
//
// Round 6 (A1): both mobile bottom sheets get a visible slide-up. The
// AlertDialogContent primitive animates only through the tw-animate channel
// (data-open/data-closed + animate-in/out — it carries NO starting/ending
// style classes), so DeactivateConfirm adds a transition-channel slide keyed
// on the Base UI popup's own data-starting-style/data-ending-style
// attributes below sm. The Sheet primitive DOES use the transition channel
// (data-[side=bottom] starting/ending style translate-y-[2.5rem]) —
// LightEntityEditor composes a full-height translateY(100%) on the `transform`
// property (the primitive slides via the `translate` property, so the two
// compose instead of fighting the cascade) below md.
//
// Round 6 (A2): the expanded row's border encloses identity + panel.
// ExpandRow (identity row) drops its bottom border while expanded;
// ExpandPanel's cell carries the row's border-b at its end. Collapsed
// markup is byte-identical to round 5b.
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
import { useIsMobile } from '@sevendays/ui/hooks/use-mobile';
import { cn } from 'cn';
import { ChevronDown, Power, PowerOff } from 'lucide-react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

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
 * and borderless.
 *
 * A2 (round 6): when open, the identity row above drops ITS bottom border
 * (see ExpandRow) and this panel's cell carries the row's border-b at its
 * end — the line encloses identity + panel as one visual row instead of
 * cutting between them. The border lives on the cell, not the row, so the
 * TableBody primitive's `[&_tr:last-child]:border-0` can't swallow it when
 * the last entity's panel is the tbody's final row.
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
      <TableCell
        colSpan={colSpan}
        className={`p-0 text-left align-top whitespace-normal${open ? ' border-b' : ''}`}
      >
        <Collapse open={open}>
          <div className='text-muted-foreground px-2 pb-3 text-sm'>{children}</div>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}

/**
 * A2 (round 6): the identity row of an expandable pair. Collapsed it renders
 * byte-identically to a plain TableRow (the caller's classes pass through
 * untouched); expanded, its bottom border drops so the separator moves to
 * the ExpandPanel's end. The conditional border-b-0 beats the TableRow
 * primitive's border-b through tailwind-merge in the primitive's cn().
 * Ref/style/onClick flow through (testimonials' sortable row rides on this).
 */
export function ExpandRow({
  expanded,
  className,
  ...props
}: ComponentProps<typeof TableRow> & { expanded: boolean }) {
  return <TableRow className={cn(expanded && 'border-b-0', className)} {...props} />;
}

/**
 * N1: an icon-only action shows its label on hover/focus — the tooltip
 * content IS the button's aria-label text (which stays for AT). Round 5
 * (A3): exported — the identity cells reuse it so a truncated row NAME
 * reveals its full text on hover (trigger is the name element itself).
 */
export function ActionTooltip({ label, button }: { label: string; button: ReactElement }) {
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

/**
 * Controlled deactivate confirm. onConfirm never deletes — the screen flips
 * isActive. Round 5 (C1): below the sm breakpoint the dialog docks to the
 * bottom edge as a sheet — full width, rounded top, slide-up entrance
 * (max-sm classes win the cascade over the centered positioning of the
 * primitive) — and above sm the classes restore the primitive's centered
 * dialog verbatim. The right-side editor Sheets are ruled OUT of scope
 * (dialogs only).
 *
 * Round 6 (A1): the owner saw no entrance below sm. The primitive's own
 * animation is the tw-animate channel only (data-open/data-closed +
 * animate-in/out, 100ms, 1rem slide — no data-starting-style/data-ending-style
 * classes exist on it), so the usage site adds a second, visible channel
 * keyed on the Base UI popup's runtime data-starting-style/data-ending-style
 * attributes: 2rem slide-up + fade below sm at 300ms ease-out
 * (transition-[translate,opacity] — `translate` because Tailwind v4's
 * translate-y-* sets the translate property, which is what the usage site's
 * translate-y-0 resting state uses).
 */
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
      <AlertDialogContent className='top-auto bottom-0 left-0 translate-x-0 translate-y-0 rounded-b-none data-[size=default]:max-w-none max-sm:data-open:slide-in-from-bottom-4 max-sm:data-closed:slide-out-to-bottom-4 max-sm:data-[starting-style]:translate-y-8 max-sm:data-[starting-style]:opacity-0 max-sm:data-[ending-style]:translate-y-8 max-sm:data-[ending-style]:opacity-0 max-sm:transition-[translate,opacity] max-sm:duration-300 max-sm:ease-out sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-b-[min(var(--radius-4xl),24px)]'>
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
 *
 * Round 5b (C1 extended): on mobile (<768px, the useIsMobile breakpoint) the
 * sheet docks to the bottom edge like the dialogs — the primitive's
 * data-[side=bottom] slide-up transition handles the animation natively.
 * Desktop keeps the right-side sheet byte-identical (max-md: class only).
 * The primitive's bottom side is h-auto (unbounded), so the usage-site adds
 * max-md:max-h-[85dvh] — that bounds the flex column and lets the body's
 * flex-1 overflow-y-auto actually scroll.
 *
 * Round 6 (A1): the owner saw no entrance on mobile. The primitive's
 * data-[side=bottom] starting/ending style is only translate-y-[2.5rem] —
 * too subtle at 200ms — so the usage site composes a full-height slide on
 * the `transform` property (translateY(100%)) keyed on the same
 * data-starting-style/data-ending-style attributes. `transform` (usage) and
 * `translate` (primitive) are separate CSS properties, so the offsets sum
 * during the starting frame instead of fighting the cascade — no `!`
 * needed. duration-300 + ease-out scope to the bottom side below md.
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
  const isMobile = useIsMobile();
  if (chrome === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className='max-md:max-h-[85dvh] max-md:data-[side=bottom]:data-[starting-style]:[transform:translateY(100%)] max-md:data-[side=bottom]:data-[ending-style]:[transform:translateY(100%)] max-md:data-[side=bottom]:duration-300 max-md:data-[side=bottom]:ease-out'
        >
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
