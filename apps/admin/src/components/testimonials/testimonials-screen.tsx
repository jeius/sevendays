// The testimonials screen (M5 #141): the person-main table over live
// Testimonial rows — ported element-for-element from the composition of
// record (prototype/131-admin-cms-compositions, screens/testimonials.tsx,
// rounds 2–5) onto the task seams. The prototype's local fixture state is
// replaced by: `adminTestimonialQueries.all()` for the list; Task 4's state
// seam (`testimonialStateFromRead` / `newTestimonialState` /
// `buildTestimonialPayload` / `buildTestimonialFlipPayload` /
// `validateTestimonialState`) driving the create/edit Sheet editor and the
// optimistic single flips; Task 3's result-valued save fns. No Position
// column and no position field anywhere — array order is the display order,
// owned by the order PUT that fires on drop (optimistic via Task 4's
// `reorderIds` + `buildTestimonialOrderPayload`; `!ok` → snapshot restore +
// toast + invalidate, AR-9). Round-3 ruling: rows drag by the GripVertical
// grip ONLY (activation lives on the handle; the row's clean click toggles
// expansion), pinned to PointerSensor distance 4 — no TouchSensor long-press
// (the grip's `touch-none` owns the scroll conflict).
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Testimonial } from '@sevendays/types';
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
import { Textarea } from '@sevendays/ui/components/textarea';
import { TooltipProvider } from '@sevendays/ui/components/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, SquarePen } from 'lucide-react';
import type { ReactNode } from 'react';
import { Fragment, useId, useState } from 'react';
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
import {
  saveAdminTestimonialCreate,
  saveAdminTestimonialOrder,
  saveAdminTestimonialUpdate,
} from '#/lib/admin.functions';
import { adminTestimonialQueries } from '#/lib/cms-queries';
import { buildTestimonialOrderPayload, reorderIds } from '#/lib/gallery-state';
import type { LightFieldErrors, TestimonialEditorState } from '#/lib/light-entity-state';
import {
  buildTestimonialFlipPayload,
  buildTestimonialPayload,
  newTestimonialState,
  testimonialStateFromRead,
  validateTestimonialState,
} from '#/lib/light-entity-state';

/** The editor's mode switch: create (from `New testimonial`) or edit (a row snapshot). */
type EditingTarget = { mode: 'create' } | { mode: 'edit'; row: Testimonial };

/** One editor save: the target plus the exact field state the user saw. */
type SaveTestimonialInput = EditingTarget & { state: TestimonialEditorState };

/** One flip of the row switch: the source row (payload donor) + the target. */
interface FlipInput {
  row: Testimonial;
  isActive: boolean;
}

/** The pending posture's fixed four rows — stable keys, never reordered. */
const PENDING_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4'];

// Round-3 ruling: handle-only drag on the desktop table row. The grip
// button (first cell) carries setActivatorNodeRef + listeners + attributes;
// the row itself has NO drag listeners/attributes, so its clean click still
// toggles expansion. E3: solid bg + shadow while dragging so the dragged
// row's text never overlaps the rows beneath. The sortable node stays on
// the ExpandRow for the transform (ref flows through the props spread).
function SortableTestimonialRow({
  id,
  expanded,
  children,
  onClick,
}: {
  id: string;
  // A2: while expanded the identity row's bottom border drops (the
  // separator moves to the ExpandPanel's end) — ExpandRow owns that.
  expanded: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <ExpandRow
      ref={setNodeRef}
      expanded={expanded}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'group relative z-10 bg-card shadow-sm' : 'group'}
      onClick={onClick}
    >
      {/* The grip is the ONLY drag activator. Cell-level stopPropagation
          keeps a grip click from bubbling to the row's expand toggle. */}
      <TableCell className='w-10' onClick={(e) => e.stopPropagation()}>
        <button
          type='button'
          ref={setActivatorNodeRef}
          aria-label='Drag to reorder'
          className='text-muted-foreground hover:text-foreground touch-none cursor-grab rounded-sm active:cursor-grabbing'
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden='true' className='size-4 shrink-0' />
        </button>
      </TableCell>
      {children}
    </ExpandRow>
  );
}

