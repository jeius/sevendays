// The lookups screen (M5 #141): print sizes + attires on ONE screen under
// the Studio taxonomy — ported element-for-element from the composition of
// record (prototype/131-admin-cms-compositions, screens/lookups.tsx, rounds
// 2–5) onto the task seams. Print sizes adopt the Packages format (the code
// main column / dot + description beneath, full text on expand); attires
// render the status dot FIRST, then the name — no description, so no expand
// affordance. The prototype's local fixture state is replaced by the task
// seams: `adminLookupQueries.printSizes()/attires()` for the lists (the
// Task 2 wrappers' first write consumers); Task 4's state seam
// (`printSizeStateFromRead` / `newPrintSizeState` / `buildPrintSizePayload`
// / `buildPrintSizeFlipPayload` / `validatePrintSizeState` — attires
// mirror) driving the two editors and the optimistic single flips through
// the result-valued save fns. NO order PUTs — neither table carries
// positions; the reads' (position, id)-absent order is the display order.
import type { Attire, PrintSize } from '@sevendays/types';
import { Button } from '@sevendays/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@sevendays/ui/components/card';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import { Field, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sevendays/ui/components/table';
import { Textarea } from '@sevendays/ui/components/textarea';
import { TooltipProvider } from '@sevendays/ui/components/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SquarePen } from 'lucide-react';
import { Fragment, useId, useState } from 'react';
import {
  ActionTooltip,
  Collapse,
  DeactivateConfirm,
  EmptyState,
  ExpandPanel,
  ExpandRow,
  LightEntityEditor,
  RowActionsCluster,
  RowIconActions,
  StatusBadge,
} from '#/components/cms/shared';
import {
  saveAdminAttireCreate,
  saveAdminAttireUpdate,
  saveAdminPrintSizeCreate,
  saveAdminPrintSizeUpdate,
} from '#/lib/admin.functions';
import { adminLookupQueries } from '#/lib/cms-queries';
import type {
  AttireEditorState,
  LightFieldErrors,
  PrintSizeEditorState,
} from '#/lib/light-entity-state';
import {
  attireStateFromRead,
  buildAttireFlipPayload,
  buildAttirePayload,
  buildPrintSizeFlipPayload,
  buildPrintSizePayload,
  conflictFieldErrors,
  newAttireState,
  newPrintSizeState,
  printSizeStateFromRead,
  validateAttireState,
  validatePrintSizeState,
} from '#/lib/light-entity-state';

/**
 * The editor's mode switch across BOTH sections: create (from a section's
 * New action) or edit (a row snapshot); `kind` picks the field set.
 */
type EditingTarget =
  | { kind: 'size' | 'attire'; mode: 'create' }
  | { kind: 'size'; mode: 'edit'; row: PrintSize }
  | { kind: 'attire'; mode: 'edit'; row: Attire };

/** One print-size editor save: the mode plus the exact field state the user saw. */
type SaveSizeInput =
  | { mode: 'create'; state: PrintSizeEditorState }
  | { mode: 'edit'; row: PrintSize; state: PrintSizeEditorState };

/** One attire editor save: the mode plus the exact field state the user saw. */
type SaveAttireInput =
  | { mode: 'create'; state: AttireEditorState }
  | { mode: 'edit'; row: Attire; state: AttireEditorState };

/** One flip of the print-size switch: the source row (payload donor) + the target. */
interface SizeFlipInput {
  row: PrintSize;
  isActive: boolean;
}

/** One flip of the attire switch: the source row (payload donor) + the target. */
interface AttireFlipInput {
  row: Attire;
  isActive: boolean;
}

/** The pending posture's fixed four rows — stable keys, never reordered. */
const PENDING_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4'];

export function LookupsScreen() {
  const { data: printSizes, isPending: sizesPending } = useQuery(adminLookupQueries.printSizes());
  const { data: attires, isPending: attiresPending } = useQuery(adminLookupQueries.attires());
  const queryClient = useQueryClient();
  // T3: controlled disclosure — one expanded row at a time across BOTH
  // sections (id or null; uuid ids never collide). Only print sizes expand.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Deep-linkable in the prototype frame pass; here a plain selection. One
  // confirm id spans both sections — uuid ids never collide.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // The editor's create/edit switch (kind picks the field set) and its open
  // flag are separate on purpose: the shared Save handler closes the Sheet
  // unconditionally (latch + exit), so a FAILED save re-arms `editorOpen`
  // after the exit to honor the stays-open-on-failure posture; `editing`
  // carries the retry target and the parent-held field states keep the
  // user's input intact.
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // Remounts the editor on a failed save's reopen: the component's visible
  // latch re-arms only on mount or an `open` false→true flip, and the flip
  // alone is lost when the failure lands mid-exit (open never went false).
  const [editorNonce, setEditorNonce] = useState(0);
  // One editor pair, two field sets: the section states ride separately so
  // the shared Save handler validates with the kind's own validator.
  const [sizeState, setSizeState] = useState<PrintSizeEditorState>(newPrintSizeState);
  const [attireState, setAttireState] = useState<AttireEditorState>(newAttireState);
  const [sizeErrors, setSizeErrors] = useState<LightFieldErrors>({});
  const [attireErrors, setAttireErrors] = useState<LightFieldErrors>({});
  const codeId = useId();
  const descriptionId = useId();
  const sizeActiveId = useId();
  const attireNameId = useId();
  const attireActiveId = useId();

  // Single-row flips: optimistic on the section's list cache (cancel +
  // snapshot + patch ONLY isActive; rollback + toast on error; invalidate
  // either way) — the posture 139's packages table pinned.
  const flipSize = useMutation({
    // Result-valued fn (Task 2's seam): ok:false converts to a throw so the
    // optimistic handlers below own rollback + the error toast — a flip has
    // no inline field slot in the table, so a conflict surfaces as its
    // message.
    mutationFn: async ({ row, isActive }: SizeFlipInput) => {
      const result = await saveAdminPrintSizeUpdate({
        data: { id: row.id, payload: buildPrintSizeFlipPayload(row, isActive) },
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async ({ row, isActive }) => {
      await queryClient.cancelQueries({ queryKey: adminLookupQueries.printSizes().queryKey });
      const previous = queryClient.getQueryData<PrintSize[]>(
        adminLookupQueries.printSizes().queryKey
      );
      queryClient.setQueryData<PrintSize[]>(adminLookupQueries.printSizes().queryKey, (old) =>
        old?.map((candidate) => (candidate.id === row.id ? { ...candidate, isActive } : candidate))
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminLookupQueries.printSizes().queryKey, context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminLookupQueries.printSizes().queryKey });
    },
  });

  const flipAttire = useMutation({
    mutationFn: async ({ row, isActive }: AttireFlipInput) => {
      const result = await saveAdminAttireUpdate({
        data: { id: row.id, payload: buildAttireFlipPayload(row, isActive) },
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async ({ row, isActive }) => {
      await queryClient.cancelQueries({ queryKey: adminLookupQueries.attires().queryKey });
      const previous = queryClient.getQueryData<Attire[]>(adminLookupQueries.attires().queryKey);
      queryClient.setQueryData<Attire[]>(adminLookupQueries.attires().queryKey, (old) =>
        old?.map((candidate) => (candidate.id === row.id ? { ...candidate, isActive } : candidate))
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminLookupQueries.attires().queryKey, context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminLookupQueries.attires().queryKey });
    },
  });

  // Editor saves: NON-optimistic — the form state is the source of truth;
  // success invalidates + toasts + (the shared handler's) close, failure
  // keeps the editor open with the state intact (retry is safe — the save
  // is a full-object PUT). A conflict (duplicate code / name) marks the
  // field inline per the branches mirror; no details → the message toast.
  const saveSize = useMutation({
    mutationFn: async (input: SaveSizeInput) => {
      const result =
        input.mode === 'create'
          ? await saveAdminPrintSizeCreate({ data: buildPrintSizePayload(input.state) })
          : await saveAdminPrintSizeUpdate({
              data: { id: input.row.id, payload: buildPrintSizePayload(input.state) },
            });
      return { input, result };
    },
    onSuccess: ({ input, result }) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminLookupQueries.printSizes().queryKey });
        toast.success('Saved.');
        return;
      }
      // !ok: a code conflict marks the Code Field; no details → the message
      // toast. The reopen replays the enter animation over the intact state.
      const codeConflict = conflictFieldErrors(result.details).code;
      if (codeConflict) {
        setSizeErrors({ code: codeConflict });
      }
      if (!result.details) {
        toast.error(result.message);
      }
      keepEditorOpen(
        input.mode === 'create'
          ? { kind: 'size', mode: 'create' }
          : { kind: 'size', mode: 'edit', row: input.row }
      );
    },
    onError: (error, input) => {
      // Not an API failure (serialization, session loss) — loud toast, same
      // keep-open posture.
      toast.error(error.message);
      keepEditorOpen(
        input.mode === 'create'
          ? { kind: 'size', mode: 'create' }
          : { kind: 'size', mode: 'edit', row: input.row }
      );
    },
  });

  const saveAttire = useMutation({
    mutationFn: async (input: SaveAttireInput) => {
      const result =
        input.mode === 'create'
          ? await saveAdminAttireCreate({ data: buildAttirePayload(input.state) })
          : await saveAdminAttireUpdate({
              data: { id: input.row.id, payload: buildAttirePayload(input.state) },
            });
      return { input, result };
    },
    onSuccess: ({ input, result }) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminLookupQueries.attires().queryKey });
        toast.success('Saved.');
        return;
      }
      // !ok: a name conflict marks the Name Field; no details → the message
      // toast. The reopen replays the enter animation over the intact state.
      const nameConflict = conflictFieldErrors(result.details).name;
      if (nameConflict) {
        setAttireErrors({ name: nameConflict });
      }
      if (!result.details) {
        toast.error(result.message);
      }
      keepEditorOpen(
        input.mode === 'create'
          ? { kind: 'attire', mode: 'create' }
          : { kind: 'attire', mode: 'edit', row: input.row }
      );
    },
    onError: (error, input) => {
      toast.error(error.message);
      keepEditorOpen(
        input.mode === 'create'
          ? { kind: 'attire', mode: 'create' }
          : { kind: 'attire', mode: 'edit', row: input.row }
      );
    },
  });

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function openSizeCreate() {
    setSizeState(newPrintSizeState());
    setSizeErrors({});
    setEditing({ kind: 'size', mode: 'create' });
    setEditorOpen(true);
  }

  function openSizeEdit(row: PrintSize) {
    setSizeState(printSizeStateFromRead(row));
    setSizeErrors({});
    setEditing({ kind: 'size', mode: 'edit', row });
    setEditorOpen(true);
  }

  function openAttireCreate() {
    setAttireState(newAttireState());
    setAttireErrors({});
    setEditing({ kind: 'attire', mode: 'create' });
    setEditorOpen(true);
  }

  function openAttireEdit(row: Attire) {
    setAttireState(attireStateFromRead(row));
    setAttireErrors({});
    setEditing({ kind: 'attire', mode: 'edit', row });
    setEditorOpen(true);
  }

  /** Re-arms the editor after a failed save (see the state comments above). */
  function keepEditorOpen(target: EditingTarget) {
    setEditing(target);
    setEditorOpen(true);
    setEditorNonce((n) => n + 1);
  }

  function handleEditorSave() {
    if (!editing) {
      return;
    }
    if (editing.kind === 'size') {
      const errors = validatePrintSizeState(sizeState);
      if (errors.code || errors.description) {
        setSizeErrors(errors);
        toast.error('Fix the highlighted fields.');
        // Veto-throw: the shared Save button closes the Sheet unconditionally
        // when onSave returns normally (onSave(); setVisible(false)); the only
        // synchronous keep-open channel in the landed LightEntityEditor is a
        // throw, and shared.tsx sits outside this ticket's scope fence. React
        // reports it as an uncaught event-handler error — deliberate, never
        // user-visible; the inline errors + toast are the UX.
        throw new Error('lookups-editor-validation-hold');
      }
      setSizeErrors({});
      saveSize.mutate(
        editing.mode === 'create'
          ? { mode: 'create', state: sizeState }
          : { mode: 'edit', row: editing.row, state: sizeState }
      );
      return;
    }
    const errors = validateAttireState(attireState);
    if (errors.name) {
      setAttireErrors(errors);
      toast.error('Fix the highlighted fields.');
      throw new Error('lookups-editor-validation-hold');
    }
    setAttireErrors({});
    saveAttire.mutate(
      editing.mode === 'create'
        ? { mode: 'create', state: attireState }
        : { mode: 'edit', row: editing.row, state: attireState }
    );
  }

  const confirmSize = printSizes?.find((row) => row.id === confirmId);
  const confirmAttire = attires?.find((row) => row.id === confirmId);

  return (
    <section className='space-y-4'>
      <PrintSizesSection
        printSizes={printSizes}
        isPending={sizesPending}
        expandedId={expandedId}
        onToggle={toggleExpanded}
        onCreate={openSizeCreate}
        onEdit={openSizeEdit}
        onDeactivate={(row) => setConfirmId(row.id)}
        onReactivate={(row) => flipSize.mutate({ row, isActive: true })}
      />
      <AttiresSection
        attires={attires}
        isPending={attiresPending}
        onCreate={openAttireCreate}
        onEdit={openAttireEdit}
        onDeactivate={(row) => setConfirmId(row.id)}
        onReactivate={(row) => flipAttire.mutate({ row, isActive: true })}
      />

      {editing?.kind === 'size' ? (
        <LightEntityEditor
          key={editorNonce}
          title={editing.mode === 'create' ? 'New print size' : editing.row.code}
          description='The size code and what it means.'
          open={editorOpen}
          onOpenChange={(next) => {
            if (!next) {
              setEditorOpen(false);
              setEditing(null);
            }
          }}
          onSave={handleEditorSave}
        >
          <Field>
            <FieldLabel htmlFor={codeId}>Code</FieldLabel>
            <Input
              id={codeId}
              className='font-mono'
              value={sizeState.code}
              onChange={(e) => setSizeState({ ...sizeState, code: e.target.value })}
            />
            {sizeErrors.code ? <p className='text-destructive text-xs'>{sizeErrors.code}</p> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
            <Textarea
              id={descriptionId}
              rows={3}
              value={sizeState.description}
              onChange={(e) => setSizeState({ ...sizeState, description: e.target.value })}
            />
            {sizeErrors.description ? (
              <p className='text-destructive text-xs'>{sizeErrors.description}</p>
            ) : null}
          </Field>
          <label htmlFor={sizeActiveId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={sizeActiveId}
              checked={sizeState.isActive}
              onCheckedChange={(checked) =>
                setSizeState({ ...sizeState, isActive: checked === true })
              }
            />
            Active
          </label>
        </LightEntityEditor>
      ) : null}

      {editing?.kind === 'attire' ? (
        <LightEntityEditor
          key={editorNonce}
          title={editing.mode === 'create' ? 'New attire' : editing.row.name}
          description='The attire name.'
          open={editorOpen}
          onOpenChange={(next) => {
            if (!next) {
              setEditorOpen(false);
              setEditing(null);
            }
          }}
          onSave={handleEditorSave}
        >
          <Field>
            <FieldLabel htmlFor={attireNameId}>Name</FieldLabel>
            <Input
              id={attireNameId}
              value={attireState.name}
              onChange={(e) => setAttireState({ ...attireState, name: e.target.value })}
            />
            {attireErrors.name ? (
              <p className='text-destructive text-xs'>{attireErrors.name}</p>
            ) : null}
          </Field>
          <label htmlFor={attireActiveId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={attireActiveId}
              checked={attireState.isActive}
              onCheckedChange={(checked) =>
                setAttireState({ ...attireState, isActive: checked === true })
              }
            />
            Active
          </label>
        </LightEntityEditor>
      ) : null}

      {confirmSize ? (
        <DeactivateConfirm
          name={confirmSize.code}
          open={confirmId === confirmSize.id}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmId(null);
            }
          }}
          onConfirm={() => {
            flipSize.mutate({ row: confirmSize, isActive: false });
            setConfirmId(null);
          }}
        />
      ) : null}

      {confirmAttire ? (
        <DeactivateConfirm
          name={confirmAttire.name}
          open={confirmId === confirmAttire.id}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmId(null);
            }
          }}
          onConfirm={() => {
            flipAttire.mutate({ row: confirmAttire, isActive: false });
            setConfirmId(null);
          }}
        />
      ) : null}
    </section>
  );
}

