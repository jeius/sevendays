// The gallery screen (M5 #141, Task 7): the category rail as the inline
// panel (create/rename/drag-reorder/deactivate — AR-4), the batch upload
// tray (AR-3) wired to Task 6's pool, the sortable card grid, and the
// photo editor — ruled by #131 and ported element-for-element from the
// composition of record (branch prototype/131-admin-cms-compositions,
// screens/gallery.tsx), with the prototype's fixture state replaced by the
// task seams: `adminGalleryQueries.categories()/photos()`, the Task 3 save
// fns, Task 4's state seam (payload builders + reorder helpers +
// `titleFromFileName`), and Task 6's `runBatchUpload` pool. GL1: card
// actions are hover/tap overlays; GL2: NO status dot — the dimmed card IS
// the deactivated state; GL3: the WHOLE card is the drag handle
// (Pointer-8px / Touch-300ms / keyboard — AR-7) and the order PUT fires on
// drop with snapshot restore (AR-9). Thumbs ride the Task 5 gated proxy
// (AR-1); raw photoUrl never reaches the UI.
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  CreateGalleryPhotoInput,
  GalleryCategory,
  GalleryPhoto,
  MediaPresignRequest,
  MediaPresignResponse,
} from '@sevendays/types';
import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import { Field, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import { Progress } from '@sevendays/ui/components/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sevendays/ui/components/select';
import { Separator } from '@sevendays/ui/components/separator';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import { Textarea } from '@sevendays/ui/components/textarea';
import { useIsMobile } from '@sevendays/ui/hooks/use-mobile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from 'cn';
import { Check, ImagePlus, Images, Plus, Power, PowerOff, SquarePen, X } from 'lucide-react';
import { type ChangeEvent, useId, useRef, useState } from 'react';
import {
  DeactivateConfirm,
  EmptyState,
  LightEntityEditor,
  QUERY_ERROR_LINE,
  QueryErrorState,
} from '#/components/cms/shared';
import {
  presignAdminCoverUpload,
  saveAdminGalleryCategoryCreate,
  saveAdminGalleryCategoryOrder,
  saveAdminGalleryCategoryUpdate,
  saveAdminGalleryPhotoCreate,
  saveAdminGalleryPhotoOrder,
  saveAdminGalleryPhotoUpdate,
} from '#/lib/admin.functions';
import type { BatchItem, BatchItemStatus } from '#/lib/batch-photo-upload';
import { putFileToPresignedUrl, runBatchUpload } from '#/lib/batch-photo-upload';
import { adminGalleryQueries } from '#/lib/cms-queries';
import {
  buildCategoryOrderPayload,
  buildPhotoFlipPayload,
  buildPhotoPayload,
  type PhotoEditorState,
  photoStateFromRead,
  reorderIds,
  reorderVisiblePhotos,
  titleFromFileName,
} from '#/lib/gallery-state';

const UNCATEGORIZED = 'uncategorized';

/** The rail's one inline save: create, rename (same inline Input), or flip. */
type CategorySaveInput =
  | { mode: 'create'; name: string }
  | { mode: 'rename'; row: GalleryCategory; name: string }
  | { mode: 'flip'; row: GalleryCategory; isActive: boolean };

/** The pending posture's fixed keys — stable, never reordered. */
const PENDING_RAIL_KEYS = ['rail-1', 'rail-2', 'rail-3', 'rail-4'];
const PENDING_CARD_KEYS = [
  'card-1',
  'card-2',
  'card-3',
  'card-4',
  'card-5',
  'card-6',
  'card-7',
  'card-8',
];

/** The prototype's rail entry classes — selected accent, muted otherwise. */
function railEntryClass(selected: boolean): string {
  return `flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap transition-colors ${
    selected
      ? 'bg-accent text-accent-foreground font-medium'
      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
  }`;
}

/** The pinned tray copy (plan Global Constraints), one row per status phase. */
function trayStatusText(status: BatchItemStatus | undefined): string {
  if (status === undefined || status.phase === 'queued') {
    return 'Queued';
  }
  if (status.phase === 'uploading') {
    return 'Uploading…';
  }
  if (status.phase === 'committing') {
    return 'Committing…';
  }
  if (status.phase === 'done') {
    return 'Done';
  }
  return `Failed: ${status.message}`;
}

/** The row's bar value: live progress while uploading, full when done, indeterminate otherwise. */
function trayProgressValue(status: BatchItemStatus | undefined): number | null {
  if (status === undefined) {
    return null;
  }
  if (status.phase === 'uploading') {
    return Math.round((status.sent / Math.max(1, status.total)) * 100);
  }
  return status.phase === 'done' ? 100 : null;
}

/**
 * One grid tile of the sortable photo grid. GL3: the WHOLE card is the drag
 * handle — attributes + listeners live on the Card, activated only past the
 * sensor constraints (Pointer 8px, Touch 300ms long-press), so clicks and
 * scroll still work; NO touch-none here (it would kill mobile scrolling).
 * GL2: deactivated = the dimmed card only — no status dot.
 */
function SortablePhotoCard({
  photo,
  categoryName,
  selected,
  onToggleSelect,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  photo: GalleryPhoto;
  categoryName: string;
  selected: boolean;
  onToggleSelect: (id: string) => void;
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
      className={`group/card animate-in fade-in slide-in-from-bottom-2 relative cursor-grab gap-0 overflow-hidden rounded-lg py-0 duration-300 active:cursor-grabbing ${
        isDragging ? 'z-10 bg-card shadow-sm' : ''
      } ${photo.isActive ? '' : 'opacity-60'}`}
      {...attributes}
      {...listeners}
      onClick={() => onToggleSelect(photo.id)}
    >
      {/* The Task 5 thumb proxy (AR-1): the browser <img> cannot hold the
          Bearer session, so the gated by-id route is reached through the
          admin server-route proxy — never the raw photoUrl. */}
      <div className='bg-muted relative aspect-[4/3]'>
        <img
          src={`/api/admin/gallery-photos/${photo.id}/thumb`}
          alt={photo.title ?? 'Gallery photo'}
          className='absolute inset-0 h-full w-full object-cover'
          loading='lazy'
        />
        {/* GL3: the position chip is display-only. */}
        <span className='bg-background/90 absolute top-2 left-2 rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums'>
          #{photo.position}
        </span>
        {/* GL1: icon actions overlaid top-right — hover on desktop, tap
            (selected-card state) on touch. Each button stops propagation so
            a click on it never toggles the card's selected state. */}
        <div
          className={`absolute top-2 right-2 z-10 flex gap-1 rounded-md bg-background/90 p-0.5 shadow-sm transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'
          }`}
        >
          <Button
            variant='ghost'
            size='icon-sm'
            type='button'
            aria-label='Edit'
            title='Edit'
            onClick={(e) => {
              e.stopPropagation();
              onEdit(photo.id);
            }}
          >
            <SquarePen aria-hidden='true' />
          </Button>
          {photo.isActive ? (
            <Button
              variant='ghost'
              size='icon-sm'
              type='button'
              aria-label='Deactivate'
              title='Deactivate'
              className='text-destructive hover:bg-destructive/10 hover:text-destructive'
              onClick={(e) => {
                e.stopPropagation();
                onDeactivate(photo.id);
              }}
            >
              <PowerOff aria-hidden='true' />
            </Button>
          ) : (
            <Button
              variant='ghost'
              size='icon-sm'
              type='button'
              aria-label='Reactivate'
              title='Reactivate'
              onClick={(e) => {
                e.stopPropagation();
                onReactivate(photo.id);
              }}
            >
              <Power aria-hidden='true' />
            </Button>
          )}
        </div>
      </div>
      <CardContent className='space-y-2 p-3'>
        <p className='truncate text-sm font-medium'>{photo.title ?? 'Untitled photo'}</p>
        {photo.categoryId ? (
          <Badge variant='outline'>{categoryName}</Badge>
        ) : (
          <span className='text-muted-foreground text-xs'>Uncategorized</span>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * One category rail entry — filter button + the rail's own mini-actions
 * (rename / the active flip, AR-4), drag-reorderable. Deactivated renders
 * `opacity-60` and stays filterable/renamable (staff-visible truth).
 */
function SortableCategoryEntry({
  category,
  count,
  selected,
  isMobile,
  renaming,
  categoryDraft,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDraftChange,
  onDeactivate,
  onReactivate,
}: {
  category: GalleryCategory;
  count: number;
  selected: boolean;
  isMobile: boolean;
  renaming: boolean;
  categoryDraft: string;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDraftChange: (next: string) => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  // Rename swaps the entry for the SAME inline Input, prefilled.
  if (renaming) {
    return (
      <div ref={setNodeRef} className='flex w-full shrink-0 items-center gap-1'>
        <Input
          value={categoryDraft}
          placeholder='Category name'
          aria-label='Category name'
          className='h-8 min-w-32 flex-1'
          autoFocus
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onCommitRename();
            }
          }}
        />
        <Button
          variant='ghost'
          size='icon-sm'
          type='button'
          aria-label='Save category name'
          onClick={onCommitRename}
        >
          <Check aria-hidden='true' />
        </Button>
        <Button
          variant='ghost'
          size='icon-sm'
          type='button'
          aria-label='Cancel rename'
          onClick={onCancelRename}
        >
          <X aria-hidden='true' />
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group/rail-entry flex w-full shrink-0 items-center gap-1',
        isDragging && 'z-10 bg-card shadow-sm',
        // AR-4: dimmed, never hidden — still filterable/renamable.
        !category.isActive && 'opacity-60'
      )}
    >
      <button
        type='button'
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(railEntryClass(selected), 'min-w-0 flex-1')}
        {...attributes}
        {...listeners}
      >
        <span className='min-w-0 flex-1 truncate text-left'>{category.name}</span>
        <span className='text-muted-foreground font-normal'>({count})</span>
      </button>
      {/* The rail's own mini-actions — hover/focus-revealed on desktop;
          touch has no hover, so they stay visible on mobile. */}
      <div
        className={cn(
          'flex shrink-0 items-center',
          isMobile
            ? 'opacity-100'
            : 'opacity-0 transition-opacity group-focus-within/rail-entry:opacity-100 group-hover/rail-entry:opacity-100'
        )}
      >
        <Button
          variant='ghost'
          size='icon-sm'
          type='button'
          aria-label='Rename category'
          title='Rename category'
          onClick={onStartRename}
        >
          <SquarePen aria-hidden='true' />
        </Button>
        {category.isActive ? (
          <Button
            variant='ghost'
            size='icon-sm'
            type='button'
            aria-label='Deactivate'
            title='Deactivate'
            className='text-destructive hover:bg-destructive/10 hover:text-destructive'
            onClick={onDeactivate}
          >
            <PowerOff aria-hidden='true' />
          </Button>
        ) : (
          <Button
            variant='ghost'
            size='icon-sm'
            type='button'
            aria-label='Reactivate'
            title='Reactivate'
            onClick={onReactivate}
          >
            <Power aria-hidden='true' />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * The upload tray (AR-3): one row per staged file — filename, progress bar,
 * the pinned status copy; `Retry` per transient-failed row, `Retry failed`
 * for all of them, `Done` clears the settled tray. Permanent failures
 * (pre-check / server 400) carry NO Retry — the file itself is the problem.
 */
function UploadTray({
  items,
  statuses,
  onRetry,
  onRetryFailed,
  onDone,
}: {
  items: BatchItem[];
  statuses: Map<string, BatchItemStatus>;
  onRetry: (item: BatchItem) => void;
  onRetryFailed: () => void;
  onDone: () => void;
}) {
  const transientFailures = items.filter((item) => {
    const status = statuses.get(item.id);
    return status !== undefined && status.phase === 'failed' && status.kind === 'transient';
  });
  return (
    <Card className='rounded-lg'>
      <CardContent className='space-y-3 p-4'>
        <div className='flex items-center justify-between gap-3'>
          <h3 className='text-sm font-semibold'>Uploading {items.length} photos</h3>
          <div className='flex items-center gap-2'>
            {transientFailures.length > 0 ? (
              <Button variant='outline' size='sm' type='button' onClick={onRetryFailed}>
                Retry failed
              </Button>
            ) : null}
            <Button variant='ghost' size='sm' type='button' onClick={onDone}>
              Done
            </Button>
          </div>
        </div>
        <Separator />
        <div className='space-y-2'>
          {items.map((item) => {
            const status = statuses.get(item.id);
            const failure = status !== undefined && status.phase === 'failed' ? status : null;
            return (
              <div key={item.id} className='flex items-center gap-3'>
                <span className='min-w-0 flex-1 truncate text-sm'>{item.file.name}</span>
                <Progress
                  className='w-32 shrink-0'
                  value={trayProgressValue(status)}
                  aria-label={item.file.name}
                />
                <span className='text-muted-foreground w-44 shrink-0 truncate text-right text-xs'>
                  {trayStatusText(status)}
                </span>
                {failure !== null && failure.kind === 'transient' ? (
                  <Button variant='outline' size='xs' type='button' onClick={() => onRetry(item)}>
                    Retry
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The category rail — the inline panel (AR-4). `All photos` is FIXED FIRST
 * and sits OUTSIDE the sortable ids; the categories drag-reorder under the
 * same sensors as the grid (the mobile horizontal strip drags with them
 * too — rectSortingStrategy computes the transforms from real rects, so
 * both orientations work). One create affordance at the end.
 */
function CategoryRail({
  categories,
  photos,
  filter,
  isMobile,
  creatingCategory,
  renamingCategoryId,
  categoryDraft,
  sensors,
  onFilterChange,
  onStartCreate,
  onCancelCreate,
  onDraftChange,
  onCommitCreate,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onCategoryDeactivate,
  onCategoryReactivate,
  onDragEnd,
}: {
  categories: GalleryCategory[];
  photos: GalleryPhoto[];
  filter: string;
  isMobile: boolean;
  creatingCategory: boolean;
  renamingCategoryId: string | null;
  categoryDraft: string;
  sensors: ReturnType<typeof useSensors>;
  onFilterChange: (next: string) => void;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onDraftChange: (next: string) => void;
  onCommitCreate: () => void;
  onStartRename: (categoryId: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onCategoryDeactivate: (category: GalleryCategory) => void;
  onCategoryReactivate: (category: GalleryCategory) => void;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  function countIn(categoryId: string): number {
    return photos.filter((p) => p.categoryId === categoryId).length;
  }
  const renamingCategory =
    renamingCategoryId !== null
      ? (categories.find((c) => c.id === renamingCategoryId) ?? null)
      : null;
  return (
    <Card className='shrink-0 self-start rounded-lg lg:w-[220px]'>
      {/* Horizontal scroll strip on narrow widths, vertical rail on lg+. */}
      <CardContent className='flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-x-visible'>
        <button
          type='button'
          onClick={() => onFilterChange('all')}
          aria-current={filter === 'all' ? 'true' : undefined}
          className={railEntryClass(filter === 'all')}
        >
          <Images className='size-4 shrink-0' aria-hidden='true' />
          <span className='min-w-0 flex-1 truncate text-left'>All photos</span>
          <span className='text-muted-foreground font-normal'>({photos.length})</span>
        </button>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={rectSortingStrategy}>
            {categories.map((category) => (
              <SortableCategoryEntry
                key={category.id}
                category={category}
                count={countIn(category.id)}
                selected={filter === category.id}
                isMobile={isMobile}
                renaming={renamingCategory?.id === category.id}
                categoryDraft={categoryDraft}
                onSelect={() => onFilterChange(category.id)}
                onStartRename={() => onStartRename(category.id)}
                onCommitRename={onCommitRename}
                onCancelRename={onCancelRename}
                onDraftChange={onDraftChange}
                onDeactivate={() => onCategoryDeactivate(category)}
                onReactivate={() => onCategoryReactivate(category)}
              />
            ))}
          </SortableContext>
        </DndContext>
        {creatingCategory ? (
          <div className='flex w-full shrink-0 items-center gap-1'>
            <Input
              value={categoryDraft}
              placeholder='Category name'
              aria-label='Category name'
              className='h-8 min-w-32 flex-1'
              autoFocus
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCommitCreate();
                }
              }}
            />
            <Button
              variant='ghost'
              size='icon-sm'
              type='button'
              aria-label='Create category'
              onClick={onCommitCreate}
            >
              <Check aria-hidden='true' />
            </Button>
            <Button
              variant='ghost'
              size='icon-sm'
              type='button'
              aria-label='Cancel new category'
              onClick={onCancelCreate}
            >
              <X aria-hidden='true' />
            </Button>
          </div>
        ) : (
          <Button
            variant='ghost'
            size='sm'
            type='button'
            className='shrink-0 justify-start text-muted-foreground'
            onClick={onStartCreate}
          >
            <Plus aria-hidden='true' />
            New category
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The gallery screen: rail + inline category panel, upload tray, sortable
 * card grid, photo editor. All state lives here — the route renders only
 * the PageHeader and this component (its `Upload photos` label opens THIS
 * file's hidden input by id).
 */
export function GalleryScreen() {
  const {
    data: categories,
    isPending: categoriesPending,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery(adminGalleryQueries.categories());
  const {
    data: photos,
    isPending: photosPending,
    isError: photosError,
    refetch: refetchPhotos,
  } = useQuery(adminGalleryQueries.photos());
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  // 'all' = the All photos rail entry; otherwise a category id.
  const [filter, setFilter] = useState<string>('all');
  // GL1: a tap on a card toggles the actions-visible state (the mobile half
  // of the hover/tap reveal; hover covers desktop via group-hover). Only ONE
  // expanded-actions card at a time.
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  // The photo editor: edit-only (photos are created by upload). `editing`
  // carries the retry target; the parent-held `editorState` keeps the user's
  // input intact through a failed save (the branches screen's posture).
  const [editing, setEditing] = useState<{ row: GalleryPhoto } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // Remounts the editor on a failed save's reopen: the shared Save handler
  // closes the Sheet unconditionally, so a failure re-arms `editorOpen` and
  // bumps the nonce to remount (the visible latch only re-arms on mount or
  // an `open` false→true flip).
  const [editorNonce, setEditorNonce] = useState(0);
  const [editorState, setEditorState] = useState<PhotoEditorState>({
    title: '',
    caption: '',
    categoryId: null,
    isActive: true,
  });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [categoryConfirmId, setCategoryConfirmId] = useState<string | null>(null);
  // The rail's one create affordance + the inline rename state.
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState('');
  // The tray (AR-3): the staged items + the pool's per-file statuses.
  const [trayItems, setTrayItems] = useState<BatchItem[]>([]);
  const [trayStatuses, setTrayStatuses] = useState<Map<string, BatchItemStatus>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const captionId = useId();
  const categoryIdId = useId();
  const activeId = useId();

  // GL3 sensors (AR-7): the whole card is the handle — pointer needs an 8px
  // move (wider than the editor rows' 4px because the handle IS the card),
  // touch needs a 300ms long-press (8px tolerance) so vertical scroll never
  // starts a drag; keyboard stays for a11y. Shared by the rail and the grid.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Mutations ---

  // Single-card flips: optimistic on the photos cache (cancel + snapshot +
  // REPLACE the one row's isActive; rollback + toast on error; invalidate
  // either way) — the branches screen's posture.
  const photoFlip = useMutation({
    mutationFn: async ({ row, isActive }: { row: GalleryPhoto; isActive: boolean }) => {
      const result = await saveAdminGalleryPhotoUpdate({
        data: { id: row.id, payload: buildPhotoFlipPayload(row, isActive) },
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async ({ row, isActive }) => {
      await queryClient.cancelQueries({ queryKey: adminGalleryQueries.photos().queryKey });
      const previous = queryClient.getQueryData<GalleryPhoto[]>(
        adminGalleryQueries.photos().queryKey
      );
      queryClient.setQueryData<GalleryPhoto[]>(adminGalleryQueries.photos().queryKey, (old) =>
        old?.map((candidate) => (candidate.id === row.id ? { ...candidate, isActive } : candidate))
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminGalleryQueries.photos().queryKey, context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminGalleryQueries.photos().queryKey });
    },
  });

  // The card grid's order PUT on drop (AR-9): optimistic — Task 4's
  // slot-swap over the filtered view produces the COMPLETE global id list;
  // the cache array is REPLACE-d in that order (never a push into an
  // aliased read row); a failure restores the snapshot + toasts.
  const photoOrder = useMutation({
    mutationFn: async (photoIds: string[]) => {
      const result = await saveAdminGalleryPhotoOrder({ data: { photoIds } });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async (photoIds) => {
      await queryClient.cancelQueries({ queryKey: adminGalleryQueries.photos().queryKey });
      const previous = queryClient.getQueryData<GalleryPhoto[]>(
        adminGalleryQueries.photos().queryKey
      );
      const byId = new Map((previous ?? []).map((p) => [p.id, p]));
      queryClient.setQueryData<GalleryPhoto[]>(
        adminGalleryQueries.photos().queryKey,
        photoIds.flatMap((id) => {
          const row = byId.get(id);
          return row === undefined ? [] : [row];
        })
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminGalleryQueries.photos().queryKey, context.previous);
      }
      toast.error(error.message);
      queryClient.invalidateQueries({ queryKey: adminGalleryQueries.photos().queryKey });
    },
    onSuccess: () => {
      toast.success('Order saved.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminGalleryQueries.photos().queryKey });
    },
  });

  // The rail's order PUT on drop (AR-9): the same posture over the
  // categories cache; `All photos` never rides the ids.
  const categoryOrder = useMutation({
    mutationFn: async (reordered: GalleryCategory[]) => {
      const result = await saveAdminGalleryCategoryOrder({
        data: buildCategoryOrderPayload(reordered),
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async (reordered) => {
      await queryClient.cancelQueries({ queryKey: adminGalleryQueries.categories().queryKey });
      const previous = queryClient.getQueryData<GalleryCategory[]>(
        adminGalleryQueries.categories().queryKey
      );
      queryClient.setQueryData<GalleryCategory[]>(
        adminGalleryQueries.categories().queryKey,
        reordered
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminGalleryQueries.categories().queryKey, context.previous);
      }
      toast.error(error.message);
      queryClient.invalidateQueries({ queryKey: adminGalleryQueries.categories().queryKey });
    },
    onSuccess: () => {
      toast.success('Order saved.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminGalleryQueries.categories().queryKey });
    },
  });

  // The rail's inline saves: create / rename / flip through the two result-
  // valued fns — NON-optimistic, the rail has no inline Field slot, so every
  // category 400 is toast-carried and the inline affordance keeps its value.
  const categorySave = useMutation({
    mutationFn: async (input: CategorySaveInput) => {
      const result =
        input.mode === 'create'
          ? await saveAdminGalleryCategoryCreate({
              data: { name: input.name, isActive: true },
            })
          : input.mode === 'rename'
            ? await saveAdminGalleryCategoryUpdate({
                data: {
                  id: input.row.id,
                  payload: { name: input.name, isActive: input.row.isActive },
                },
              })
            : await saveAdminGalleryCategoryUpdate({
                data: {
                  id: input.row.id,
                  payload: { name: input.row.name, isActive: input.isActive },
                },
              });
      return { input, result };
    },
    onSuccess: ({ input, result }) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminGalleryQueries.categories().queryKey });
        toast.success('Saved.');
        if (input.mode === 'create' || input.mode === 'rename') {
          setCreatingCategory(false);
          setRenamingCategoryId(null);
          setCategoryDraft('');
        }
        return;
      }
      // !ok: the toast carries it; create/rename keep the input's value
      // (the retry is safe).
      toast.error(result.message);
    },
    onError: (error) => {
      // Not an API failure (serialization, session loss) — loud toast.
      toast.error(error.message);
    },
  });

  // Editor saves: NON-optimistic — the form state is the source of truth;
  // success invalidates + toasts + closes, failure keeps the editor open
  // with the state intact (retry is safe — the save is a full-object PUT).
  // No inline Field slot — every photo 400 is toast-carried.
  const photoSave = useMutation({
    mutationFn: async (input: { row: GalleryPhoto; state: PhotoEditorState }) => {
      return saveAdminGalleryPhotoUpdate({
        data: { id: input.row.id, payload: buildPhotoPayload(input.state) },
      });
    },
    onSuccess: (result, input) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminGalleryQueries.photos().queryKey });
        toast.success('Saved.');
        setEditing(null);
        setEditorOpen(false);
        return;
      }
      toast.error(result.message);
      keepEditorOpen(input.row);
    },
    onError: (error, input) => {
      toast.error(error.message);
      keepEditorOpen(input.row);
    },
  });

  // --- Upload wiring (Task 6's pool) ---

  // `presignAdminCoverUpload` is the #139-historical name — its schema
  // already carries `purpose: 'gallery-photo'` (the pool sends it); the
  // result union converts to a throw, the pool's `transient` class.
  async function presign(req: MediaPresignRequest): Promise<MediaPresignResponse> {
    const result = await presignAdminCoverUpload({ data: req });
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.data;
  }

  // The commit adapter: the staging key rides the create
  // (saveAdminGalleryPhotoCreate), whose commit is the verify/promote gate.
  async function commit(input: CreateGalleryPhotoInput) {
    const result = await saveAdminGalleryPhotoCreate({
      data: {
        r2Key: input.r2Key,
        title: input.title || null,
        caption: null,
        categoryId: input.categoryId,
      },
    });
    return result.ok
      ? { ok: true as const, photo: result.data }
      : { ok: false as const, status: result.status, message: result.message };
  }

  async function runThroughPool(items: BatchItem[]) {
    const { done } = await runBatchUpload(items, {
      presign,
      put: putFileToPresignedUrl,
      commit,
      onStatus: (itemId, status) => {
        // The Task-6 review's throwing-onStatus minor, consumer side: this
        // tap is a pure setState + one invalidate — it cannot throw, so the
        // pool's settlement guarantee holds for this wiring.
        setTrayStatuses((prev) => {
          const next = new Map(prev);
          next.set(itemId, status);
          return next;
        });
        // Every done invalidates — the row becomes a real card ("only
        // committed files become savable", structurally).
        if (status.phase === 'done') {
          queryClient.invalidateQueries({ queryKey: adminGalleryQueries.photos().queryKey });
        }
      },
    });
    if (done.length > 0) {
      toast.success(`Uploaded ${done.length} photos.`);
    }
  }

  function onFilesChosen(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow re-picking the same file
    if (files.length === 0) {
      return;
    }
    // AR-11: category = the open rail filter; title = file name minus its
    // extension, captured AT ENQUEUE.
    const items: BatchItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      title: titleFromFileName(file.name),
      categoryId: filter === 'all' ? null : filter,
    }));
    setTrayItems((prev) => [...prev, ...items]);
    void runThroughPool(items);
  }

  function retryItem(item: BatchItem) {
    // Re-runs that item through the pool alone.
    void runThroughPool([item]);
  }

  function retryFailed() {
    const failed = trayItems.filter((item) => {
      const status = trayStatuses.get(item.id);
      return status !== undefined && status.phase === 'failed' && status.kind === 'transient';
    });
    if (failed.length > 0) {
      void runThroughPool(failed);
    }
  }

  function clearTray() {
    setTrayItems([]);
    setTrayStatuses(new Map());
  }

  // The tray renders while ANY item is non-settled or a failure exists.
  const hasUnsettled = trayItems.some((item) => {
    const status = trayStatuses.get(item.id);
    return status === undefined || (status.phase !== 'done' && status.phase !== 'failed');
  });
  const hasFailure = trayItems.some((item) => trayStatuses.get(item.id)?.phase === 'failed');
  const trayVisible = trayItems.length > 0 && (hasUnsettled || hasFailure);

  // --- Rail handlers ---

  function onStartCreate() {
    setCreatingCategory(true);
    setCategoryDraft('');
  }

  function onCancelCreate() {
    setCreatingCategory(false);
    setCategoryDraft('');
  }

  function commitCategoryCreate() {
    const name = categoryDraft.trim();
    if (name === '') {
      toast.error('Category name is required.');
      return;
    }
    categorySave.mutate({ mode: 'create', name });
  }

  function onStartRename(id: string) {
    const row = categories?.find((c) => c.id === id);
    setRenamingCategoryId(id);
    setCategoryDraft(row?.name ?? '');
  }

  function onCancelRename() {
    setRenamingCategoryId(null);
    setCategoryDraft('');
  }

  function commitCategoryRename() {
    if (renamingCategoryId === null) {
      return;
    }
    const row = categories?.find((c) => c.id === renamingCategoryId);
    if (!row) {
      setRenamingCategoryId(null);
      return;
    }
    const name = categoryDraft.trim();
    if (name === '') {
      toast.error('Category name is required.');
      return;
    }
    categorySave.mutate({ mode: 'rename', row, name });
  }

  function onCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) {
      return;
    }
    const ids = categories.map((c) => c.id);
    const reorderedIds = reorderIds(ids, String(active.id), String(over.id));
    if (reorderedIds === ids) {
      return;
    }
    const byId = new Map(categories.map((c) => [c.id, c]));
    const reordered: GalleryCategory[] = [];
    for (const id of reorderedIds) {
      const row = byId.get(id);
      if (row !== undefined) {
        reordered.push(row);
      }
    }
    categoryOrder.mutate(reordered);
  }

  // --- Grid handlers ---

  function onPhotoDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !photos) {
      return;
    }
    // The slot-swap over the filtered view: invisible photos keep their
    // slots, so a filtered drag can never collide with positions held
    // outside the filter.
    const globalIds = photos.map((p) => p.id);
    const reordered = reorderVisiblePhotos(
      globalIds,
      visiblePhotos.map((p) => p.id),
      String(active.id),
      String(over.id)
    );
    if (reordered === globalIds) {
      return;
    }
    photoOrder.mutate(reordered);
  }

  function openEdit(row: GalleryPhoto) {
    setEditorState(photoStateFromRead(row));
    setEditing({ row });
    setEditorOpen(true);
  }

  /** Re-arms the editor after a failed save (see the state comments above). */
  function keepEditorOpen(row: GalleryPhoto) {
    setEditing({ row });
    setEditorOpen(true);
    setEditorNonce((n) => n + 1);
  }

  if (categoriesError || photosError) {
    // Error posture (#155): either read failed — Retry re-runs both.
    return (
      <section className='space-y-4'>
        <QueryErrorState
          line={QUERY_ERROR_LINE}
          onRetry={() => {
            void refetchCategories();
            void refetchPhotos();
          }}
        />
      </section>
    );
  }

  // --- Pending posture (before any narrowing) ---

  if (categoriesPending || photosPending || !categories || !photos) {
    return (
      <section className='space-y-4'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start'>
          <Card className='shrink-0 rounded-lg lg:w-[220px]'>
            <CardContent className='flex flex-col gap-1 p-2'>
              {PENDING_RAIL_KEYS.map((key) => (
                <Skeleton key={key} className='h-8 w-full rounded-md' />
              ))}
            </CardContent>
          </Card>
          <div className='min-w-0 flex-1'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {PENDING_CARD_KEYS.map((key) => (
                <Card key={key} className='gap-0 overflow-hidden rounded-lg py-0'>
                  <Skeleton className='aspect-[4/3] w-full rounded-none' />
                  <CardContent className='space-y-2 p-3'>
                    <Skeleton className='h-4 w-2/3' />
                    <Skeleton className='h-4 w-1/3' />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // --- Derived (post-narrowing) ---

  // The reads arrive in list order — (position, id) is the display order.
  const visiblePhotos = filter === 'all' ? photos : photos.filter((p) => p.categoryId === filter);
  const filterName =
    filter === 'all'
      ? 'All photos'
      : (categories.find((c) => c.id === filter)?.name ?? 'All photos');
  const confirmPhoto = photos.find((p) => p.id === confirmId);
  const confirmCategory = categories.find((c) => c.id === categoryConfirmId);
  const categoryNameFor = (photo: GalleryPhoto): string =>
    categories.find((c) => c.id === photo.categoryId)?.name ?? 'Uncategorized';

  return (
    <section className='space-y-4'>
      {/* The hidden input + its ref live in the SCREEN — the route's
          `Upload photos` label opens it by id (no route logic). The
          picker is JPG-only (#170, ruling #165 Q7 a): accept matches
          the pre-check's gate — the package editor's cover input is
          the reference. The pre-check stays the courtesy gate; the
          server re-verifies (#136). */}
      <input
        ref={fileInputRef}
        id='gallery-upload-input'
        type='file'
        multiple
        accept='image/jpeg'
        className='hidden'
        tabIndex={-1}
        aria-hidden='true'
        onChange={onFilesChosen}
      />

      <div className='flex flex-col gap-4 lg:flex-row lg:items-start'>
        <CategoryRail
          categories={categories}
          photos={photos}
          filter={filter}
          isMobile={isMobile}
          creatingCategory={creatingCategory}
          renamingCategoryId={renamingCategoryId}
          categoryDraft={categoryDraft}
          sensors={sensors}
          onFilterChange={setFilter}
          onStartCreate={onStartCreate}
          onCancelCreate={onCancelCreate}
          onDraftChange={setCategoryDraft}
          onCommitCreate={commitCategoryCreate}
          onStartRename={onStartRename}
          onCommitRename={commitCategoryRename}
          onCancelRename={onCancelRename}
          onCategoryDeactivate={(category) => setCategoryConfirmId(category.id)}
          onCategoryReactivate={(category) =>
            categorySave.mutate({ mode: 'flip', row: category, isActive: true })
          }
          onDragEnd={onCategoryDragEnd}
        />

        {/* Toolbar + upload tray + photo grid */}
        <div className='min-w-0 flex-1 space-y-3'>
          <h2 className='text-lg font-semibold tracking-tight'>{filterName}</h2>

          {trayVisible ? (
            <UploadTray
              items={trayItems}
              statuses={trayStatuses}
              onRetry={retryItem}
              onRetryFailed={retryFailed}
              onDone={clearTray}
            />
          ) : null}

          {visiblePhotos.length === 0 ? (
            filter === 'all' ? (
              // TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items)
              <EmptyState line='No photos yet.'>
                <Button type='button' onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus aria-hidden='true' />
                  Upload photos
                </Button>
              </EmptyState>
            ) : (
              // TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items)
              <EmptyState line='No photos in this category yet.' />
            )
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onPhotoDragEnd}
            >
              <SortableContext
                items={visiblePhotos.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {visiblePhotos.map((photo) => (
                    <SortablePhotoCard
                      key={photo.id}
                      photo={photo}
                      categoryName={categoryNameFor(photo)}
                      selected={selectedPhotoId === photo.id}
                      onToggleSelect={(id) =>
                        setSelectedPhotoId((prev) => (prev === id ? null : id))
                      }
                      onEdit={(id) => {
                        const row = photos.find((p) => p.id === id);
                        if (row) {
                          openEdit(row);
                        }
                      }}
                      onDeactivate={setConfirmId}
                      onReactivate={(id) => {
                        const row = photos.find((p) => p.id === id);
                        if (row) {
                          photoFlip.mutate({ row, isActive: true });
                        }
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {editing ? (
        <LightEntityEditor
          key={editorNonce}
          title={editing.row.title ?? 'Untitled photo'}
          description='Title, caption, category, and the active flag.'
          open={editorOpen}
          onOpenChange={(next) => {
            if (!next) {
              setEditorOpen(false);
              setEditing(null);
            }
          }}
          onSave={() => photoSave.mutate({ row: editing.row, state: editorState })}
        >
          {/* Thumb preview — the same gated proxy (AR-1). */}
          <div className='bg-muted relative aspect-[4/3] w-28 overflow-hidden rounded-md'>
            <img
              src={`/api/admin/gallery-photos/${editing.row.id}/thumb`}
              alt={editing.row.title ?? 'Gallery photo'}
              className='absolute inset-0 h-full w-full object-cover'
            />
          </div>
          <Field>
            <FieldLabel htmlFor={titleId}>Title</FieldLabel>
            <Input
              id={titleId}
              value={editorState.title}
              onChange={(e) => setEditorState({ ...editorState, title: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={captionId}>Caption</FieldLabel>
            <Textarea
              id={captionId}
              rows={3}
              value={editorState.caption}
              onChange={(e) => setEditorState({ ...editorState, caption: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={categoryIdId}>Category</FieldLabel>
            <Select
              value={editorState.categoryId ?? UNCATEGORIZED}
              onValueChange={(value) =>
                setEditorState({
                  ...editorState,
                  categoryId: String(value) === UNCATEGORIZED ? null : String(value),
                })
              }
            >
              <SelectTrigger id={categoryIdId} aria-label='Category' className='w-full'>
                {/* N5: render the item LABEL — Base UI's SelectValue falls
                    through to the raw value when no items prop is given, so
                    the label is resolved explicitly; 'Uncategorized' stands
                    in for the null categoryId. */}
                <SelectValue>
                  {(value: string | null) =>
                    value === UNCATEGORIZED || value == null
                      ? 'Uncategorized'
                      : (categories.find((c) => c.id === value)?.name ?? 'Uncategorized')
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
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
              checked={editorState.isActive}
              onCheckedChange={(checked) =>
                setEditorState({ ...editorState, isActive: checked === true })
              }
            />
            Active
          </label>
        </LightEntityEditor>
      ) : null}

      {confirmPhoto ? (
        <DeactivateConfirm
          name={confirmPhoto.title ?? 'Untitled photo'}
          open={confirmId === confirmPhoto.id}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmId(null);
            }
          }}
          onConfirm={() => {
            photoFlip.mutate({ row: confirmPhoto, isActive: false });
            setConfirmId(null);
          }}
        />
      ) : null}

      {confirmCategory ? (
        <DeactivateConfirm
          name={confirmCategory.name}
          open={categoryConfirmId === confirmCategory.id}
          onOpenChange={(open) => {
            if (!open) {
              setCategoryConfirmId(null);
            }
          }}
          onConfirm={() => {
            categorySave.mutate({ mode: 'flip', row: confirmCategory, isActive: false });
            setCategoryConfirmId(null);
          }}
        />
      ) : null}
    </section>
  );
}
