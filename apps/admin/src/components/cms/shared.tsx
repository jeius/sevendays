// The shared CMS pattern library (M5 #139): the compositions every admin
// screen consumes, ruled by #131 and ported from the composition of record
// (branch prototype/131-admin-cms-compositions, rounds 1–9). Copy is pinned
// by the ticket plan's Global Constraints — transcribe, never re-draft.
// Token flags: the status palette + radius step-down are flagged TODO at
// their use sites pending the owner's design-system ruling — never promote
// them into packages/ui silently.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from '@sevendays/ui/components/alert-dialog';
import { Button } from '@sevendays/ui/components/button';
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
 * color is never the only signal.
 */
export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      {/* TODO(token-ruling): status-dot palette pending the owner's design-system ruling (#134 open items) */}
      <span
        aria-hidden='true'
        className={`size-2.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}
      />
      <span className='sr-only'>{isActive ? 'Active' : 'Deactivated'}</span>
    </span>
  );
}

/** Centered muted line in a dashed-border card, optional action slot. */
export function EmptyState({ line, children }: { line: string; children?: ReactNode }) {
  return (
    <div className='border-border flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center'>
      <p className='text-muted-foreground text-sm'>{line}</p>
      {children ? <div className='mt-4'>{children}</div> : null}
    </div>
  );
}

/**
 * The animated expand mechanism: a persistent grid whose template-rows
 * transition 0fr ↔ 1fr animates open AND closed (Base UI's Collapsible panel
 * has no animation styles in the shared primitive, so the CSS grid trick
 * wins). The element stays mounted in both states, which is what makes the
 * close transition play.
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
 * The identity row of an expandable pair. Collapsed it renders byte-identically
 * to a plain TableRow (the caller's classes pass through untouched); expanded,
 * its bottom border drops so the separator moves to the ExpandPanel's end —
 * the line encloses identity + panel as one visual row instead of cutting
 * between them. The conditional border-b-0 beats the TableRow primitive's
 * border-b through tailwind-merge in the primitive's cn(). Ref/style/onClick
 * flow through (sortable rows ride on this).
 */
export function ExpandRow({
  expanded,
  className,
  ...props
}: ComponentProps<typeof TableRow> & { expanded: boolean }) {
  return <TableRow className={cn(expanded && 'border-b-0', className)} {...props} />;
}

/**
 * A full-width panel TableRow rendered under its row (always mounted, so
 * Collapse animates both ways). Collapsed it is 0px tall and borderless; when
 * open, its cell carries the row's border-b at its end. The border lives on
 * the cell, not the row, so the TableBody primitive's
 * `[&_tr:last-child]:border-0` can't swallow it when the last entity's panel
 * is the tbody's final row.
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
 * An icon-only action shows its label on hover/focus — the tooltip content IS
 * the button's aria-label text (which stays for AT). Also exported for the
 * identity cells, so a truncated row NAME reveals its full text on hover
 * (trigger is the name element itself).
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
 * Icon-only row actions: Edit (caller-rendered — packages routes to the
 * editor screen, others open the sheet) / Deactivate (PowerOff) / Reactivate
 * (Power), each with aria-label + a tooltip carrying the same text.
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
            // TODO(token-ruling): status-dot palette pending the owner's design-system ruling (#134 open items)
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
 * Actions cluster: the hover/focus-within-revealed icon actions, then the
 * expand chevron (always visible, rotates when open) — the owner ruling puts
 * the chevron AFTER the icons. No chevron when the row has nothing to reveal.
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

/**
 * Controlled deactivate confirm. onConfirm never deletes — the screen flips
 * isActive. Below the sm breakpoint the dialog docks to the bottom edge as a
 * sheet — full width, rounded top (max-sm:rounded-t-xl) — and above sm the
 * dock classes restore the primitive's centered dialog verbatim.
 *
 * Motion recipe (the composition of record's unified popup pattern): the
 * overlay AND the popup are composed with motion.div through the Base UI
 * `render` prop (NOT function/spread props), the Portal carries
 * `keepMounted`, and the conditional portal is wrapped in <AnimatePresence>.
 * Both channels animate opacity + transform (WAAPI), so Base UI's
 * getAnimations() unmount gate holds the popup until the exit finishes.
 * Desktop: scale 0.95 + fade; mobile bottom sheet: full translateY(100%)
 * slide. useIsMobile (768px) picks the variant while the CSS dock is max-sm,
 * so in the 640–768px band a centered dialog slides vertically instead of
 * scaling.
 *
 * Close-latch: the screens render this component conditionally
 * (`confirmRow ? <DeactivateConfirm …> : null`), so propagating the close to
 * the parent immediately would unmount the WHOLE component — AnimatePresence
 * included — in the same commit that should start the exit. The component
 * holds a local `visible` latch: the close request only flips the latch (the
 * exit plays while the parent's open prop stays true), and the parent is
 * informed via onExitComplete — the canonical Motion pattern for
 * parent-conditional rendering.
 *
 * Overlay-flash fix: the owner-visible exit flash was the Backdrop, not the
 * popup — the primitive's tw-animate overlay exit
 * (`data-closed:animate-out fade-out-0 duration-100`) runs with fill-mode
 * none, so at 100ms the backdrop snapped back to full opacity for the rest of
 * the popup's 300ms exit. The overlay therefore rides the same motion recipe
 * (opacity 0→1→0, 300ms ease-out): its WAAPI animation outranks the
 * primitive's CSSAnimation for the whole window and holds 0 until unmount.
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
            <AlertDialogOverlay
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              }
            />
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

/**
 * The light-entity editor shell: entity-name title, a description line, the
 * screen's fields, and Save changes / Cancel. V1 ruled Sheet everywhere — the
 * prototype's dialog-chrome variant is dead, and the prototype's honesty
 * caption is replaced by the required `description` prop.
 *
 * Side: useIsMobile (768px) drives it — bottom sheet on mobile, right sheet
 * on desktop. The primitive's bottom side is h-auto (unbounded), so
 * max-md:max-h-[85dvh] bounds the flex column and lets the body's flex-1
 * overflow-y-auto actually scroll.
 *
 * Motion recipe: SheetContent is composed with a motion.div through the Base
 * UI `render` prop and the conditional content is wrapped in
 * <AnimatePresence> — side-aware transform strings (desktop translateX(100%)
 * ↔ 0; mobile translateY(100%) ↔ 0) + opacity alongside, 300ms ease-out, all
 * WAAPI so Base UI's getAnimations() unmount gate holds the popup until the
 * exit finishes. The visible-latch + onExitComplete discipline is identical
 * to DeactivateConfirm's (the screens render the editor conditionally).
 */
export function LightEntityEditor({
  title,
  description,
  open,
  onOpenChange,
  onSave,
  saveLabel,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  saveLabel?: string;
  children: ReactNode;
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
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className='flex-1 space-y-5 overflow-y-auto px-6 pb-6'>{children}</div>
            <SheetFooter>
              <Button variant='outline' type='button' onClick={() => setVisible(false)}>
                Cancel
              </Button>
              <Button
                type='button'
                onClick={() => {
                  onSave();
                  setVisible(false);
                }}
              >
                {saveLabel ?? 'Save changes'}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
