// The branches screen (M5 #140): the consolidated-format table over live
// Branch rows — ruled by #131 and ported element-for-element from the
// composition of record (branch prototype/131-admin-cms-compositions,
// screens/branches.tsx, rounds 1–9), with the #131 bulk column + bar riding
// Task 4's pieces. The prototype's local fixture state is replaced by the
// task seams: `adminBranchQueries.all()` for the list; Task 3's state seam
// (`branchStateFromRead` / `newBranchState` / `buildBranchPayload` /
// `buildBranchFlipPayload` / `validateBranchState`) driving the create/edit
// Sheet editor and the optimistic single flips through the result-valued
// `saveAdminBranchUpdate` server fn. No hours/capacity fields — v2 (the
// subline says so); the address's only full-text slot is the expand reveal.
import type { Branch } from '@sevendays/types';
import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
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
import { TooltipProvider } from '@sevendays/ui/components/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SquarePen } from 'lucide-react';
import { Fragment, useId, useState } from 'react';
import { BulkActionBar, BulkSelectCell, BulkSelectHeader } from '#/components/cms/bulk-bar';
import {
  ActionTooltip,
  Collapse,
  DeactivateConfirm,
  EmptyState,
  ExpandPanel,
  ExpandRow,
  LightEntityEditor,
  PageHeader,
  QUERY_ERROR_LINE,
  QueryErrorState,
  RowActionsCluster,
  RowIconActions,
  StatusBadge,
} from '#/components/cms/shared';
import { saveAdminBranchCreate, saveAdminBranchUpdate } from '#/lib/admin.functions';
import { adminBranchQueries } from '#/lib/cms-queries';
import type { BranchEditorState, LightFieldErrors } from '#/lib/light-entity-state';
import {
  branchStateFromRead,
  buildBranchFlipPayload,
  buildBranchPayload,
  conflictFieldErrors,
  newBranchState,
  validateBranchState,
} from '#/lib/light-entity-state';

/** The editor's mode switch: create (from `New branch`) or edit (a row snapshot). */
type EditingTarget = { mode: 'create' } | { mode: 'edit'; row: Branch };

/** One editor save: the target plus the exact field state the user saw. */
type SaveBranchInput = EditingTarget & { state: BranchEditorState };

/** One bulk loop's outcome: `failed` stops the count and names the row. */
interface BulkFlipOutcome {
  next: boolean;
  count: number;
  failed: { failedName: string; message: string } | null;
}

/** One flip of the row switch: the source row (payload donor) + the target. */
interface FlipInput {
  row: Branch;
  isActive: boolean;
}

/** The pending posture's fixed four rows — stable keys, never reordered. */
const PENDING_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4'];

