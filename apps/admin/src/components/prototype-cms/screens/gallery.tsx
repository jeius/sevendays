// PROTOTYPE (throwaway) — wayfinder #131: the gallery manager. Category rail
// filters the photo grid; batch upload is the norm (ruling 9) and is
// simulated — appended rows point at URL.createObjectURL(file) thumbs, the
// R2/presign seam is #129's. Reorder is drag-only (@dnd-kit, rectSortingStrategy;
// the position chip doubles as the drag handle). Nothing persists. Never
// merges; delete with the route.

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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import { Field, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sevendays/ui/components/select';
import { Textarea } from '@sevendays/ui/components/textarea';
import { Check, Image, ImagePlus, Images, Plus, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { GalleryCategoryRow, GalleryPhotoRow } from '../fixtures';
import { galleryCategories, galleryPhotos } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
  DeactivateConfirm,
  EmptyState,
  LightEntityEditor,
  PageHeader,
  StatusBadge,
} from '../shared';

const UNCATEGORIZED = 'uncategorized';

// One grid tile of the sortable photo grid. The position chip doubles as the
// drag handle (listeners + attributes on the chip alone, touch-action none).
function SortablePhotoCard({
  photo,
  categoryName,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  photo: GalleryPhotoRow;
  categoryName: string;
  onEdit: (id: string) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`animate-in fade-in slide-in-from-bottom-2 gap-0 overflow-hidden py-0 duration-300 ${
        isDragging ? 'relative z-10 shadow-md' : ''
      }`}
    >
      <div className='bg-muted relative aspect-[4/3]'>
        {photo.photoUrl ? (
          <img
            src={photo.photoUrl}
            alt={photo.title}
            className='absolute inset-0 h-full w-full object-cover'
          />
        ) : (
          <div className='text-muted-foreground absolute inset-0 grid place-items-center'>
            <Image className='size-8' aria-hidden='true' />
          </div>
        )}
        <button
          type='button'
          aria-label='Drag to reorder'
          className='bg-background/90 absolute top-2 left-2 touch-none cursor-grab rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums active:cursor-grabbing'
          {...attributes}
          {...listeners}
        >
          #{photo.position}
        </button>
        {!photo.isActive ? (
          <div className='absolute top-2 right-2'>
            <StatusBadge isActive={false} />
          </div>
        ) : null}
      </div>
      <CardContent className='space-y-2 p-3'>
        <p className='text-sm font-medium'>{photo.title}</p>
        {photo.categoryId ? (
          <Badge variant='outline'>{categoryName}</Badge>
        ) : (
          <span className='text-muted-foreground text-xs'>Uncategorized</span>
        )}
        <div className='flex items-center gap-1'>
          <Button variant='ghost' size='sm' type='button' onClick={() => onEdit(photo.id)}>
            Edit
          </Button>
          {photo.isActive ? (
            <Button
              variant='ghost'
              size='sm'
              type='button'
              className='text-destructive hover:bg-destructive/10 hover:text-destructive'
              onClick={() => onDeactivate(photo.id)}
            >
              Deactivate
            </Button>
          ) : (
            <Button variant='ghost' size='sm' type='button' onClick={() => onReactivate(photo.id)}>
              Reactivate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function GalleryScreen({ search }: ScreenProps) {
  const [categories, setCategories] = useState(galleryCategories);
  const [photos, setPhotos] = useState(galleryPhotos);
  // 'all' = the All photos rail entry; otherwise a category id.
  const [filter, setFilter] = useState<string>('all');
  // Deep-linkable states (frame pass): ?edit=<id> opens that photo's editor on
  // mount; ?confirm=<id> opens its deactivate confirm. Close is client-only.
  const [editId, setEditId] = useState<string | null>(search.edit ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
  // The rail's one create affordance: New category → inline Input + confirm.
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const captionId = useId();
  const categoryId = useId();
  const activeId = useId();

  const sortedCategories = [...categories].sort((a, b) => a.position - b.position);
  const sortedPhotos = [...photos].sort((a, b) => a.position - b.position);
  const visiblePhotos =
    filter === 'all' ? sortedPhotos : sortedPhotos.filter((p) => p.categoryId === filter);
  const editPhoto = photos.find((p) => p.id === editId);
  const confirmPhoto = photos.find((p) => p.id === confirmId);
  const filterName =
    filter === 'all'
      ? 'All photos'
      : (categories.find((c) => c.id === filter)?.name ?? 'All photos');

  function countIn(categoryIdToCount: string | null): number {
    return photos.filter((p) => p.categoryId === categoryIdToCount).length;
  }

  function updatePhoto(id: string, patch: Partial<GalleryPhotoRow>) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function setActive(id: string, isActive: boolean) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, isActive } : p)));
  }

  // Batch is the norm (ruling 9): one row per chosen file, appended at the
  // grid end (position = max+1…), assigned to the open rail category.
  function onFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }
    setPhotos((prev) => {
      const maxPosition = prev.reduce((max, p) => Math.max(max, p.position), 0);
      return [
        ...prev,
        ...files.map((file, index) => ({
          id: `gp-upload-${Date.now()}-${index}`,
          photoUrl: URL.createObjectURL(file),
          title: file.name.replace(/\.[^.]+$/, ''),
          caption: null,
          categoryId: filter === 'all' ? null : filter,
          position: maxPosition + 1 + index,
          isActive: true,
        })),
      ];
    });
    event.target.value = ''; // allow re-picking the same file
  }

  // Drag-only reorder (post-verdict): a drag reorders the VISIBLE grid and the
  // new order is written back as positions. The visible rows keep the same set
  // of position numbers (reassigned in the new order), so a filtered drag can
  // never collide with positions held by other categories.
  function reorderPhotos(activeId: string, overId: string) {
    const from = visiblePhotos.findIndex((p) => p.id === activeId);
    const to = visiblePhotos.findIndex((p) => p.id === overId);
    if (from < 0 || to < 0) {
      return;
    }
    const reordered = arrayMove(visiblePhotos, from, to);
    const slots = visiblePhotos.map((p) => p.position).sort((a, b) => a - b);
    const positionById = new Map<string, number>();
    reordered.forEach((p, i) => {
      const slot = slots[i];
      if (slot !== undefined) {
        positionById.set(p.id, slot);
      }
    });
    setPhotos((prev) =>
      prev.map((p) => {
        const position = positionById.get(p.id);
        return position === undefined ? p : { ...p, position };
      })
    );
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    reorderPhotos(String(active.id), String(over.id));
  }

  function createCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      return;
    }
    setCategories((prev) => {
      const maxPosition = prev.reduce((max, c) => Math.max(max, c.position), 0);
      const row: GalleryCategoryRow = {
        id: `gc-new-${Date.now()}`,
        name,
        position: maxPosition + 1,
        isActive: true,
      };
      return [...prev, row];
    });
    setNewCategoryName('');
    setCreatingCategory(false);
  }

  function railEntry(label: string, count: number, target: string, icon?: boolean) {
    const selected = filter === target;
    return (
      <button
        key={target}
        type='button'
        onClick={() => setFilter(target)}
        aria-current={selected ? 'true' : undefined}
        className={`flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap transition-colors ${
          selected
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        }`}
      >
        {icon ? <Images className='size-4 shrink-0' aria-hidden='true' /> : null}
        {label} <span className='text-muted-foreground font-normal'>({count})</span>
      </button>
    );
  }

  return (
    <section data-prototype-screen='gallery' className='space-y-4'>
      <PageHeader
        title='Gallery'
        subline='The /about portfolio — upload in batches, organize by category.'
        actions={
          <>
            <input
              ref={fileInputRef}
              type='file'
              multiple
              accept='image/*'
              className='hidden'
              tabIndex={-1}
              aria-hidden='true'
              onChange={onFilesChosen}
            />
            <Button onClick={() => fileInputRef.current?.click()} type='button'>
              <ImagePlus aria-hidden='true' />
              Upload photos
            </Button>
          </>
        }
      />

      <div className='flex flex-col gap-4 lg:flex-row lg:items-start'>
        {/* Category rail — horizontal scroll strip on narrow widths. */}
        <Card className='shrink-0 lg:w-[220px]'>
          <CardContent className='flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-x-visible'>
            {railEntry('All photos', photos.length, 'all', true)}
            {sortedCategories.map((category) =>
              railEntry(category.name, countIn(category.id), category.id)
            )}
            {creatingCategory ? (
              <div className='flex w-full shrink-0 items-center gap-1'>
                <Input
                  value={newCategoryName}
                  placeholder='Category name'
                  aria-label='Category name'
                  className='h-8 min-w-32 flex-1'
                  autoFocus
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      createCategory();
                    }
                  }}
                />
                <Button
                  variant='ghost'
                  size='icon-sm'
                  type='button'
                  aria-label='Create category'
                  onClick={createCategory}
                >
                  <Check />
                </Button>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  type='button'
                  aria-label='Cancel new category'
                  onClick={() => {
                    setCreatingCategory(false);
                    setNewCategoryName('');
                  }}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <Button
                variant='ghost'
                size='sm'
                type='button'
                className='shrink-0 justify-start text-muted-foreground'
                onClick={() => setCreatingCategory(true)}
              >
                <Plus aria-hidden='true' />
                New category
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Toolbar + photo grid */}
        <div className='min-w-0 flex-1 space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold tracking-tight'>{filterName}</h2>
            <p className='text-muted-foreground text-xs'>
              Uploads are simulated in this prototype — nothing is stored.
            </p>
          </div>

          {visiblePhotos.length === 0 ? (
            <EmptyState
              line={filter === 'all' ? 'No photos yet.' : 'No photos in this category yet.'}
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={visiblePhotos.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {visiblePhotos.map((photo) => {
                    const categoryName =
                      categories.find((c) => c.id === photo.categoryId)?.name ?? 'Uncategorized';
                    return (
                      <SortablePhotoCard
                        key={photo.id}
                        photo={photo}
                        categoryName={categoryName}
                        onEdit={setEditId}
                        onDeactivate={setConfirmId}
                        onReactivate={(id) => setActive(id, true)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <p className='text-muted-foreground text-xs'>Prototype: changes stay on this page.</p>
        </div>
      </div>

      {editPhoto ? (
        <LightEntityEditor
          title={editPhoto.title}
          open={editId === editPhoto.id}
          onOpenChange={(open) => {
            if (!open) {
              setEditId(null);
            }
          }}
        >
          {/* Thumb preview */}
          <div className='bg-muted relative aspect-[4/3] w-28 overflow-hidden rounded-md'>
            {editPhoto.photoUrl ? (
              <img
                src={editPhoto.photoUrl}
                alt={editPhoto.title}
                className='absolute inset-0 h-full w-full object-cover'
              />
            ) : (
              <div className='text-muted-foreground absolute inset-0 grid place-items-center'>
                <Image className='size-6' aria-hidden='true' />
              </div>
            )}
          </div>
          <Field>
            <FieldLabel htmlFor={titleId}>Title</FieldLabel>
            <Input
              id={titleId}
              value={editPhoto.title}
              onChange={(e) => updatePhoto(editPhoto.id, { title: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={captionId}>Caption</FieldLabel>
            <Textarea
              id={captionId}
              rows={3}
              value={editPhoto.caption ?? ''}
              onChange={(e) => updatePhoto(editPhoto.id, { caption: e.target.value || null })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={categoryId}>Category</FieldLabel>
            <Select
              value={editPhoto.categoryId ?? UNCATEGORIZED}
              onValueChange={(value) =>
                updatePhoto(editPhoto.id, {
                  categoryId: String(value) === UNCATEGORIZED ? null : String(value),
                })
              }
            >
              <SelectTrigger id={categoryId} aria-label='Category' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortedCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
                <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <label htmlFor={activeId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={activeId}
              checked={editPhoto.isActive}
              onCheckedChange={(checked) =>
                updatePhoto(editPhoto.id, { isActive: checked === true })
              }
            />
            Active
          </label>
        </LightEntityEditor>
      ) : null}

      {confirmPhoto ? (
        <DeactivateConfirm
          name={confirmPhoto.title}
          open={confirmId === confirmPhoto.id}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmId(null);
            }
          }}
          onConfirm={() => {
            setActive(confirmPhoto.id, false);
            setConfirmId(null);
          }}
        />
      ) : null}
    </section>
  );
}