/** The print-size section's row handlers, threaded from the parent's state. */
interface SizeSectionHandlers {
  onToggle: (id: string) => void;
  onCreate: () => void;
  onEdit: (row: PrintSize) => void;
  onDeactivate: (row: PrintSize) => void;
  onReactivate: (row: PrintSize) => void;
}

/**
 * The print sizes section: the Packages-format table (code main column /
 * dot + description beneath, full description on expand) over live
 * PrintSize rows — the prototype's print-sizes Card transcribed, with the
 * branches screen's pending/empty postures per section.
 */
function PrintSizesSection({
  printSizes,
  isPending,
  expandedId,
  onToggle,
  onCreate,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  printSizes?: PrintSize[];
  isPending: boolean;
  expandedId: string | null;
} & SizeSectionHandlers) {
  // The table's one action shape: the sheet-opening Edit icon (the parent
  // owns the editor state; the row hands over its snapshot).
  function editButton(row: PrintSize) {
    return (
      <Button
        variant='ghost'
        size='icon-sm'
        type='button'
        aria-label='Edit'
        onClick={() => onEdit(row)}
      >
        <SquarePen aria-hidden='true' />
      </Button>
    );
  }

  if (isPending || !printSizes) {
    // Pending posture: skeleton rows echoing the two-line row anatomy
    // (dot, code + description) at the table's rhythm — the branches
    // pattern, per section.
    return (
      <Card className='@container rounded-lg'>
        <CardHeader>
          <CardTitle>Print sizes</CardTitle>
          <CardAction>
            <Button onClick={onCreate} size='sm' type='button' variant='outline'>
              New print size
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className='space-y-4'>
          {PENDING_ROW_KEYS.map((key) => (
            <div key={key} className='flex items-center gap-4 py-1'>
              <Skeleton className='size-4 rounded-sm' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-4 w-1/3' />
                <Skeleton className='h-3 w-2/3' />
              </div>
              <Skeleton className='h-4 w-28' />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (printSizes.length === 0) {
    return (
      <Card className='rounded-lg'>
        <CardHeader>
          <CardTitle>Print sizes</CardTitle>
          <CardAction>
            <Button onClick={onCreate} size='sm' type='button' variant='outline'>
              New print size
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items) */}
          <EmptyState line='No print sizes yet.'>
            <Button type='button' onClick={onCreate}>
              New print size
            </Button>
          </EmptyState>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='@container rounded-lg'>
      <CardHeader>
        <CardTitle>Print sizes</CardTitle>
        <CardAction>
          <Button onClick={onCreate} size='sm' type='button' variant='outline'>
            New print size
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {/* @container: the table folds into stacked rows below a 700px
            CONTAINER width (Tailwind v4 native container queries). The
            TooltipProvider is the per-table one the identity tooltips use
            (A3). The TODO(token-ruling) radius step-down is flagged at its
            ruling site in the pattern library, not re-declared. */}
        <TooltipProvider>
          <Table className='@max-[700px]:hidden'>
            <TableHeader>
              <TableRow>
                {/* A3: the code column carries no fixed width — the only
                    explicit width constraint the prototype dropped. */}
                <TableHead>Code</TableHead>
                {/* T2: the Actions header renders empty — the icons carry
                    their own labels. */}
                <TableHead className='text-right' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {printSizes.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <Fragment key={row.id}>
                    {/* N3: whole-row click toggles expansion — the actions
                      cell stops propagation so icon clicks never toggle;
                      the chevron stays the keyboard/AT toggle. */}
                    <ExpandRow
                      expanded={expanded}
                      className='group'
                      onClick={() => onToggle(row.id)}
                    >
                      <TableCell className='cursor-pointer'>
                        {/* L1: identity = code (mono, semibold) / dot +
                          description — the Packages format. Round 4: the
                          dot sits BESIDE the code (the attires reference
                          pattern) so it never strands on its own line when
                          the description hides. A3: the code truncates
                          when the column is squeezed and the tooltip
                          carries the full text. */}
                        <div className='space-y-0.5'>
                          <div className='flex items-center gap-2'>
                            <StatusBadge isActive={row.isActive} />
                            <ActionTooltip
                              label={row.code}
                              button={
                                <p className='min-w-0 truncate font-mono font-semibold'>
                                  {row.code}
                                </p>
                              }
                            />
                          </div>
                          {/* N2: the truncated line hides while expanded.
                            A1: the line indents by the dot (size-2.5) +
                            its gap-2 — 4.5 spacing steps — so the text
                            aligns with the code above it. */}
                          {expanded ? null : (
                            <div className='flex min-w-0 items-center pl-4.5'>
                              <p className='text-muted-foreground truncate text-xs'>
                                {row.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='text-right' onClick={(e) => e.stopPropagation()}>
                        <RowActionsCluster
                          expanded={expanded}
                          onToggle={() => onToggle(row.id)}
                          edit={editButton(row)}
                          isActive={row.isActive}
                          onDeactivate={() => onDeactivate(row)}
                          onReactivate={() => onReactivate(row)}
                        />
                      </TableCell>
                    </ExpandRow>
                    {/* T3 desktop reveal: the FULL description — the
                      description has no other full-text slot. */}
                    <ExpandPanel open={expanded} colSpan={2}>
                      {row.description}
                    </ExpandPanel>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TooltipProvider>

        {/* Stacked posture (below 700px container width): the whole
            two-line header toggles the animated reveal (M1). */}
        <div className='hidden flex-col @max-[700px]:flex'>
          {printSizes.map((row) => {
            const expanded = expandedId === row.id;
            return (
              <div key={row.id} className='border-border border-b py-2 last:border-b-0'>
                <button
                  type='button'
                  aria-expanded={expanded}
                  className='w-full text-left'
                  onClick={() => onToggle(row.id)}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <StatusBadge isActive={row.isActive} />
                      <p className='truncate font-mono font-medium'>{row.code}</p>
                    </div>
                  </div>
                  {/* N2: the description line hides while expanded. A1:
                      dot-width indent, same as the desktop line 2. */}
                  {expanded ? null : (
                    <p className='text-muted-foreground mt-1 truncate pl-4.5 text-xs'>
                      {row.description}
                    </p>
                  )}
                </button>
                <Collapse open={expanded}>
                  <div className='mt-2 space-y-2'>
                    <p className='text-muted-foreground text-sm'>{row.description}</p>
                    <div className='flex gap-1'>
                      <RowIconActions
                        edit={editButton(row)}
                        isActive={row.isActive}
                        onDeactivate={() => onDeactivate(row)}
                        onReactivate={() => onReactivate(row)}
                      />
                    </div>
                  </div>
                </Collapse>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The attires section: the dot-first flat table — single identity cell per
 * row (status dot FIRST, then the truncated tooltip name), NO expand
 * affordance (attires carry no description, so nothing to reveal; the
 * actions cluster rides without its chevron and no ExpandPanel). The
 * prototype's attires Card transcribed.
 */
function AttiresSection({
  attires,
  isPending,
  onCreate,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  attires?: Attire[];
  isPending: boolean;
  onCreate: () => void;
  onEdit: (row: Attire) => void;
  onDeactivate: (row: Attire) => void;
  onReactivate: (row: Attire) => void;
}) {
  function editButton(row: Attire) {
    return (
      <Button
        variant='ghost'
        size='icon-sm'
        type='button'
        aria-label='Edit'
        onClick={() => onEdit(row)}
      >
        <SquarePen aria-hidden='true' />
      </Button>
    );
  }

  if (isPending || !attires) {
    // Pending posture: skeleton rows echoing the one-line row anatomy
    // (dot, name, actions) — the branches pattern, per section.
    return (
      <Card className='@container rounded-lg'>
        <CardHeader>
          <CardTitle>Attires</CardTitle>
          <CardAction>
            <Button onClick={onCreate} size='sm' type='button' variant='outline'>
              New attire
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className='space-y-4'>
          {PENDING_ROW_KEYS.map((key) => (
            <div key={key} className='flex items-center gap-4 py-1'>
              <Skeleton className='size-4 rounded-sm' />
              <Skeleton className='h-4 flex-1' />
              <Skeleton className='h-4 w-28' />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (attires.length === 0) {
    return (
      <Card className='rounded-lg'>
        <CardHeader>
          <CardTitle>Attires</CardTitle>
          <CardAction>
            <Button onClick={onCreate} size='sm' type='button' variant='outline'>
              New attire
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items) */}
          <EmptyState line='No attires yet.'>
            <Button type='button' onClick={onCreate}>
              New attire
            </Button>
          </EmptyState>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='@container rounded-lg'>
      <CardHeader>
        <CardTitle>Attires</CardTitle>
        <CardAction>
          <Button onClick={onCreate} size='sm' type='button' variant='outline'>
            New attire
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table className='@max-[700px]:hidden'>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className='text-right' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {attires.map((row) => (
                <TableRow key={row.id} className='group'>
                  <TableCell>
                    {/* L2: status dot FIRST, then the name — no description
                      line, so no expand affordance. A3: the name truncates
                      (one line, tooltip carries the full text). */}
                    <div className='flex items-center gap-2'>
                      <StatusBadge isActive={row.isActive} />
                      <ActionTooltip
                        label={row.name}
                        button={<p className='min-w-0 truncate font-semibold'>{row.name}</p>}
                      />
                    </div>
                  </TableCell>
                  <TableCell className='text-right'>
                    <RowActionsCluster
                      edit={editButton(row)}
                      isActive={row.isActive}
                      onDeactivate={() => onDeactivate(row)}
                      onReactivate={() => onReactivate(row)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>

        {/* Stacked posture — attires carry no secondary field, so the dot
            leads and the icon actions sit inline (nothing to reveal). */}
        <div className='hidden flex-col @max-[700px]:flex'>
          {attires.map((row) => (
            <div
              key={row.id}
              className='border-border flex items-center gap-2 border-b py-2 last:border-b-0'
            >
              <StatusBadge isActive={row.isActive} />
              <p className='min-w-0 truncate font-medium'>{row.name}</p>
              <div className='ml-auto flex gap-1'>
                <RowIconActions
                  edit={editButton(row)}
                  isActive={row.isActive}
                  onDeactivate={() => onDeactivate(row)}
                  onReactivate={() => onReactivate(row)}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