export function BranchesScreen() {
  const { data: branches, isPending, isError, refetch } = useQuery(adminBranchQueries.all());
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
  // target and the parent-held `editorState` keeps the user's input intact.
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // Remounts the editor on a failed save's reopen: the component's visible
  // latch re-arms only on mount or an `open` false→true flip, and the flip
  // alone is lost when the failure lands mid-exit (open never went false).
  const [editorNonce, setEditorNonce] = useState(0);
  const [editorState, setEditorState] = useState<BranchEditorState>(newBranchState);
  const [fieldErrors, setFieldErrors] = useState<LightFieldErrors>({});
  const nameId = useId();
  const addressId = useId();
  const phoneId = useId();
  const walkInsId = useId();
  const activeId = useId();

  // Single-row flips: optimistic on the list cache (cancel + snapshot + patch
  // ONLY isActive; rollback + toast on error; invalidate either way) — the
  // posture 139's packages table pinned.
  const flip = useMutation({
    // Result-valued fn (Task 2's seam): ok:false converts to a throw so the
    // optimistic handlers below own rollback + the error toast — a flip has
    // no inline field slot in the table, so a conflict surfaces as its
    // message.
    mutationFn: async ({ row, isActive }: FlipInput) => {
      const result = await saveAdminBranchUpdate({
        data: { id: row.id, payload: buildBranchFlipPayload(row, isActive) },
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async ({ row, isActive }) => {
      await queryClient.cancelQueries({ queryKey: adminBranchQueries.all().queryKey });
      const previous = queryClient.getQueryData<Branch[]>(adminBranchQueries.all().queryKey);
      queryClient.setQueryData<Branch[]>(adminBranchQueries.all().queryKey, (old) =>
        old?.map((candidate) => (candidate.id === row.id ? { ...candidate, isActive } : candidate))
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminBranchQueries.all().queryKey, context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminBranchQueries.all().queryKey });
    },
  });

  // Editor saves: NON-optimistic — the form state is the source of truth;
  // success invalidates + toasts + (the shared handler's) close, failure
  // keeps the editor open with the state intact (retry is safe — the save is
  // a full-object PUT).
  const saveBranch = useMutation({
    mutationFn: async (input: SaveBranchInput) => {
      const result =
        input.mode === 'create'
          ? await saveAdminBranchCreate({ data: buildBranchPayload(input.state) })
          : await saveAdminBranchUpdate({
              data: { id: input.row.id, payload: buildBranchPayload(input.state) },
            });
      return { input, result };
    },
    onSuccess: ({ input, result }) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminBranchQueries.all().queryKey });
        toast.success('Saved.');
        return;
      }
      // !ok: a name conflict marks the Name Field; no details → the message
      // toast. The reopen replays the enter animation over the intact state.
      const nameConflict = conflictFieldErrors(result.details).name;
      if (nameConflict) {
        setFieldErrors({ name: nameConflict });
      }
      if (!result.details) {
        toast.error(result.message);
      }
      keepEditorOpen(input);
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
      const targets = (branches ?? []).filter(
        (row) => selected.has(row.id) && row.isActive !== next
      );
      let count = 0;
      for (const row of targets) {
        const result = await saveAdminBranchUpdate({
          data: { id: row.id, payload: buildBranchFlipPayload(row, next) },
        });
        if (!result.ok) {
          return { next, count, failed: { failedName: row.name, message: result.message } };
        }
        count += 1;
      }
      return { next, count, failed: null };
    },
    onSuccess: (outcome) => {
      queryClient.invalidateQueries({ queryKey: adminBranchQueries.all().queryKey });
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
    setSelected(next ? new Set((branches ?? []).map((row) => row.id)) : new Set());
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

  function openCreate() {
    setEditorState(newBranchState());
    setFieldErrors({});
    setEditing({ mode: 'create' });
    setEditorOpen(true);
  }

  function openEdit(row: Branch) {
    setEditorState(branchStateFromRead(row));
    setFieldErrors({});
    setEditing({ mode: 'edit', row });
    setEditorOpen(true);
  }

  /** Re-arms the editor after a failed save (see the state comments above). */
  function keepEditorOpen(input: SaveBranchInput) {
    setEditing(input.mode === 'create' ? { mode: 'create' } : { mode: 'edit', row: input.row });
    setEditorOpen(true);
    setEditorNonce((n) => n + 1);
  }

  function handleEditorSave() {
    if (!editing) {
      return;
    }
    const errors = validateBranchState(editorState);
    if (errors.name || errors.address || errors.phone) {
      setFieldErrors(errors);
      toast.error('Fix the highlighted fields.');
      // Veto-throw: the shared Save button closes the Sheet only when onSave
      // returns normally — a throw is the keep-open veto and is swallowed there
      // (#143). The inline errors + toast are the UX.
      throw new Error('branch-editor-validation-hold');
    }
    setFieldErrors({});
    saveBranch.mutate(
      editing.mode === 'create'
        ? { mode: 'create', state: editorState }
        : { mode: 'edit', row: editing.row, state: editorState }
    );
  }

  // The table's one action shape: the sheet-opening Edit icon (packages
  // routes to an editor screen — branches opens the Sheet in place).
  function editButton(row: Branch) {
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

  const confirmRow = branches?.find((row) => row.id === confirmId);

  return (
    <section className='space-y-4'>
      <PageHeader
        title='Branches'
        subline='The three studio locations. Hours and slot capacity arrive with v2.'
        actions={
          <Button type='button' onClick={openCreate}>
            New branch
          </Button>
        }
      />

      {isError ? (
        // Error posture (#155): a failed read answers the ruled line +
        // Retry — never the skeleton-forever (the pending arm's `|| !data`
        // would otherwise hold the skeleton on a failed query).
        <QueryErrorState
          line={QUERY_ERROR_LINE}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : isPending || !branches ? (
        // Pending posture: skeleton rows echoing the two-line row anatomy
        // (checkbox, name + address, phone) at the table's rhythm.
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
      ) : branches.length === 0 ? (
        // TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items)
        <EmptyState line='No branches yet.'>
          <Button type='button' onClick={openCreate}>
            New branch
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
                      total={branches.length}
                      selectedCount={selected.size}
                      onToggleAll={toggleAll}
                    />
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Walk-ins</TableHead>
                    {/* T2: the Actions header renders empty — the icons carry
                      their own labels. */}
                    <TableHead className='text-right' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((row) => {
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
                            {/* B1: identity = name / dot + address (the address
                              column died — full text on expand). Round 4:
                              the dot sits BESIDE the name (the
                              lookups-attires reference pattern) so it never
                              strands on its own line when the address
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
                                    {row.address}
                                  </p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className='font-mono text-sm cursor-pointer'>
                            {row.phone}
                          </TableCell>
                          <TableCell className='cursor-pointer'>
                            {row.acceptsWalkIns ? (
                              <Badge variant='secondary'>Walk-in friendly</Badge>
                            ) : (
                              <span className='text-muted-foreground'>—</span>
                            )}
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
                        {/* T3 desktop reveal: the FULL address — the address
                          has no other full-text slot. */}
                        <ExpandPanel open={expanded} colSpan={5}>
                          {row.address}
                        </ExpandPanel>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>

            {/* Stacked posture (below 700px container width): the whole
                two-line header toggles the animated reveal (M1); line 1's
                right value is the Walk-in badge, phone moves to the reveal. */}
            <div className='hidden flex-col @max-[700px]:flex'>
              {branches.map((row) => {
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
                        {row.acceptsWalkIns ? (
                          <Badge variant='secondary'>Walk-in friendly</Badge>
                        ) : null}
                      </div>
                      {/* N2: the address line hides while expanded. A1:
                          dot-width indent, same as the desktop line 2. */}
                      {expanded ? null : (
                        <p className='text-muted-foreground mt-1 truncate pl-4.5 text-xs'>
                          {row.address}
                        </p>
                      )}
                    </button>
                    <Collapse open={expanded}>
                      <div className='mt-2 space-y-2'>
                        <p className='text-muted-foreground text-sm'>{row.address}</p>
                        <p className='font-mono text-sm'>{row.phone}</p>
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
          title={editing.mode === 'create' ? 'New branch' : editing.row.name}
          description='Name, address, phone, and the walk-in flag.'
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
            <FieldLabel htmlFor={addressId}>Address</FieldLabel>
            <Input
              id={addressId}
              value={editorState.address}
              onChange={(e) => setEditorState({ ...editorState, address: e.target.value })}
            />
            {fieldErrors.address ? (
              <p className='text-destructive text-xs'>{fieldErrors.address}</p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={phoneId}>Phone</FieldLabel>
            <Input
              id={phoneId}
              type='tel'
              value={editorState.phone}
              onChange={(e) => setEditorState({ ...editorState, phone: e.target.value })}
            />
            {fieldErrors.phone ? (
              <p className='text-destructive text-xs'>{fieldErrors.phone}</p>
            ) : null}
          </Field>
          <div className='flex flex-wrap gap-6'>
            <label htmlFor={walkInsId} className='flex items-center gap-2 text-sm font-medium'>
              <Checkbox
                id={walkInsId}
                checked={editorState.acceptsWalkIns}
                onCheckedChange={(checked) =>
                  setEditorState({ ...editorState, acceptsWalkIns: checked === true })
                }
              />
              Accepts walk-ins
            </label>
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
          </div>
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
