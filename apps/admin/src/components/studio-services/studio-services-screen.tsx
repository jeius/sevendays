// The studio-services screen (M5 #140): the consolidated-format table over
// live StudioServiceWithBranches rows — ruled by #131 and ported
// element-for-element from the composition of record (branch
// prototype/131-admin-cms-compositions, screens/studio-services.tsx,
// rounds 1–9), with the #131 bulk column + bar riding Task 4's pieces and
// the bookable-branches relation rendering through RelationBadges
// (dedicated column on desktop, reveal-only on mobile). The prototype's
// local fixture state is replaced by the task seams:
// `adminStudioServiceQueries.all()` + `adminBranchQueries.all()` (both
// lists load — the badge join AND the editor's matrix vocabulary), Task 3's
// state seam (studioServiceStateFromRead / newStudioServiceState /
// buildStudioServicePayload / buildStudioServiceFlipPayload /
// validateStudioServiceState) driving the create/edit Sheet editor, and
// Task 2's result-valued save fns behind the create-then-matrix save
// (AQ-4). The matrix renders as the ruled V3 selectable name-only cards —
// no checkbox inside; a deactivated branch dims to opacity-60 and stays
// selectable (AQ-6: the admin matrix is staff-visible truth; the booking
// form filters). Not here: the add-on applies-to matrix (edited from the
// ADD-ON side — AQ-1), any add-on CRUD, hours/capacity.
import type { StudioServiceWithBranches } from '@sevendays/types';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import { Field, FieldDescription, FieldLabel } from '@sevendays/ui/components/field';
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
import { BulkActionBar, BulkSelectCell, BulkSelectHeader } from '#/components/cms/bulk-bar';
import { RelationBadges } from '#/components/cms/relation-badges';
import {
  ActionTooltip,
  Collapse,
  DeactivateConfirm,
  EmptyState,
  ExpandPanel,
  ExpandRow,
  LightEntityEditor,
  PageHeader,
  peso,
  RowActionsCluster,
  RowIconActions,
  StatusBadge,
} from '#/components/cms/shared';
import type { AdminMutationResult } from '#/lib/admin.functions';
import {
  saveAdminStudioServiceBranchMatrix,
  saveAdminStudioServiceCreate,
  saveAdminStudioServiceUpdate,
} from '#/lib/admin.functions';
import { adminBranchQueries, adminStudioServiceQueries } from '#/lib/cms-queries';
import type { LightFieldErrors, StudioServiceEditorState } from '#/lib/light-entity-state';
import {
  buildStudioServiceFlipPayload,
  buildStudioServicePayload,
  conflictFieldErrors,
  newStudioServiceState,
  studioServiceStateFromRead,
  validateStudioServiceState,
} from '#/lib/light-entity-state';

/** The editor's mode switch: create (from `New studio service`) or edit (a row snapshot). */
type EditingTarget = { mode: 'create' } | { mode: 'edit'; row: StudioServiceWithBranches };

/** One editor save: the target plus the exact field state the user saw. */
type SaveStudioServiceInput = EditingTarget & { state: StudioServiceEditorState };

/**
 * One editor save's outcome: the mutationFn runs the whole entity+matrix
 * chain, so `matrix-failed` has to carry the created row — AQ-4's
 * promote-to-edit anchor on the retry.
 */
type SaveStudioServiceOutcome =
  | { kind: 'saved' }
  | {
      kind: 'entity-failed';
      input: SaveStudioServiceInput;
      result: Extract<AdminMutationResult<StudioServiceWithBranches>, { ok: false }>;
    }
  | {
      kind: 'matrix-failed';
      input: SaveStudioServiceInput;
      created: StudioServiceWithBranches;
      message: string;
    };

/** One bulk loop's outcome: `failed` stops the count and names the row. */
interface BulkFlipOutcome {
  next: boolean;
  count: number;
  failed: { failedName: string; message: string } | null;
}

/** One flip of the row switch: the source row (payload donor) + the target. */
interface FlipInput {
  row: StudioServiceWithBranches;
  isActive: boolean;
}

/** The pending posture's fixed four rows — stable keys, never reordered. */
const PENDING_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4'];

/** Order-insensitive set equality over branch id lists (the edit save's matrix-diff gate). */
function sameBranchSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const pool = new Set(b);
  return a.every((id) => pool.has(id));
}

