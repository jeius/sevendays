// PROTOTYPE (throwaway) — wayfinder #131: the testimonials screen. Round 2:
// the quote, position and status columns are gone — the person is the
// identity (dot + one-line quote under it, full quote on expand), the order
// is the rows-array order (no position display anywhere) and row actions
// are icon-only. Round 3: action icons get tooltips, the truncated quote
// hides while expanded, and a clean row click toggles expansion. Round 3
// owner ruling: rows reorder by a drag HANDLE only — a GripVertical grip at
// the row start carries the dnd-kit listeners/attributes (same posture as
// the package-editor grips) and the whole row is no longer draggable, so
// click-to-expand and drag never share a surface. Round 4: the sortable row
// gains the `group` class the other five screens mark their rows with (the
// cluster's opacity-0 reveal had no group ancestor, so the icons never
// showed), the status dot moves beside the person, and the chevron follows
// the icons. Round 5: the quote indents by the dot's width so it aligns
// with the person text, and the person truncates with a full-text hover
// tooltip (identity column's min width drops). Local state only:
// deactivate/reactivate flips isActive, nothing persists. Never merges;
// delete with the route.

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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import { Field, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
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
import { GripVertical, SquarePen } from 'lucide-react';
import type { ReactNode } from 'react';
import { Fragment, useId, useState } from 'react';
import type { TestimonialRow } from '../fixtures';
import { testimonials } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
  ActionTooltip,
  Collapse,
  DeactivateConfirm,
  EmptyState,
  ExpandPanel,
  LightEntityEditor,
  PageHeader,
  RowActionsCluster,
  RowIconActions,
  StatusBadge,
} from '../shared';

// Round-3 owner ruling: handle-only drag on the desktop table row. The grip
// button (first cell) carries setActivatorNodeRef + listeners + attributes;
// the row itself has NO drag listeners/attributes, so its clean click still
// toggles expansion (N3 — no click-vs-drag arbitration needed anymore). The
// sortable node stays on the row for the transform. E3: solid bg + shadow
// while dragging so the dragged row's text never overlaps the rows beneath.
function SortableTestimonialRow({
  id,
  children,
  onClick,
}: {
  id: string;
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
  } = useSortable({
    id,
  });
  return (
    <TableRow
      ref={setNodeRef}
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
    </TableRow>
  );
}

// Same handle-only posture on the stacked mobile list: the grip sits at the
// row start, ahead of the two-line header (its own flex row); the header
// button still toggles the expand and the wrapper keeps no drag listeners.
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
  } = useSortable({
    id,
  });
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

export function TestimonialsScreen({ search }: ScreenProps) {
  const [rows, setRows] = useState(testimonials);
  // Deep-linkable states (frame pass): ?edit=<id> opens that row's editor on
  // mount; ?confirm=<id> opens its deactivate confirm. Close is client-only.
  const [editId, setEditId] = useState<string | null>(search.edit ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
  // T3: controlled disclosure — one expanded row at a time (id or null).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const editRow = rows.find((row) => row.id === editId);
  const confirmRow = rows.find((row) => row.id === confirmId);
  const quoteId = useId();
  const personId = useId();
  const activeId = useId();

  function updateRow(id: string, patch: Partial<TestimonialRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function setActive(id: string, isActive: boolean) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, isActive } : row)));
  }

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function editButton(id: string) {
    return (
      <Button
        variant='ghost'
        size='icon-sm'
        type='button'
        aria-label='Edit'
        onClick={() => setEditId(id)}
      >
        <SquarePen aria-hidden='true' />
      </Button>
    );
  }

  // Round-3 ruling: the package-editor's handle-only sensor posture —
  // PointerSensor with a 4px distance constraint (activation lives on the
  // grip, so no touch long-press is needed; touch-none on the grip keeps
  // page scroll from fighting a grip drag), plus the keyboard sensor.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // A drag reorders the ONE rows array (array order is the display order —
  // there is no position column anymore).
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    setRows((prev) => {
      const from = prev.findIndex((row) => row.id === String(active.id));
      const to = prev.findIndex((row) => row.id === String(over.id));
      if (from < 0 || to < 0) {
        return prev;
      }
      return arrayMove(prev, from, to);
    });
  }

  return (
    <section data-prototype-screen='testimonials' className='space-y-4'>
      <PageHeader
        title='Testimonials'
        subline='Client quotes shown on the /about page, ordered.'
        actions={
          <Button onClick={() => {}} type='button'>
            New testimonial
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState line='No testimonials yet.'>
          <Button onClick={() => {}} type='button'>
            New testimonial
          </Button>
        </EmptyState>
      ) : (
        <Card className='@container rounded-lg'>
          <CardContent>
            {/* @container: the table folds into stacked rows below a 700px
                CONTAINER width (Tailwind v4 native container queries). The
                TooltipProvider is the per-table one the name tooltips use
                (A3). */}
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
                      items={rows.map((row) => row.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {rows.map((row) => {
                        const expanded = expandedId === row.id;
                        return (
                          <Fragment key={row.id}>
                            <SortableTestimonialRow
                              id={row.id}
                              onClick={() => toggleExpanded(row.id)}
                            >
                              <TableCell className='cursor-pointer'>
                                {/* TM1: person is the identity; quote is the
                                  one-line secondary (full quote on expand).
                                  Round 4: the dot sits BESIDE the person —
                                  the lookups-attires reference pattern — so
                                  it never strands on its own line when the
                                  quote hides. A3: the person truncates when
                                  the column is squeezed and the tooltip
                                  carries the full text. */}
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
                                  edit={editButton(row.id)}
                                  isActive={row.isActive}
                                  onDeactivate={() => setConfirmId(row.id)}
                                  onReactivate={() => setActive(row.id, true)}
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
                (round-3 ruling). */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={rows.map((row) => row.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className='hidden flex-col @max-[700px]:flex'>
                  {rows.map((row) => {
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
                                edit={editButton(row.id)}
                                isActive={row.isActive}
                                onDeactivate={() => setConfirmId(row.id)}
                                onReactivate={() => setActive(row.id, true)}
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

      <p className='text-muted-foreground text-xs'>Prototype: changes stay on this page.</p>

      {editRow ? (
        <LightEntityEditor
          title={editRow.person}
          open={editId === editRow.id}
          onOpenChange={(open) => {
            if (!open) {
              setEditId(null);
            }
          }}
        >
          <Field>
            <FieldLabel htmlFor={quoteId}>Quote</FieldLabel>
            <Textarea
              id={quoteId}
              rows={3}
              value={editRow.quote}
              onChange={(e) => updateRow(editRow.id, { quote: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={personId}>Person</FieldLabel>
            <Input
              id={personId}
              value={editRow.person}
              onChange={(e) => updateRow(editRow.id, { person: e.target.value })}
            />
          </Field>
          <label htmlFor={activeId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={activeId}
              checked={editRow.isActive}
              onCheckedChange={(checked) => updateRow(editRow.id, { isActive: checked === true })}
            />
            Active
          </label>
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
            setActive(confirmRow.id, false);
            setConfirmId(null);
          }}
        />
      ) : null}
    </section>
  );
}
