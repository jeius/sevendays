// The add-ons screen (M5 #140): the consolidated-format table over live
// AddonService rows — ruled by #131 and ported element-for-element from the
// composition of record (branch prototype/131-admin-cms-compositions,
// screens/add-ons.tsx, rounds 1–5 digested in its header), with the #131
// bulk column + bar riding Task 4's pieces and the applies-to relation
// rendering through RelationBadges (dedicated column on desktop, reveal-only
// on mobile). The relation is DERIVED: the bare add-on read embeds no
// applicability ids, so the badges join the services read — the services
// whose `applicableAddonServiceIds` include the row's id. The prototype's
// local fixture state is replaced by the task seams:
// `adminAddonQueries.all()` + `adminStudioServiceQueries.all()` (the badge
// join AND the editor matrix's vocabulary + diff source), Task 3's state
// seam (addonStateFromRead / newAddonState / buildAddonPayload /
// buildAddonFlipPayload / validateAddonState / buildAddonMatrixDiff)
// driving the create/edit Sheet editor, and Task 2's result-valued save fns
// behind the create-then-fan-out save (AQ-4). The matrix renders as the
// ruled CHECKBOX rows — ticket #140's override of the prototype's
// name-only cards (AQ-8): one `flex items-center gap-3 rounded-lg border
// p-3` row per studio service, checkbox + NAME ONLY; a deactivated service
// dims to opacity-60 and stays checkable (AQ-6: the admin matrix is
// staff-visible truth; the booking form filters). The save is AQ-1's client
// fan-out — the junction is service-keyed (#137), so toggling one add-on's
// applicability PUTs one full-replace per AFFECTED service via
// `buildAddonMatrixDiff`. Not here: any add-on-keyed matrix route (the
// fan-out IS the design), per-service matrix editing on the services screen
// (AQ-1's split), hours/capacity.
import type { AddonService, StudioServiceWithBranches } from '@sevendays/types';
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
  QUERY_ERROR_LINE,
  QueryErrorState,
  RowActionsCluster,
  RowIconActions,
  StatusBadge,
} from '#/components/cms/shared';
import type { AdminMutationResult } from '#/lib/admin.functions';
import {
  saveAdminAddonCreate,
  saveAdminAddonUpdate,
  saveAdminStudioServiceAddonMatrix,
} from '#/lib/admin.functions';
import { bulkConfirmName } from '#/lib/bulk-counts';
import { adminAddonQueries, adminStudioServiceQueries } from '#/lib/cms-queries';
import type { AddonEditorState, LightFieldErrors } from '#/lib/light-entity-state';
import {
  addonStateFromRead,
  buildAddonFlipPayload,
  buildAddonMatrixDiff,
  buildAddonPayload,
  conflictFieldErrors,
  newAddonState,
  validateAddonState,
} from '#/lib/light-entity-state';

/**
 * The editor's mode switch: create (from `New add-on`) or edit (a row
 * snapshot). Both carry the services snapshot the editor OPENED with — the
 * badge join's vocabulary AND the matrix's checked-state seed AND the save
 * diff's source, pinned at open time, never re-read at save.
 */
type EditingTarget =
  | { mode: 'create'; services: StudioServiceWithBranches[] }
  | { mode: 'edit'; row: AddonService; services: StudioServiceWithBranches[] };

/** One editor save: the target plus the exact field state the user saw. */
type SaveAddonInput = EditingTarget & { state: AddonEditorState };

/**
 * One editor save's outcome: the mutationFn runs the whole entity+fan-out
 * chain, so `matrix-failed` has to carry the created row — AQ-4's
 * promote-to-edit anchor on the retry — plus the failed service's NAME,
 * resolved from the snapshot for the toast.
 */
type SaveAddonOutcome =
  | { kind: 'saved' }
  | {
      kind: 'entity-failed';
      input: SaveAddonInput;
      result: Extract<AdminMutationResult<AddonService>, { ok: false }>;
    }
  | {
      kind: 'matrix-failed';
      input: SaveAddonInput;
      created: AddonService;
      failedServiceName: string;
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
  row: AddonService;
  isActive: boolean;
}

/** The pending posture's fixed four rows — stable keys, never reordered. */
const PENDING_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4'];