export function StudioServicesScreen() {
  // Both lists load on this screen: the services are the table, the branches
  // are the badge join AND the editor matrix's vocabulary.
  const servicesQuery = useQuery(adminStudioServiceQueries.all());
  const branchesQuery = useQuery(adminBranchQueries.all());
  const services = servicesQuery.data;
  const branches = branchesQuery.data;
  const isPending = servicesQuery.isPending || branchesQuery.isPending;
  const queryClient = useQueryClient();
  // T3: controlled disclosure — one expanded row at a time (id or null).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Deep-linkable in the prototype frame pass; here a plain selection.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // The #131 bulk ruling: selection rides the loaded row ids; the bar mounts
  // only while a selection exists. Sets REPLACE — never mutate in place.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  // The editor's create/edit switch and its open flag are separate on
  // purpose: the shared Save handler closes the Sheet unconditionally
  // (latch + exit), so a FAILED save re-arms `editorOpen` after the exit to
  // honor the stays-open-on-failure posture; `editing` carries the retry
  // target — INCLUDING AQ-4's create→edit promotion after a matrix failure
  // — and the parent-held `editorState` keeps the user's input intact.
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // Remounts the editor on a failed save's reopen: the component's visible
  // latch re-arms only on mount or an `open` false→true flip, and the flip
  // alone is lost when the failure lands mid-exit (open never went false).
  const [editorNonce, setEditorNonce] = useState(0);
  const [editorState, setEditorState] = useState<StudioServiceEditorState>(newStudioServiceState());
  const [fieldErrors, setFieldErrors] = useState<LightFieldErrors>({});
  const nameId = useId();
  const descriptionId = useId();
  const priceId = useId();
  const activeId = useId();

  // Badge-join vocabulary: id → branch for the row's bookableBranchIds, and
  // the deactivated branches' names as the badges' muted set (AQ-6).
  const branchesById = new Map((branches ?? []).map((branch) => [branch.id, branch]));
  const mutedBranchNames = new Set(
    (branches ?? []).filter((branch) => !branch.isActive).map((branch) => branch.name)
  );

  // Single-row flips: optimistic on the list cache (cancel + snapshot + patch
  // ONLY isActive; rollback + toast on error; invalidate either way) — the
  // posture 139's packages table pinned. The flip payload carries NO matrix
  // ids — relations are untouched by a flip.
  const flip = useMutation({
    // Result-valued fn (Task 2's seam): ok:false converts to a throw so the
    // optimistic handlers below own rollback + the error toast — a flip has
    // no inline field slot in the table, so a conflict surfaces as its
    // message.
    mutationFn: async ({ row, isActive }: FlipInput) => {
      const result = await saveAdminStudioServiceUpdate({
        data: { id: row.id, payload: buildStudioServiceFlipPayload(row, isActive) },
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async ({ row, isActive }) => {
      await queryClient.cancelQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
      const previous = queryClient.getQueryData<StudioServiceWithBranches[]>(
        adminStudioServiceQueries.all().queryKey
      );
      queryClient.setQueryData<StudioServiceWithBranches[]>(
        adminStudioServiceQueries.all().queryKey,
        (old) =>
          old?.map((candidate) =>
            candidate.id === row.id ? { ...candidate, isActive } : candidate
          )
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminStudioServiceQueries.all().queryKey, context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
    },
  });

  /**
   * The editor save: the entity full-object PUT first, then the branch
   * matrix full-replace PUT — the create-then-matrix save (AQ-4). Create
   * mode POSTs the entity and anchors the matrix PUT at the RETURNED row's
   * id (skipped entirely when the selection is empty). Edit mode PUTs the
   * entity and runs the matrix only when the selection's SET differs from
   * the snapshot's `bookableBranchIds` (order-insensitive — junction order
   * is the fact, membership is what round-trips). A matrix `!ok` does NOT
   * undo the entity write: onSuccess keeps the editor open with the
   * selections intact (AQ-5 — the retry's Save re-runs both PUTs; the
   * full-object PUT is idempotent) and switches a create-mode editor over
   * to edit-over-the-created-row, so the next Save re-runs as an UPDATE +
   * matrix — never a duplicate create. That mode switch is the
   * `matrix-failed` branch's promotion below.
   */
  const saveStudioService = useMutation({
    mutationFn: async (input: SaveStudioServiceInput): Promise<SaveStudioServiceOutcome> => {
      const entityResult =
        input.mode === 'create'
          ? await saveAdminStudioServiceCreate({ data: buildStudioServicePayload(input.state) })
          : await saveAdminStudioServiceUpdate({
              data: { id: input.row.id, payload: buildStudioServicePayload(input.state) },
            });
      if (!entityResult.ok) {
        return { kind: 'entity-failed', input, result: entityResult };
      }
      const matrixId = input.mode === 'create' ? entityResult.data.id : input.row.id;
      const needsMatrix =
        input.mode === 'create'
          ? input.state.branchIds.length > 0
          : !sameBranchSet(input.state.branchIds, input.row.bookableBranchIds);
      if (!needsMatrix) {
        return { kind: 'saved' };
      }
      const matrixResult = await saveAdminStudioServiceBranchMatrix({
        data: { id: matrixId, branchIds: input.state.branchIds },
      });
      if (!matrixResult.ok) {
        return {
          kind: 'matrix-failed',
          input,
          created: entityResult.data,
          message: matrixResult.message,
        };
      }
      return { kind: 'saved' };
    },
    onSuccess: (outcome) => {
      if (outcome.kind === 'matrix-failed') {
        // The entity write landed; the matrix PUT failed. The editor STAYS
        // OPEN with the selections intact — the retry's Save re-runs both
        // PUTs. AQ-4's mode switch: a create that already created promotes
        // to edit-over-the-created-row, so the retry is an UPDATE + matrix,
        // never a duplicate create. The services list invalidates — the
        // entity half of the save is real in the DB either way.
        // `editing` re-arms for BOTH modes: the shared Save handler closed
        // the Sheet and `onExitComplete` nulls `editing` after the 300ms
        // exit — this handler lands AFTER that (two full round trips), so
        // without the re-arm `setEditorOpen(true)` renders nothing behind
        // the `editing ?` guard. Create promotes to the created row (AQ-4);
        // edit re-arms the outcome input's row — the snapshot the save ran
        // against, not a stale closure.
        if (outcome.input.mode === 'create') {
          setEditing({ mode: 'edit', row: outcome.created });
        } else {
          setEditing({ mode: 'edit', row: outcome.input.row });
        }
        setEditorOpen(true);
        setEditorNonce((n) => n + 1);
        queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
        toast.error(`Saved, but the branch matrix failed: ${outcome.message}`);
        return;
      }
      if (outcome.kind === 'entity-failed') {
        // !ok: a name conflict marks the Name Field; no details → the message
        // toast. The reopen replays the enter animation over the intact state.
        const nameConflict = conflictFieldErrors(outcome.result.details).name;
        if (nameConflict) {
          setFieldErrors({ name: nameConflict });
        }
        if (!outcome.result.details) {
          toast.error(outcome.result.message);
        }
        keepEditorOpen(outcome.input);
        return;
      }
      queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
      queryClient.invalidateQueries({ queryKey: adminBranchQueries.all().queryKey });
      toast.success('Saved.');
    },
    onError: (error, input) => {
      // Not an API failure (serialization, session loss) — loud toast, same
      // keep-open posture.
      toast.error(error.message);
      keepEditorOpen(input);
    },
  });

  // Bulk flips: NOT optimistic — the sequential loop is the source of truth;
  // the invalidate refetches. SEQUENTIAL in list order over the selected rows
  // that still need the flip (deactivate → the ACTIVE selected; reactivate →
  // the INACTIVE selected); the first !ok stops the loop.
  const bulkFlip = useMutation({
    mutationFn: async ({ next }: { next: boolean }): Promise<BulkFlipOutcome> => {
      const targets = (services ?? []).filter(
        (row) => selected.has(row.id) && row.isActive !== next
      );
      let count = 0;
      for (const row of targets) {
        const result = await saveAdminStudioServiceUpdate({
          data: { id: row.id, payload: buildStudioServiceFlipPayload(row, next) },
        });
        if (!result.ok) {
          return { next, count, failed: { failedName: row.name, message: result.message } };
        }
        count += 1;
      }
      return { next, count, failed: null };
    },
    onSuccess: (outcome) => {
      queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
      setSelected(new Set());
      if (outcome.failed) {
        toast.error(`Failed to update ${outcome.failed.failedName}: ${outcome.failed.message}`);
        return;
      }
      toast.success(
        outcome.next ? `Reactivated ${outcome.count} items.` : `Deactivated ${outcome.count} items.`
      );
    },
  });

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function toggleAll(next: boolean) {
    setSelected(next ? new Set((services ?? []).map((row) => row.id)) : new Set());
  }

  function toggleSelected(id: string, next: boolean) {
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (next) {
        nextSet.add(id);
      } else {
        nextSet.delete(id);
      }
      return nextSet;
    });
  }

  /** One matrix card toggle: the state's branchIds REPLACE (click order). */
  function toggleBranch(branchId: string) {
    setEditorState((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter((id) => id !== branchId)
        : [...prev.branchIds, branchId],
    }));
  }

  function openCreate() {
    setEditorState(newStudioServiceState());
    setFieldErrors({});
    setEditing({ mode: 'create' });
    setEditorOpen(true);
  }

  function openEdit(row: StudioServiceWithBranches) {
    setEditorState(studioServiceStateFromRead(row));
    setFieldErrors({});
    setEditing({ mode: 'edit', row });
    setEditorOpen(true);
  }

  /** Re-arms the editor after a failed save (see the state comments above). */
  function keepEditorOpen(input: SaveStudioServiceInput) {
    setEditing(input.mode === 'create' ? { mode: 'create' } : { mode: 'edit', row: input.row });
    setEditorOpen(true);
    setEditorNonce((n) => n + 1);
  }

  function handleEditorSave() {
    if (!editing) {
      return;
    }
    const errors = validateStudioServiceState(editorState);
    if (errors.name || errors.description || errors.price) {
      setFieldErrors(errors);
      toast.error('Fix the highlighted fields.');
      // Veto-throw: the shared Save button closes the Sheet unconditionally
      // when onSave returns normally (onSave(); setVisible(false)); the only
      // synchronous keep-open channel in the landed LightEntityEditor is a
      // throw, and shared.tsx sits outside this ticket's scope fence. React
      // reports it as an uncaught event-handler error — deliberate, never
      // user-visible; the inline errors + toast are the UX.
      throw new Error('studio-service-editor-validation-hold');
    }
    setFieldErrors({});
    saveStudioService.mutate(
      editing.mode === 'create'
        ? { mode: 'create', state: editorState }
        : { mode: 'edit', row: editing.row, state: editorState }
    );
  }

  // The table's one action shape: the sheet-opening Edit icon.
  function editButton(row: StudioServiceWithBranches) {
    return (
      <Button
        variant='ghost'
        size='icon-sm'
        type='button'
        aria-label='Edit'
        onClick={() => openEdit(row)}
      >
        <SquarePen aria-hidden='true' />
      </Button>
    );
  }

  const confirmRow = services?.find((row) => row.id === confirmId);

  return (
    <section className='space-y-4'>
      <PageHeader
        title='Studio services'
        subline='Standalone services bookable on their own, with per-branch availability.'
        actions={
          <Button type='button' onClick={openCreate}>
            New studio service
          </Button>
        }
      />

      {isPending || !services ? (
        // Pending posture: skeleton rows echoing the two-line row anatomy
        // (checkbox, name + description, price) at the table's rhythm.
        <Card className='@container rounded-lg'>
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
      ) : services.length === 0 ? (
        // TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items)
        <EmptyState line='No studio services yet.'>
          <Button type='button' onClick={openCreate}>
            New studio service
          </Button>
        </EmptyState>
      ) : (
        <Card className='@container rounded-lg'>
          <CardContent>
            {/* @container: the table folds into stacked rows below a 700px
                CONTAINER width (Tailwind v4 native container queries). The
                TooltipProvider is the per-table one the name tooltips use
                (A3). The TODO(token-ruling) radius step-down is flagged at
                its ruling site in the pattern library, not re-declared. */}
            <TooltipProvider>
              <Table className='@max-[700px]:hidden'>
                <TableHeader>
                  <TableRow>
                    <BulkSelectHeader
                      total={services.length}
                      selectedCount={selected.size}
                      onToggleAll={toggleAll}
                    />
                    <TableHead>Name</TableHead>
                    <TableHead className='text-right'>Price</TableHead>
                    <TableHead>Branches</TableHead>
                    {/* T2: the Actions header renders empty — the icons carry
                      their own labels. */}
                    <TableHead className='text-right' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((row) => {
                    const bookableNames = row.bookableBranchIds
                      .map((id) => branchesById.get(id)?.name)
                      .filter((name): name is string => name !== undefined);
                    const expanded = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        {/* N3: whole-row click toggles expansion — the actions
                          cell stops propagation so icon clicks never toggle
                          (the checkbox cell stops it too, inside the shared
                          bulk piece); the chevron stays the keyboard/AT
                          toggle. */}
                        <ExpandRow
                          expanded={expanded}
                          className='group'
                          onClick={() => toggleExpanded(row.id)}
                        >
                          <BulkSelectCell
                            selected={selected.has(row.id)}
                            onToggle={(next) => toggleSelected(row.id, next)}
                            label={row.name}
                          />
                          <TableCell className='cursor-pointer'>
                            {/* T1: identity = name / dot + description. Round 4:
                              the dot sits BESIDE the name (the
                              lookups-attires reference pattern) so it never
                              strands on its own line when the description
                              hides. A3: the name truncates when the column is
                              squeezed and the tooltip carries the full text. */}
                            <div className='space-y-0.5'>
                              <div className='flex items-center gap-2'>
                                <StatusBadge isActive={row.isActive} />
                                <ActionTooltip
                                  label={row.name}
                                  button={
                                    <p className='min-w-0 truncate font-semibold'>{row.name}</p>
                                  }
                                />
                              </div>
                              {/* N2: the truncated line hides while expanded.
                                A1: the line indents by the dot (size-2.5) +
                                its gap-2 — 4.5 spacing steps — so the text
                                aligns with the name above it. */}
                              {expanded ? null : (
                                <div className='flex min-w-0 items-center pl-4.5'>
                                  <p className='text-muted-foreground truncate text-xs'>
                                    {row.description}
                                  </p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className='text-right tabular-nums cursor-pointer'>
                            {peso(row.priceCents)}
                          </TableCell>
                          <TableCell className='cursor-pointer'>
                            {/* S2/AQ-6: the bookable branches as outline
                              badges; a deactivated branch's badge dims. */}
                            <RelationBadges names={bookableNames} mutedNames={mutedBranchNames} />
                          </TableCell>
                          <TableCell className='text-right' onClick={(e) => e.stopPropagation()}>
                            <RowActionsCluster
                              expanded={expanded}
                              onToggle={() => toggleExpanded(row.id)}
                              edit={editButton(row)}
                              isActive={row.isActive}
                              onDeactivate={() => setConfirmId(row.id)}
                              onReactivate={() => flip.mutate({ row, isActive: true })}
                            />
                          </TableCell>
                        </ExpandRow>
                        {/* T3 desktop reveal: the FULL description. */}
                        <ExpandPanel open={expanded} colSpan={5}>
                          {row.description}
                        </ExpandPanel>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>

            {/* Stacked posture (below 700px container width): the whole
                two-line header toggles the animated reveal (M1); branch
                badges live ONLY in the reveal (S2). */}
            <div className='hidden flex-col @max-[700px]:flex'>
              {services.map((row) => {
                const bookableNames = row.bookableBranchIds
                  .map((id) => branchesById.get(id)?.name)
                  .filter((name): name is string => name !== undefined);
                const expanded = expandedId === row.id;
                return (
                  <div key={row.id} className='border-border border-b py-2 last:border-b-0'>
                    <button
                      type='button'
                      aria-expanded={expanded}
                      className='w-full text-left'
                      onClick={() => toggleExpanded(row.id)}
                    >
                      <div className='flex items-center justify-between gap-3'>
                        <div className='flex min-w-0 items-center gap-2'>
                          <StatusBadge isActive={row.isActive} />
                          <p className='truncate font-medium'>{row.name}</p>
                        </div>
                        <p className='text-right tabular-nums'>{peso(row.priceCents)}</p>
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
                        {/* S2/AQ-6: badges live only in the reveal, dimmed
                            for deactivated branches. */}
                        <RelationBadges names={bookableNames} mutedNames={mutedBranchNames} />
                        <div className='flex gap-1'>
                          <RowIconActions
                            edit={editButton(row)}
                            isActive={row.isActive}
                            onDeactivate={() => setConfirmId(row.id)}
                            onReactivate={() => flip.mutate({ row, isActive: true })}
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
      )}

      {editing ? (
        <LightEntityEditor
          key={editorNonce}
          title={editing.mode === 'create' ? 'New studio service' : editing.row.name}
          description='Fields plus the branches this service is bookable at.'
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
            <FieldLabel htmlFor={nameId}>Name</FieldLabel>
            <Input
              id={nameId}
              value={editorState.name}
              onChange={(e) => setEditorState({ ...editorState, name: e.target.value })}
            />
            {fieldErrors.name ? (
              <p className='text-destructive text-xs'>{fieldErrors.name}</p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
            <Textarea
              id={descriptionId}
              rows={3}
              value={editorState.description}
              onChange={(e) => setEditorState({ ...editorState, description: e.target.value })}
            />
            {fieldErrors.description ? (
              <p className='text-destructive text-xs'>{fieldErrors.description}</p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={priceId}>Price</FieldLabel>
            <div className='relative'>
              <span className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm'>
                ₱
              </span>
              <Input
                id={priceId}
                type='number'
                className='pl-7 tabular-nums'
                value={editorState.priceCents / 100}
                onChange={(e) =>
                  setEditorState({
                    ...editorState,
                    // The pinned controlled mapping (prototype-verbatim):
                    // pesos in the box, centavos in state.
                    priceCents: Math.round(Number(e.target.value) * 100) || 0,
                  })
                }
              />
            </div>
            <FieldDescription>Stored as centavos.</FieldDescription>
            {fieldErrors.price ? (
              <p className='text-destructive text-xs'>{fieldErrors.price}</p>
            ) : null}
          </Field>
          <label htmlFor={activeId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={activeId}
              checked={editorState.isActive}
              onCheckedChange={(checked) =>
                setEditorState({ ...editorState, isActive: checked === true })
              }
            />
            Active
          </label>

          <section className='space-y-2'>
            <h3 className='text-sm font-medium'>Bookable at branches</h3>
            {/* Ruled V3: selectable name-only cards — NO checkbox inside; the
                selected state reads from the card. The FULL branches
                vocabulary renders, deactivated included: a deactivated branch
                dims to opacity-60 and STAYS selectable (AQ-6 — the admin
                matrix is staff-visible truth; the booking form filters).
                Toggling REPLACES the state's branchIds array (click order) —
                never a push into the aliased read row (Task 3's note). */}
            <div className='grid gap-2 sm:grid-cols-3'>
              {(branches ?? []).map((branch) => {
                const selectedBranch = editorState.branchIds.includes(branch.id);
                return (
                  <button
                    key={branch.id}
                    type='button'
                    aria-pressed={selectedBranch}
                    onClick={() => toggleBranch(branch.id)}
                    className={`rounded-lg border p-3 text-left text-sm font-medium transition-colors ${
                      selectedBranch ? 'border-primary ring-primary ring-1' : 'hover:bg-accent/50'
                    }${branch.isActive ? '' : ' opacity-60'}`}
                  >
                    {branch.name}
                  </button>
                );
              })}
            </div>
          </section>
        </LightEntityEditor>
      ) : null}

      {confirmRow ? (
        <DeactivateConfirm
          name={confirmRow.name}
          open={confirmId === confirmRow.id}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmId(null);
            }
          }}
          onConfirm={() => {
            flip.mutate({ row: confirmRow, isActive: false });
            setConfirmId(null);
          }}
        />
      ) : null}

      {/* AQ-3: the bulk confirm reuses the pinned dialog — the name argument
          carries the count, so the title reads `Deactivate 3 items?`. */}
      <DeactivateConfirm
        name={`${selected.size} items`}
        open={bulkConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          setBulkConfirmOpen(false);
          bulkFlip.mutate({ next: false });
        }}
      />

      {selected.size > 0 ? (
        <BulkActionBar
          selectedCount={selected.size}
          busy={bulkFlip.isPending}
          onDeactivate={() => setBulkConfirmOpen(true)}
          onReactivate={() => bulkFlip.mutate({ next: true })}
          onClear={() => setSelected(new Set())}
        />
      ) : null}
    </section>
  );
}
