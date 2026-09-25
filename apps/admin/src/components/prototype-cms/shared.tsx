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
// Round 7 (K1): the Edit Sheets' entrance moves to the KEYFRAME channel.
// The controller's runtime probe established Base UI 1.8.0 inserts and
// cleans `data-starting-style` within a single paint, so every
// transition-channel slide — the Sheet primitive's own 2.5rem classes AND
// T14's transform chain — can never fire. Keyframes run on insertion (which
// is why DeactivateConfirm always animated): LightEntityEditor now carries
// data-open:animate-in / data-closed:animate-out keyframe classes picked by
// the already-computed isMobile — right edge on desktop, bottom edge on
// mobile. DeactivateConfirm is untouched (already keyframe-driven).
//
// Round 8: entrances AND exits move to Motion for React ('motion/react',
// never framer-motion) via the Base UI integration recipe — motion.div
// through the render prop, AnimatePresence around the conditional portal,
// keepMounted on the confirm's Portal — with a local close-latch because
// the screens mount both popups conditionally (see the components). T15's
// keyframe chain and T12/T14's slide chains are deleted; both mobile
// bottom sheets get rounded-t-xl (owner ruling).
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
  AlertDialogPortal,
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
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { useEffect, useState } from 'react';

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
 * bottom edge as a sheet — full width, rounded top (max-sm:rounded-t-xl, the
 * owner's round-8 ruling) — and above sm the classes restore the primitive's
 * centered dialog verbatim. The right-side editor Sheets are ruled OUT of
 * scope (dialogs only).
 *
 * Round 8: entrance AND exit ride Motion for React (the unified `motion`
 * package, imported from 'motion/react' — never framer-motion), via the
 * Base UI integration recipe: the popup is composed with a motion.div
 * through the `render` prop (NOT function/spread props), the Portal carries
 * `keepMounted`, and the conditional portal is wrapped in <AnimatePresence>.
 * Both channels animate opacity + transform (WAAPI), so Base UI's
 * getAnimations() unmount gate holds the popup until the exit finishes —
 * fixing the exit-cut T15 established on every surface. Desktop: scale
 * 0.95 + fade (the skill's scale example); mobile bottom-sheet: full
 * translateY(100%) slide. T14's starting/ending-style chain and T12's
 * tw-animate slide classes are deleted — motion owns the animation; the
 * primitive's own tw-animate zoom classes still exist on the element and
 * compose (same 1→0.95 target, shorter duration). useIsMobile (768px) picks
 * the variant, matching the editor; the confirm's CSS dock is max-sm, so in
 * the 640–768px band a centered dialog slides vertically instead of scaling.
 *
 * Close-latch (spike round): the screens render this component conditionally
 * (`confirmRow ? <DeactivateConfirm …> : null`), so propagating the close to
 * the parent immediately would unmount the WHOLE component — AnimatePresence
 * included — in the same commit that should start the exit (the CDP probe
 * showed zero exit animations and DOM removal within one frame). So the
 * component holds a local `visible` latch: the close request only flips the
 * latch (the exit plays while the parent's open prop stays true), and the
 * parent is informed via onExitComplete — the canonical Motion pattern for
 * parent-conditional rendering. The isolation suite (t1–t3, probe scripts in
 * the SDD workspace) proved the pinned Base UI recipe holds end to end once
 * the parent unmount is deferred: exit animations run on the popup and the
 * popup leaves the DOM at ~330–345ms (the 300ms exit plus a frame).
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
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(open);
  }, [open]);
  const variants = isMobile
    ? {
        initial: { opacity: 0, transform: 'translateY(100%)' },
        animate: { opacity: 1, transform: 'translateY(0)' },
        exit: { opacity: 0, transform: 'translateY(100%)' },
      }
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
      };
  return (
    <AlertDialog
      open={visible && open}
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true);
        } else {
          setVisible(false);
        }
      }}
    >
      <AnimatePresence onExitComplete={() => onOpenChange(false)}>
        {visible && (
          <AlertDialogPortal keepMounted>
            <AlertDialogContent
              render={
                <motion.div
                  initial={variants.initial}
                  animate={variants.animate}
                  exit={variants.exit}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              }
              className='top-auto bottom-0 left-0 translate-x-0 translate-y-0 rounded-b-none data-[size=default]:max-w-none max-sm:rounded-t-xl sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-b-[min(var(--radius-4xl),24px)]'
            >
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate {name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Deactivated items are hidden from the landing site immediately. History is
                  untouched, and you can reactivate any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant='destructive' onClick={onConfirm}>
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogPortal>
        )}
      </AnimatePresence>
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
 * sheet docks to the bottom edge like the dialogs — useIsMobile drives the
 * side prop. Desktop keeps the right-side sheet. The primitive's bottom side
 * is h-auto (unbounded), so the usage-site adds max-md:max-h-[85dvh] — that
 * bounds the flex column and lets the body's flex-1 overflow-y-auto actually
 * scroll.
 *
 * Round 7 (K1): entrance + exit ride the KEYFRAME channel (tw-animate-css).
 * The controller's runtime probe established Base UI 1.8.0 inserts and cleans
 * `data-starting-style` within a single paint, so transition-channel slides —
 * the primitive's own 2.5rem classes AND T14's composed transform chain — can
 * never fire; keyframes run on insertion, which is why DeactivateConfirm
 * always animated. The usage site picks the keyframe classes from the
 * already-computed isMobile: desktop (side right) slides in from/out to the
 * right edge, mobile (side bottom) from/to the bottom edge — animate-in/out +
 * fade-in-0 / fade-out-0 + bare slide-in-from-… / slide-out-to-… (bare = 100%
 * in tw-animate-css 1.4.0, verified against the installed dist), 300ms.
 * duration-300 feeds the animation's duration (tw-animate reads
 * var(--tw-duration)) and beats the primitive's duration-200 through cn().
 * K2 note: Base UI's unmount gate is useAnimationsFinished → getAnimations(),
 * which nominally sees CSSAnimations, but at runtime the exit still cuts —
 * the popup unmounts within one frame of close on BOTH the sheet and the
 * DeactivateConfirm reference (exit-cut predates this change). The entrance
 * is the deliverable.
 *
 * Round 8: the WHOLE animation moves to Motion for React (the unified
 * `motion` package, imported from 'motion/react' — never framer-motion),
 * via the Base UI integration recipe: SheetContent is composed with a
 * motion.div through the `render` prop (NOT function/spread props) and the
 * conditional content is wrapped in <AnimatePresence>. T15's keyframe
 * classes are DELETED — motion owns the animation. Side-aware transform
 * STRINGS (WAAPI channel): desktop (side right) translateX(100%) ↔ 0;
 * mobile (side bottom) translateY(100%) ↔ 0; 300ms ease-out; opacity
 * animates alongside so Base UI's getAnimations() unmount gate holds the
 * popup until the exit finishes. The confirm's close-latch applies here
 * too (see DeactivateConfirm): the screens render the editor conditionally,
 * so Cancel/Save only flip the local `visible` latch and the parent is
 * informed on onExitComplete. motion's own will-change handling was checked
 * at runtime (computed style sampled during the entrance) — motion 13 did
 * not set will-change on the popup; transform strings + opacity are already
 * compositor-friendly, and the brief allows relying on motion's handling.
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
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(open);
  }, [open]);
  if (chrome === 'sheet') {
    const variants = isMobile
      ? {
          initial: { opacity: 0, transform: 'translateY(100%)' },
          animate: { opacity: 1, transform: 'translateY(0)' },
          exit: { opacity: 0, transform: 'translateY(100%)' },
        }
      : {
          initial: { opacity: 0, transform: 'translateX(100%)' },
          animate: { opacity: 1, transform: 'translateX(0)' },
          exit: { opacity: 0, transform: 'translateX(100%)' },
        };
    return (
      <Sheet
        open={visible && open}
        onOpenChange={(next) => {
          if (next) {
            onOpenChange(true);
          } else {
            setVisible(false);
          }
        }}
      >
        <AnimatePresence onExitComplete={() => onOpenChange(false)}>
          {visible && (
            <SheetContent
              side={isMobile ? 'bottom' : 'right'}
              render={
                <motion.div
                  initial={variants.initial}
                  animate={variants.animate}
                  exit={variants.exit}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              }
              className={cn('max-md:max-h-[85dvh]', isMobile && 'rounded-t-xl')}
            >
              <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>Prototype: changes stay on this page.</SheetDescription>
              </SheetHeader>
              <div className='flex-1 space-y-5 overflow-y-auto px-6 pb-6'>{children}</div>
              <SheetFooter>
                <Button variant='outline' type='button' onClick={() => setVisible(false)}>
                  Cancel
                </Button>
                <Button type='button' onClick={() => setVisible(false)}>
                  Save changes
                </Button>
              </SheetFooter>
            </SheetContent>
          )}
        </AnimatePresence>
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
