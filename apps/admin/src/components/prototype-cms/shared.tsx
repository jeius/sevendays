// PROTOTYPE (throwaway) — wayfinder #131: shared composition pieces for the
// admin CMS screens. Copy is pinned by the plan's Global Constraints —
// transcribe, never re-draft. Nothing persists.
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
import type { ReactNode } from 'react';

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
    <div className='border-border flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center'>
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