// The same handle-only posture on the stacked mobile list: the grip sits at
// the row start, ahead of the two-line header (its own flex row); the
// header button still toggles the expand and the wrapper keeps no drag
// listeners.
function SortableStackRow({
  id,
  header,
  children,
}: {
  id: string;
  header: ReactNode;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-border border-b py-2 last:border-b-0 ${
        isDragging ? 'relative z-10 bg-card shadow-sm' : ''
      }`}
    >
      <div className='flex items-start gap-2'>
        <button
          type='button'
          ref={setActivatorNodeRef}
          aria-label='Drag to reorder'
          className='text-muted-foreground hover:text-foreground touch-none cursor-grab rounded-sm active:cursor-grabbing'
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden='true' className='size-4 shrink-0' />
        </button>
        {header}
      </div>
      {children}
    </div>
  );
}

export function TestimonialsScreen() {
  const {
    data: testimonials,
    isPending,
    isError,
    refetch,
  } = useQuery(adminTestimonialQueries.all());
  const queryClient = useQueryClient();
  // T3: controlled disclosure — one expanded row at a time (id or null).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Deep-linkable in the prototype frame pass; here a plain selection.
  const [confirmId, setConfirmId] = useState<string | null>(null);
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
  const [editorState, setEditorState] = useState<TestimonialEditorState>(newTestimonialState);
  const [fieldErrors, setFieldErrors] = useState<LightFieldErrors>({});
  const personId = useId();
  const quoteId = useId();
  const activeId = useId();

  // Round-3 ruling: the package-editor's handle-only sensor posture —
  // PointerSensor with a 4px distance constraint (activation lives on the
  // grip, so no touch long-press is needed; touch-none on the grip keeps
  // page scroll from fighting a grip drag), plus the keyboard sensor.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Single-row flips: optimistic on the list cache (cancel + snapshot + patch
  // ONLY isActive; rollback + toast on error; invalidate either way) — the
  // branches screen's posture.
  const flip = useMutation({
    // Result-valued fn (Task 2's seam): ok:false converts to a throw so the
    // optimistic handlers below own rollback + the error toast — a flip has
    // no inline field slot in the table, so a failure surfaces as its
    // message.
    mutationFn: async ({ row, isActive }: FlipInput) => {
      const result = await saveAdminTestimonialUpdate({
        data: { id: row.id, payload: buildTestimonialFlipPayload(row, isActive) },
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async ({ row, isActive }) => {
      await queryClient.cancelQueries({ queryKey: adminTestimonialQueries.all().queryKey });
      const previous = queryClient.getQueryData<Testimonial[]>(
        adminTestimonialQueries.all().queryKey
      );
      queryClient.setQueryData<Testimonial[]>(adminTestimonialQueries.all().queryKey, (old) =>
        old?.map((candidate) => (candidate.id === row.id ? { ...candidate, isActive } : candidate))
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminTestimonialQueries.all().queryKey, context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminTestimonialQueries.all().queryKey });
    },
  });

  // The order PUT on drop (AR-9): optimistic — Task 4's `reorderIds` over
  // the full list produces the reordered ROW array; the cache array is
  // REPLACE-d in that order (never a push into an aliased read row); a
  // failure restores the snapshot + toasts + invalidates.
  const order = useMutation({
    mutationFn: async (reordered: Testimonial[]) => {
      const result = await saveAdminTestimonialOrder({
        data: buildTestimonialOrderPayload(reordered),
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async (reordered) => {
      await queryClient.cancelQueries({ queryKey: adminTestimonialQueries.all().queryKey });
      const previous = queryClient.getQueryData<Testimonial[]>(
        adminTestimonialQueries.all().queryKey
      );
      queryClient.setQueryData<Testimonial[]>(adminTestimonialQueries.all().queryKey, reordered);
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminTestimonialQueries.all().queryKey, context.previous);
      }
      toast.error(error.message);
      queryClient.invalidateQueries({ queryKey: adminTestimonialQueries.all().queryKey });
    },
    onSuccess: () => {
      toast.success('Order saved.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminTestimonialQueries.all().queryKey });
    },
  });

  // Editor saves: NON-optimistic — the form state is the source of truth;
  // success invalidates + toasts + (the shared handler's) close, failure
  // keeps the editor open with the state intact (retry is safe — the save is
  // a full-object PUT). No unique fields on this table, so no conflict
  // mapping — every !ok surfaces as its message toast.
  const saveTestimonial = useMutation({
    mutationFn: async (input: SaveTestimonialInput) => {
      const result =
        input.mode === 'create'
          ? await saveAdminTestimonialCreate({ data: buildTestimonialPayload(input.state) })
          : await saveAdminTestimonialUpdate({
              data: { id: input.row.id, payload: buildTestimonialPayload(input.state) },
            });
      return { input, result };
    },
    onSuccess: ({ input, result }) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminTestimonialQueries.all().queryKey });
        toast.success('Saved.');
        return;
      }
      // !ok: keep open + the message toast; the reopen replays the enter
      // animation over the intact state.
      toast.error(result.message);
      keepEditorOpen(input);
    },
    onError: (error, input) => {
      // Not an API failure (serialization, session loss) — loud toast, same
      // keep-open posture.
      toast.error(error.message);
      keepEditorOpen(input);
    },
  });

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function openCreate() {
    setEditorState(newTestimonialState());
    setFieldErrors({});
    setEditing({ mode: 'create' });
    setEditorOpen(true);
  }

  function openEdit(row: Testimonial) {
    setEditorState(testimonialStateFromRead(row));
    setFieldErrors({});
    setEditing({ mode: 'edit', row });
    setEditorOpen(true);
  }

  /** Re-arms the editor after a failed save (see the state comments above). */
  function keepEditorOpen(input: SaveTestimonialInput) {
    setEditing(input.mode === 'create' ? { mode: 'create' } : { mode: 'edit', row: input.row });
    setEditorOpen(true);
    setEditorNonce((n) => n + 1);
  }

  function handleEditorSave() {
    if (!editing) {
      return;
    }
    const errors = validateTestimonialState(editorState);
    if (errors.person || errors.quote) {
      setFieldErrors(errors);
      toast.error('Fix the highlighted fields.');
      // Veto-throw: the shared Save button closes the Sheet only when onSave
      // returns normally — a throw is the keep-open veto and is swallowed there
      // (#143). The inline errors + toast are the UX.
      throw new Error('testimonial-editor-validation-hold');
    }
    setFieldErrors({});
    saveTestimonial.mutate(
      editing.mode === 'create'
        ? { mode: 'create', state: editorState }
        : { mode: 'edit', row: editing.row, state: editorState }
    );
  }

  // A drop reorders the ONE rows array (array order is the display order —
  // there is no position column), then the order PUT fires with the FULL
  // id list (Task 4's `reorderIds` — TOTAL full-replace, never a delta).
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !testimonials) {
      return;
    }
    const ids = testimonials.map((row) => row.id);
    const reorderedIds = reorderIds(ids, String(active.id), String(over.id));
    if (reorderedIds === ids) {
      return;
    }
    const byId = new Map(testimonials.map((row) => [row.id, row]));
    const reordered: Testimonial[] = [];
    for (const id of reorderedIds) {
      const row = byId.get(id);
      if (row !== undefined) {
        reordered.push(row);
      }
    }
    order.mutate(reordered);
  }

  // The table's one action shape: the sheet-opening Edit icon.
  function editButton(row: Testimonial) {
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

  const confirmRow = testimonials?.find((row) => row.id === confirmId);

  return (
    <section className='space-y-4'>
      <PageHeader
        title='Testimonials'
        subline='Client quotes shown on the /about page, ordered.'
        actions={
          <Button type='button' onClick={openCreate}>
            New testimonial
          </Button>
        }
      />

      {isError ? (
        <QueryErrorState
          line={QUERY_ERROR_LINE}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : isPending || !testimonials ? (
        // Pending posture: skeleton rows echoing the row anatomy (grip,
        // person + quote, actions) at the table's rhythm.
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
      ) : testimonials.length === 0 ? (
        // TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items)
        <EmptyState line='No testimonials yet.'>
          <Button type='button' onClick={openCreate}>
            New testimonial
          </Button>
        </EmptyState>
      ) : (
        <Card className='@container rounded-lg'>
          <CardContent>
            {/* @container: the table folds into stacked rows below a 700px
                CONTAINER width (Tailwind v4 native container queries). The
                TooltipProvider is the per-table one the person tooltips use
                (A3). The TODO(token-ruling) radius step-down is flagged at
                its ruling site in the pattern library, not re-declared. */}
            <TooltipProvider>
              <Table className='@max-[700px]:hidden'>
                <TableHeader>
                  <TableRow>
                    {/* Drag-handle column (round-3 ruling) — no header label. */}
                    <TableHead className='w-10' />
                    <TableHead>Person</TableHead>
                    {/* T2: the Actions header renders empty — the icons carry
                      their own labels. */}
                    <TableHead className='text-right' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                  >
                    <SortableContext
                      items={testimonials.map((row) => row.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {testimonials.map((row) => {
                        const expanded = expandedId === row.id;
                        return (
                          <Fragment key={row.id}>
                            <SortableTestimonialRow
                              id={row.id}
                              expanded={expanded}
                              onClick={() => toggleExpanded(row.id)}
                            >
                              <TableCell className='cursor-pointer'>
                                {/* TM1: person is the identity (the Packages
                                  format); quote is the one-line secondary
                                  (full quote on expand). Round 4: the dot
                                  sits BESIDE the person so it never strands
                                  on its own line when the quote hides. A3:
                                  the person truncates when the column is
                                  squeezed and the tooltip carries the full
                                  text. */}
                                <div className='space-y-0.5'>
                                  <div className='flex items-center gap-2'>
                                    <StatusBadge isActive={row.isActive} />
                                    <ActionTooltip
                                      label={row.person}
                                      button={
                                        <p className='min-w-0 truncate font-semibold'>
                                          {row.person}
                                        </p>
                                      }
                                    />
                                  </div>
                                  {/* N2: the truncated quote hides while
                                    expanded — the reveal carries the full
                                    text. A1: the line indents by the dot
                                    (size-2.5) + its gap-2 — 4.5 spacing
                                    steps — so the text aligns with the
                                    person above it. */}
                                  {expanded ? null : (
                                    <div className='flex min-w-0 items-center pl-4.5'>
                                      <p className='text-muted-foreground truncate text-xs'>
                                        {row.quote}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell
                                className='text-right'
                                onClick={(e) => e.stopPropagation()}
                              >
                                <RowActionsCluster
                                  expanded={expanded}
                                  onToggle={() => toggleExpanded(row.id)}
                                  edit={editButton(row)}
                                  isActive={row.isActive}
                                  onDeactivate={() => setConfirmId(row.id)}
                                  onReactivate={() => flip.mutate({ row, isActive: true })}
                                />
                              </TableCell>
                            </SortableTestimonialRow>
                            {/* T3 desktop reveal: the FULL quote (spans the
                              grip + identity + actions columns). */}
                            <ExpandPanel open={expanded} colSpan={3}>
                              {row.quote}
                            </ExpandPanel>
                          </Fragment>
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                </TableBody>
              </Table>
            </TooltipProvider>

            {/* Stacked posture (below 700px container width): the two-line
                header toggles the animated reveal (M1); rows drag by the grip
                (round-3 ruling). A second DndContext — the prototype's
                posture: both lists render the same sortable ids, and one
                context would register each id twice. */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={testimonials.map((row) => row.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className='hidden flex-col @max-[700px]:flex'>
                  {testimonials.map((row) => {
                    const expanded = expandedId === row.id;
                    return (
                      <SortableStackRow
                        key={row.id}
                        id={row.id}
                        header={
                          <button
                            type='button'
                            aria-expanded={expanded}
                            className='w-full cursor-pointer text-left'
                            onClick={() => toggleExpanded(row.id)}
                          >
                            <div className='flex items-center justify-between gap-3'>
                              <div className='flex min-w-0 items-center gap-2'>
                                <StatusBadge isActive={row.isActive} />
                                <p className='truncate font-medium'>{row.person}</p>
                              </div>
                            </div>
                            {/* N2: the quote line hides while expanded. A1:
                                dot-width indent, same as the desktop line 2. */}
                            {expanded ? null : (
                              <p className='text-muted-foreground mt-1 truncate pl-4.5 text-xs'>
                                {row.quote}
                              </p>
                            )}
                          </button>
                        }
                      >
                        <Collapse open={expanded}>
                          <div className='mt-2 space-y-2'>
                            <p className='text-muted-foreground text-sm'>{row.quote}</p>
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
                      </SortableStackRow>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}

      {editing ? (
        <LightEntityEditor
          key={editorNonce}
          title={editing.mode === 'create' ? 'New testimonial' : editing.row.person}
          description='The quote and the person it belongs to.'
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
            <FieldLabel htmlFor={personId}>Person</FieldLabel>
            <Input
              id={personId}
              value={editorState.person}
              onChange={(e) => setEditorState({ ...editorState, person: e.target.value })}
            />
            {fieldErrors.person ? (
              <p className='text-destructive text-xs'>{fieldErrors.person}</p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={quoteId}>Quote</FieldLabel>
            <Textarea
              id={quoteId}
              rows={3}
              value={editorState.quote}
              onChange={(e) => setEditorState({ ...editorState, quote: e.target.value })}
            />
            {fieldErrors.quote ? (
              <p className='text-destructive text-xs'>{fieldErrors.quote}</p>
            ) : null}
          </Field>
          <div className='flex flex-wrap gap-6'>
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
          name={confirmRow.person}
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
    </section>
  );
}
