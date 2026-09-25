// PROTOTYPE (throwaway) — wayfinder #131: the dedicated package-editor screen
// (post-verdict: drag-only reorder via @dnd-kit, handle-only grips). Always
// renders the pkg-basic fixture; reorder mutates the one underlying inclusions
// array (position = array order is the #130 write shape; frames renumber from
// array order on save). Nothing persists. Never merges; delete with the route.

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
import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@sevendays/ui/components/card';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@sevendays/ui/components/collapsible';
import { Field, FieldDescription, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sevendays/ui/components/select';
import { Textarea } from '@sevendays/ui/components/textarea';
import { Link } from '@tanstack/react-router';
import { ChevronDown, Frame, Gift, GripVertical, Image, Plus, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { InclusionRow, PackageRow } from '../fixtures';
import { attires, packages, printSizes } from '../fixtures';
import type { ScreenProps } from '../nav';
import { StatusBadge } from '../shared';

const KIND_ICONS = {
  framed_picture: Frame,
  print: Image,
  privilege: Gift,
} as const;

interface RowActions {
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<InclusionRow>) => void;
  onToggleAttire: (id: string, name: string, checked: boolean) => void;
}

function InclusionEditorRow({
  row,
  onRemove,
  onUpdate,
  onToggleAttire,
}: { row: InclusionRow } & RowActions) {
  const KindIcon = KIND_ICONS[row.kind];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`space-y-2 rounded-lg border p-3 ${isDragging ? 'relative z-10 shadow-md' : ''}`}
    >
      <div className='flex flex-wrap items-center gap-2'>
        {/* Handle-only drag: listeners + attributes live on the grip alone. */}
        <button
          type='button'
          aria-label='Drag to reorder'
          className='text-muted-foreground hover:text-foreground touch-none cursor-grab rounded-sm active:cursor-grabbing'
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden='true' className='size-4 shrink-0' />
        </button>
        <KindIcon aria-hidden='true' className='text-muted-foreground size-4 shrink-0' />
        {row.kind !== 'privilege' ? (
          <Input
            type='number'
            aria-label='Quantity'
            className='w-16'
            value={row.quantity ?? 1}
            onChange={(e) => onUpdate(row.id, { quantity: Number(e.target.value) })}
          />
        ) : null}
        {row.kind === 'print' ? (
          <Select
            value={row.printSize ?? undefined}
            onValueChange={(value) => onUpdate(row.id, { printSize: String(value) })}
          >
            <SelectTrigger size='sm' aria-label='Print size' className='w-24'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {printSizes.map((ps) => (
                <SelectItem key={ps.id} value={ps.code}>
                  {ps.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Input
          className='min-w-40 flex-1'
          value={row.description ?? ''}
          placeholder={row.kind === 'privilege' ? undefined : 'Description (optional)'}
          aria-label={row.kind === 'privilege' ? 'Privilege' : 'Description'}
          onChange={(e) => onUpdate(row.id, { description: e.target.value })}
        />
        <Button
          variant='ghost'
          size='icon-sm'
          type='button'
          aria-label='Remove'
          onClick={() => onRemove(row.id)}
        >
          <X />
        </Button>
      </div>
      <div className='flex flex-wrap items-center gap-1.5'>
        {attires.map((attire) => (
          <label
            key={attire.id}
            htmlFor={`${row.id}-${attire.id}`}
            className='flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs'
          >
            <Checkbox
              id={`${row.id}-${attire.id}`}
              checked={row.attires.includes(attire.name)}
              onCheckedChange={(checked) => onToggleAttire(row.id, attire.name, checked === true)}
            />
            {attire.name}
          </label>
        ))}
      </div>
    </div>
  );
}

// The editor always renders pkg-basic — the owner reacts to the composition,
// not to fixture switching.
function basicFixture(): PackageRow {
  const source = packages[0];
  if (!source) {
    throw new Error('PROTOTYPE: pkg-basic fixture missing');
  }
  return source;
}

export function PackageEditorScreen({ variant }: ScreenProps) {
  const [pkg, setPkg] = useState<PackageRow>(() => structuredClone(basicFixture()));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const descriptionId = useId();
  const priceId = useId();
  const durationId = useId();
  const slugId = useId();
  const featuredId = useId();
  const activeId = useId();

  const prints = pkg.inclusions.filter((row) => row.kind === 'print');
  const privileges = pkg.inclusions.filter((row) => row.kind === 'privilege');

  function updateField<K extends keyof PackageRow>(key: K, value: PackageRow[K]) {
    setPkg((prev) => ({ ...prev, [key]: value }));
  }

  function updateInclusion(id: string, patch: Partial<InclusionRow>) {
    setPkg((prev) => ({
      ...prev,
      inclusions: prev.inclusions.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  function removeInclusion(id: string) {
    setPkg((prev) => ({ ...prev, inclusions: prev.inclusions.filter((row) => row.id !== id) }));
  }

  function toggleAttire(id: string, name: string, checked: boolean) {
    setPkg((prev) => ({
      ...prev,
      inclusions: prev.inclusions.map((row) =>
        row.id === id
          ? {
              ...row,
              attires: checked
                ? [...row.attires, name]
                : row.attires.filter((attire) => attire !== name),
            }
          : row
      ),
    }));
  }

  function addFrame() {
    setPkg((prev) => ({
      ...prev,
      frames: [
        ...prev.frames,
        { id: `fr-proto-${Date.now()}`, frameNumber: prev.frames.length + 1 },
      ],
    }));
  }

  function addPrint() {
    const row: InclusionRow = {
      id: `inc-proto-print-${Date.now()}`,
      kind: 'print',
      quantity: 1,
      printSize: printSizes[0]?.code ?? null,
      attires: [],
      description: null,
      frameId: null,
    };
    // Insert WITHIN the prints block of the underlying array (not appended at
    // the end) so sections stay contiguous — array order must keep matching
    // displayed order (the #130 write shape).
    setPkg((prev) => {
      let insertAt = -1;
      prev.inclusions.forEach((candidate, idx) => {
        if (candidate.kind === 'print') {
          insertAt = idx;
        }
      });
      if (insertAt < 0) {
        // no prints yet: keep prints ahead of the privileges block
        insertAt = prev.inclusions.findIndex((candidate) => candidate.kind === 'privilege');
        if (insertAt < 0) {
          insertAt = prev.inclusions.length;
        }
      } else {
        insertAt += 1;
      }
      const inclusions = [...prev.inclusions];
      inclusions.splice(insertAt, 0, row);
      return { ...prev, inclusions };
    });
  }

  function addPrivilege() {
    const row: InclusionRow = {
      id: `inc-proto-priv-${Date.now()}`,
      kind: 'privilege',
      quantity: null,
      printSize: null,
      attires: [],
      description: '',
      frameId: null,
    };
    // Insert WITHIN the privileges block (they close the array): after the
    // last privilege, or at the end when none exist yet.
    setPkg((prev) => {
      let insertAt = -1;
      prev.inclusions.forEach((candidate, idx) => {
        if (candidate.kind === 'privilege') {
          insertAt = idx;
        }
      });
      const inclusions = [...prev.inclusions];
      inclusions.splice(insertAt < 0 ? inclusions.length : insertAt + 1, 0, row);
      return { ...prev, inclusions };
    });
  }

  // Sections are views over the one inclusions array: a drag reorders the
  // section's rows among themselves. The reorder is derived from the filtered
  // section list and applied by row identity — never by raw array index —
  // so a drag can never cross another section's rows (same discipline as the
  // reviewed moveInclusion identity swap).
  function reorderInclusions(
    matches: (c: InclusionRow) => boolean,
    activeId: string,
    overId: string
  ) {
    setPkg((prev) => {
      const section = prev.inclusions.filter(matches);
      const from = section.findIndex((candidate) => candidate.id === activeId);
      const to = section.findIndex((candidate) => candidate.id === overId);
      if (from < 0 || to < 0) {
        return prev;
      }
      const reordered = arrayMove(section, from, to);
      const queue = [...reordered];
      const inclusions = prev.inclusions.map((candidate) =>
        matches(candidate) ? (queue.shift() ?? candidate) : candidate
      );
      return { ...prev, inclusions };
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function makeDragEnd(matches: (c: InclusionRow) => boolean) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      reorderInclusions(matches, String(active.id), String(over.id));
    };
  }

  // The save model: frameNumbers re-derive from array order (#130 write shape).
  function saveChanges() {
    setPkg((prev) => ({
      ...prev,
      frames: prev.frames.map((frame, i) => ({ ...frame, frameNumber: i + 1 })),
    }));
  }

  const rowActions: RowActions = {
    onRemove: removeInclusion,
    onUpdate: updateInclusion,
    onToggleAttire: toggleAttire,
  };

  return (
    <section data-prototype-screen='package-editor' className='space-y-6'>
      <header className='space-y-1'>
        <div>
          <Link
            to='/prototype-cms'
            search={{ screen: 'packages', variant }}
            className='text-muted-foreground hover:text-foreground w-fit text-sm'
          >
            ← Back to packages
          </Link>
        </div>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-semibold tracking-tight'>{pkg.name}</h1>
            <StatusBadge isActive={pkg.isActive} />
          </div>
          <div className='flex items-center gap-3'>
            <p className='text-muted-foreground text-xs'>Prototype: changes stay on this page.</p>
            <Button type='button' onClick={saveChanges}>
              Save changes
            </Button>
          </div>
        </div>
      </header>

      <div className='grid items-start gap-6 xl:grid-cols-3'>
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Core</CardTitle>
            </CardHeader>
            <CardContent className='space-y-5'>
              <Field>
                <FieldLabel htmlFor={nameId}>Name</FieldLabel>
                <Input
                  id={nameId}
                  value={pkg.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
                <Textarea
                  id={descriptionId}
                  rows={3}
                  value={pkg.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
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
                    value={pkg.priceCents / 100}
                    onChange={(e) =>
                      updateField('priceCents', Math.round(Number(e.target.value) * 100) || 0)
                    }
                  />
                </div>
                <FieldDescription>Stored as centavos.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={durationId}>Duration (minutes)</FieldLabel>
                <Input
                  id={durationId}
                  type='number'
                  value={pkg.durationMinutes ?? ''}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    updateField(
                      'durationMinutes',
                      e.target.value !== '' && Number.isFinite(n) ? n : null
                    );
                  }}
                />
                <FieldDescription>Optional</FieldDescription>
              </Field>
              <div className='flex flex-wrap gap-6'>
                <label htmlFor={featuredId} className='flex items-center gap-2 text-sm font-medium'>
                  <Checkbox
                    id={featuredId}
                    checked={pkg.isFeatured}
                    onCheckedChange={(checked) => updateField('isFeatured', checked === true)}
                  />
                  Featured
                </label>
                <label htmlFor={activeId} className='flex items-center gap-2 text-sm font-medium'>
                  <Checkbox
                    id={activeId}
                    checked={pkg.isActive}
                    onCheckedChange={(checked) => updateField('isActive', checked === true)}
                  />
                  Active
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cover</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {pkg.coverImageUrl ? (
                <img
                  src={pkg.coverImageUrl}
                  alt={`${pkg.name} cover`}
                  className='aspect-[3/2] w-full rounded-md object-cover'
                />
              ) : (
                <div className='bg-muted text-muted-foreground grid aspect-[3/2] w-full place-items-center rounded-md'>
                  <Image aria-hidden='true' className='size-8' />
                </div>
              )}
              <div className='flex items-center gap-2'>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      updateField('coverImageUrl', URL.createObjectURL(file));
                    }
                  }}
                />
                <Button
                  variant='outline'
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload cover
                </Button>
                <Button
                  variant='ghost'
                  type='button'
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                    updateField('coverImageUrl', null);
                  }}
                >
                  Remove cover
                </Button>
              </div>
              <p className='text-muted-foreground text-xs'>
                Uploads are simulated in this prototype — nothing is stored.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Collapsible>
                <CollapsibleTrigger render={<Button variant='ghost' size='sm' type='button' />}>
                  Advanced
                  <ChevronDown aria-hidden='true' className='text-muted-foreground size-4' />
                </CollapsibleTrigger>
                <CollapsibleContent className='space-y-2 pt-2'>
                  <Field>
                    <FieldLabel htmlFor={slugId}>Slug</FieldLabel>
                    <Input
                      id={slugId}
                      value={pkg.slug}
                      onChange={(e) => updateField('slug', e.target.value)}
                    />
                    <FieldDescription>
                      Changing the slug breaks links that point here.
                    </FieldDescription>
                  </Field>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        <Card className='xl:col-span-2'>
          <CardHeader>
            <CardTitle>Inclusions</CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            <section className='space-y-2'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-medium'>Frames</h3>
                <Button variant='ghost' size='sm' type='button' onClick={addFrame}>
                  <Plus data-icon='inline-start' />
                  Add frame
                </Button>
              </div>
              {pkg.frames.map((frame, frameIndex) => {
                const group = pkg.inclusions.filter(
                  (candidate) =>
                    candidate.kind === 'framed_picture' && candidate.frameId === frame.id
                );
                return (
                  <div key={frame.id} className='bg-muted/20 space-y-2 rounded-xl border p-3'>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='font-mono text-xs'>
                        Frame {frameIndex + 1}
                      </Badge>
                      {group.length === 0 ? (
                        <p className='text-muted-foreground text-xs'>
                          No framed pictures in this frame yet.
                        </p>
                      ) : null}
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={makeDragEnd(
                        (c) => c.kind === 'framed_picture' && c.frameId === frame.id
                      )}
                    >
                      <SortableContext
                        items={group.map((row) => row.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {group.map((row) => (
                          <InclusionEditorRow key={row.id} row={row} {...rowActions} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                );
              })}
            </section>

            <section className='space-y-2'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-medium'>Prints · {prints.length}</h3>
                <Button variant='ghost' size='sm' type='button' onClick={addPrint}>
                  <Plus data-icon='inline-start' />
                  Add print
                </Button>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={makeDragEnd((c) => c.kind === 'print')}
              >
                <SortableContext
                  items={prints.map((row) => row.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {prints.map((row) => (
                    <InclusionEditorRow key={row.id} row={row} {...rowActions} />
                  ))}
                </SortableContext>
              </DndContext>
            </section>

            <section className='space-y-2'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-medium'>Privileges · {privileges.length}</h3>
                <Button variant='ghost' size='sm' type='button' onClick={addPrivilege}>
                  <Plus data-icon='inline-start' />
                  Add privilege
                </Button>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={makeDragEnd((c) => c.kind === 'privilege')}
              >
                <SortableContext
                  items={privileges.map((row) => row.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {privileges.map((row) => (
                    <InclusionEditorRow key={row.id} row={row} {...rowActions} />
                  ))}
                </SortableContext>
              </DndContext>
            </section>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