export function AddonsScreen() {
  // Both lists load on this screen: the add-ons are the table, the services
  // are the badge join AND the editor matrix's vocabulary + diff source.
  const addonsQuery = useQuery(adminAddonQueries.all());
  const servicesQuery = useQuery(adminStudioServiceQueries.all());
  const addons = addonsQuery.data;
  const services = servicesQuery.data;
  const isPending = addonsQuery.isPending || servicesQuery.isPending;
  const isError = addonsQuery.isError || servicesQuery.isError;
  const refetchReads = () => {
    void addonsQuery.refetch();
    void servicesQuery.refetch();
  };
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
  // — plus the pinned services snapshot, and the parent-held `editorState`
  // keeps the user's input intact.
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // Remounts the editor on a failed save's reopen: the component's visible
  // latch re-arms only on mount or an `open` false→true flip, and the flip
  // alone is lost when the failure lands mid-exit (open never went false).
  const [editorNonce, setEditorNonce] = useState(0);
  const [editorState, setEditorState] = useState<AddonEditorState>(newAddonState());
  const [fieldErrors, setFieldErrors] = useState<LightFieldErrors>({});
  const nameId = useId();
  const descriptionId = useId();
  const priceId = useId();
  const activeId = useId();

  // Badge-join vocabulary: the services read is the DERIVED relation's
  // source (the add-on row embeds no applicability ids), and the
  // deactivated services' names are the badges' muted set (AQ-6).
  const mutedServiceNames = new Set(
    (services ?? []).filter((service) => !service.isActive).map((service) => service.name)
  );

  // Single-row flips: optimistic on the list cache (cancel + snapshot + patch
  // ONLY isActive; rollback + toast on error; invalidate either way) — the
  // posture 139's packages table pinned. The flip payload carries NO matrix
  // ids — applicability is service-keyed and untouched by a flip.
  const flip = useMutation({
    // Result-valued fn (Task 2's seam): ok:false converts to a throw so the
    // optimistic handlers below own rollback + the error toast — a flip has
    // no inline field slot in the table, so a conflict surfaces as its
    // message.
    mutationFn: async ({ row, isActive }: FlipInput) => {
      const result = await saveAdminAddonUpdate({
        data: { id: row.id, payload: buildAddonFlipPayload(row, isActive) },
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async ({ row, isActive }) => {
      await queryClient.cancelQueries({ queryKey: adminAddonQueries.all().queryKey });
      const previous = queryClient.getQueryData<AddonService[]>(adminAddonQueries.all().queryKey);
      queryClient.setQueryData<AddonService[]>(adminAddonQueries.all().queryKey, (old) =>
        old?.map((candidate) => (candidate.id === row.id ? { ...candidate, isActive } : candidate))
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminAddonQueries.all().queryKey, context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminAddonQueries.all().queryKey });
    },
  });

  /**
   * The editor save: the entity full-object PUT first, then AQ-1's client
   * fan-out — the junction is service-keyed (#137), so the applies-to save
   * is `buildAddonMatrixDiff` over the PINNED services snapshot, one
   * full-replace PUT per AFFECTED service, SEQUENTIAL (the first `!ok`
   * stops the loop). The diff empty = zero PUTs — an unchanged edit's
   * matrix rides entirely on the entity PUT, and a create with an empty
   * selection fans out nothing. A matrix `!ok` does NOT undo the entity
   * write (nor the PUTs before the failure): onSuccess keeps the editor
   * open with the checks intact (AQ-5 — the retry's Save re-runs the whole
   * chain; every PUT is a full-replace/idempotent) and switches a
   * create-mode editor over to edit-over-the-created-row, so the next Save
   * re-runs as an UPDATE + fan-out — never a duplicate create. That mode
   * switch is the `matrix-failed` branch's promotion below.
   */
  const saveAddon = useMutation({
    mutationFn: async (input: SaveAddonInput): Promise<SaveAddonOutcome> => {
      const entityResult =
        input.mode === 'create'
          ? await saveAdminAddonCreate({ data: buildAddonPayload(input.state) })
          : await saveAdminAddonUpdate({
              data: { id: input.row.id, payload: buildAddonPayload(input.state) },
            });
      if (!entityResult.ok) {
        return { kind: 'entity-failed', input, result: entityResult };
      }
      const addonId = input.mode === 'create' ? entityResult.data.id : input.row.id;
      const diff = buildAddonMatrixDiff(input.services, addonId, input.state.appliesToServiceIds);
      for (const entry of diff) {
        const matrixResult = await saveAdminStudioServiceAddonMatrix({
          data: { id: entry.serviceId, addonServiceIds: entry.payload.addonServiceIds },
        });
        if (!matrixResult.ok) {
          return {
            kind: 'matrix-failed',
            input,
            created: entityResult.data,
            failedServiceName:
              input.services.find((service) => service.id === entry.serviceId)?.name ??
              entry.serviceId,
            message: matrixResult.message,
          };
        }
      }
      return { kind: 'saved' };
    },
    onSuccess: (outcome) => {
      if (outcome.kind === 'matrix-failed') {
        // The entity write landed (and possibly earlier fan-out PUTs); the
        // failing matrix PUT did not. The editor STAYS OPEN with the checks
        // intact — the retry's Save re-runs the chain. AQ-4's mode switch:
        // a create that already created promotes to edit-over-the-created-
        // row, so the retry is an UPDATE + fan-out, never a duplicate
        // create. BOTH lists invalidate — the entity half is real in the DB
        // either way, and the PUTs before the failure may have landed too.
        // `editing` re-arms for BOTH modes: the shared Save handler closed
        // the Sheet and `onExitComplete` nulls `editing` after the 300ms
        // exit — this handler lands AFTER that (two full round trips), so
        // without the re-arm `setEditorOpen(true)` renders nothing behind
        // the `editing ?` guard. Create promotes to the created row (AQ-4);
        // edit re-arms the outcome input's row — the snapshot the save ran
        // against, not a stale closure.
        if (outcome.input.mode === 'create') {
          setEditing({ mode: 'edit', row: outcome.created, services: outcome.input.services });
        } else {
          setEditing({
            mode: 'edit',
            row: outcome.input.row,
            services: outcome.input.services,
          });
        }
        setEditorOpen(true);
        setEditorNonce((n) => n + 1);
        queryClient.invalidateQueries({ queryKey: adminAddonQueries.all().queryKey });
        queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
        toast.error(
          `Saved, but the ${outcome.failedServiceName} matrix failed: ${outcome.message}`
        );
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
      // The badges live on the services read — both lists invalidate.
      queryClient.invalidateQueries({ queryKey: adminAddonQueries.all().queryKey });
      queryClient.invalidateQueries({ queryKey: adminStudioServiceQueries.all().queryKey });
      toast.success('Saved.');
    },
    onError: (error, input) => {
      // Bounded duplicate-POST window: a fast double-submit (or the
      // thrown-create retry re-arming create mode) can fire the create
      // twice — the second lands on the unique-name constraint and
      // surfaces as its 400 conflict message, never a duplicate row.
      // Not an API failure (serialization, session loss) — loud toast, same
      // keep-open posture.
      toast.error(error.message);
      keepEditorOpen(input);
    },
  });

  // Bulk flips: NOT optimistic — the sequential loop is the source of truth;
  // the invalidate refetches. SEQUENTIAL in list order over the selected rows
  // that still need the flip (deactivate → the ACTIVE selected; reactivate →
  // the INACTIVE selected); the first !ok stops the loop. The flip touches
  // NO relations (applicability is service-keyed) — the addons list is the
  // only cache to invalidate.
  const bulkFlip = useMutation({
    mutationFn: async ({ next }: { next: boolean }): Promise<BulkFlipOutcome> => {
      const targets = (addons ?? []).filter((row) => selected.has(row.id) && row.isActive !== next);
      let count = 0;
      for (const row of targets) {
        const result = await saveAdminAddonUpdate({
          data: { id: row.id, payload: buildAddonFlipPayload(row, next) },
        });
        if (!result.ok) {
          return { next, count, failed: { failedName: row.name, message: result.message } };
        }
        count += 1;
      }
      return { next, count, failed: null };
    },
    onSuccess: (outcome) => {
      queryClient.invalidateQueries({ queryKey: adminAddonQueries.all().queryKey });
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
    setSelected(next ? new Set((addons ?? []).map((row) => row.id)) : new Set());
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

  /** One matrix checkbox toggle: the state's appliesToServiceIds REPLACE (click order). */
  function toggleService(serviceId: string) {
    setEditorState((prev) => ({
      ...prev,
      appliesToServiceIds: prev.appliesToServiceIds.includes(serviceId)
        ? prev.appliesToServiceIds.filter((id) => id !== serviceId)
        : [...prev.appliesToServiceIds, serviceId],
    }));
  }

  function openCreate() {
    setEditorState(newAddonState());
    setFieldErrors({});
    setEditing({ mode: 'create', services: services ?? [] });
    setEditorOpen(true);
  }

  function openEdit(row: AddonService) {
    // The snapshot pins at open: the bare add-on read embeds no applicability
    // ids, so the local appliesToServiceIds seeds from the services read —
    // the services whose applicableAddonServiceIds include this row — and
    // the save diffs against this same pinned array, never a re-read.
    const snapshot = services ?? [];
    setEditorState({
      ...addonStateFromRead(row),
      appliesToServiceIds: snapshot
        .filter((service) => service.applicableAddonServiceIds.includes(row.id))
        .map((service) => service.id),
    });
    setFieldErrors({});
    setEditing({ mode: 'edit', row, services: snapshot });
    setEditorOpen(true);
  }

  /** Re-arms the editor after a failed save (see the state comments above). */
  function keepEditorOpen(input: SaveAddonInput) {
    setEditing(
      input.mode === 'create'
        ? { mode: 'create', services: input.services }
        : { mode: 'edit', row: input.row, services: input.services }
    );
    setEditorOpen(true);
    setEditorNonce((n) => n + 1);
  }

  function handleEditorSave() {
    if (!editing) {
      return;
    }
    const errors = validateAddonState(editorState);
    if (errors.name || errors.description || errors.price) {
      setFieldErrors(errors);
      toast.error('Fix the highlighted fields.');
      // Veto-throw: the shared Save button closes the Sheet only when onSave
      // returns normally — a throw is the keep-open veto and is swallowed there
      // (#143). The inline errors + toast are the UX.
      throw new Error('addon-editor-validation-hold');
    }
    setFieldErrors({});
    saveAddon.mutate(
      editing.mode === 'create'
        ? { mode: 'create', services: editing.services, state: editorState }
        : { mode: 'edit', row: editing.row, services: editing.services, state: editorState }
    );
  }

  // The table's one action shape: the sheet-opening Edit icon.
  function editButton(row: AddonService) {
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

  const confirmRow = addons?.find((row) => row.id === confirmId);

  return (
    <section className='space-y-4'>
      <PageHeader
        title='Add-ons'
        subline='Extras attached at booking time, with the services they apply to.'
        actions={
          <Button type='button' onClick={openCreate}>
            New add-on
          </Button>
        }
      />

      {isError ? (
        <QueryErrorState line={QUERY_ERROR_LINE} onRetry={refetchReads} />
      ) : isPending || !addons ? (
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
      ) : addons.length === 0 ? (
        // TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items)
        <EmptyState line='No add-ons yet.'>
          <Button type='button' onClick={openCreate}>
            New add-on
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
                      total={addons.length}
                      selectedCount={selected.size}
                      onToggleAll={toggleAll}
                    />
                    <TableHead>Name</TableHead>
                    <TableHead className='text-right'>Price</TableHead>
                    <TableHead>Services</TableHead>
                    {/* T2: the Actions header renders empty — the icons carry
                      their own labels. */}
                    <TableHead className='text-right' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addons.map((row) => {
                    // The DERIVED relation: the services whose
                    // applicableAddonServiceIds include this add-on.
                    const applyingNames = (services ?? [])
                      .filter((service) => service.applicableAddonServiceIds.includes(row.id))
                      .map((service) => service.name);
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
                            {/* S2/AQ-6: the applies-to services as outline
                              badges; a deactivated service's badge dims. */}
                            <RelationBadges names={applyingNames} mutedNames={mutedServiceNames} />
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
                two-line header toggles the animated reveal (M1); service
                badges live ONLY in the reveal (S2). */}
            <div className='hidden flex-col @max-[700px]:flex'>
              {addons.map((row) => {
                const applyingNames = (services ?? [])
                  .filter((service) => service.applicableAddonServiceIds.includes(row.id))
                  .map((service) => service.name);
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
                            for deactivated services. */}
                        <RelationBadges names={applyingNames} mutedNames={mutedServiceNames} />
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
          title={editing.mode === 'create' ? 'New add-on' : editing.row.name}
          description='Fields plus the studio services this add-on applies to.'
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
            <h3 className='text-sm font-medium'>Applies to services</h3>
            {/* Ruled CHECKBOX matrix — ticket #140's override of the
                prototype's name-only cards (AQ-8): one row per studio
                service, checkbox + NAME ONLY (no price). The FULL services
                vocabulary renders from the pinned snapshot, deactivated
                included: a deactivated service dims to opacity-60 and STAYS
                checkable (AQ-6 — the admin matrix is staff-visible truth;
                the booking form filters). Checked reads the local
                appliesToServiceIds list (seeded from the snapshot at open);
                toggling REPLACES the array (click order) — never a push
                into the aliased read row (Task 3's note). */}
            <div className='grid gap-2'>
              {editing.services.map((service) => {
                const checkedService = editorState.appliesToServiceIds.includes(service.id);
                return (
                  <label
                    key={service.id}
                    htmlFor={service.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm font-medium${
                      service.isActive ? '' : ' opacity-60'
                    }`}
                  >
                    <Checkbox
                      id={service.id}
                      checked={checkedService}
                      onCheckedChange={() => toggleService(service.id)}
                    />
                    {service.name}
                  </label>
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

      {/* AQ-3 + #155: the bulk confirm reuses the pinned dialog — the name
          argument is the eligible-aware count (owner-ratified): the title
          reads `Deactivate 3 items?` when every selected row will flip, and
          `Deactivate 2 of 3 selected items?` when some are already inactive
          (the toast has always counted eligible-only flips). */}
      <DeactivateConfirm
        name={bulkConfirmName(
          selected.size,
          (addons ?? []).filter((row) => selected.has(row.id) && row.isActive).length
        )}
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
