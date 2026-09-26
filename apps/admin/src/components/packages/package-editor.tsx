// The package editor (M5 #139): the full create + edit composition over live
// data, ruled by #131 and ported element-for-element from the composition of
// record (branch prototype/131-admin-cms-compositions,
// screens/package-editor.tsx). The prototype's local fixture state and
// simulated upload are replaced by the landed seams: Task 3's
// PackageEditorState + builders/validator (lib/package-editor-state.ts) hold
// ALL editor state; the Cover card drives Task 3's uploadCover loop
// (lib/cover-upload.ts) through Task 2's result-valued presign server fn;
// saves ride Task 2's result-valued save fns so the API's 400 field details
// survive the boundary into conflictFieldErrors' inline slots. Displayed
// order IS array order: the prototype's contiguous-section insertion and
// identity-based section-scoped reorder discipline port verbatim.
//
// Deltas from the prototype where it simulated: the fixture Select becomes
// the adminLookupQueries.printSizes vocabulary (ACTIVE sizes as options, the
// explicit SelectValue render resolving ANY current value's label incl.
// deactivated); the upload becomes the presign → XHR → bind loop; create
// mode renders NO Advanced card (the server generates the slug — AQ-6).
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  Attire,
  CreateServicePackageInput,
  MediaPresignRequest,
  MediaPresignResponse,
  PrintSize,
  UpdateServicePackageInput,
} from '@sevendays/types';
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
import { Separator } from '@sevendays/ui/components/separator';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import { Textarea } from '@sevendays/ui/components/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronDown, Frame, Gift, GripVertical, Image, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { StatusBadge } from '#/components/cms/shared';
import {
  presignAdminCoverUpload,
  saveAdminPackageCreate,
  saveAdminPackageUpdate,
} from '#/lib/admin.functions';
import { adminLookupQueries, adminPackageQueries } from '#/lib/cms-queries';
import { type CoverUploadStatus, uploadCover } from '#/lib/cover-upload';
import {
  buildCreatePayload,
  buildUpdatePayload,
  conflictFieldErrors,
  DURATION_HELPER,
  type EditorFieldErrors,
  type EditorInclusion,
  editorStateFromRead,
  type InclusionFieldErrors,
  newEditorState,
  type PackageEditorState,
  PESO_HELPER,
  validateEditorState,
} from '#/lib/package-editor-state';

const KIND_ICONS = {
  framed_picture: Frame,
  print: Image,
  privilege: Gift,
} as const;

/**
 * The inline-error shape the editor renders: Task 3's `EditorFieldErrors`
 * plus the `slug` slot only the Advanced card can host (server 400s at
 * `['slug']` — a clash or a format failure — mark the slug Field; the seam's
 * record has no slug slot by design, so this is the render-side extension).
 */
interface EditorDisplayErrors extends EditorFieldErrors {
  slug?: string;
}

/** A failed result from the save/presign server fns (Task 2's seam). */
type SaveFailure = {
  ok: false;
  status: number;
  message: string;
  details?: unknown;
};

export interface PackageEditorProps {
  mode: 'create' | 'edit';
  /** The uuid of the package under edit (edit mode; the route's param). */
  packageId?: string;
}

interface RowActions {
  onRemove: (key: string) => void;
  onUpdate: (key: string, patch: Partial<EditorInclusion>) => void;
  onToggleAttire: (key: string, attireId: string, checked: boolean) => void;
}

function InclusionEditorRow({
  row,
  printSizes,
  attires,
  errors,
  onRemove,
  onUpdate,
  onToggleAttire,
}: {
  row: EditorInclusion;
  printSizes: PrintSize[];
  attires: Attire[];
  errors?: InclusionFieldErrors;
} & RowActions) {
  const KindIcon = KIND_ICONS[row.kind];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.key,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // E3: solid card bg + shadow while dragging so the dragged row's text
      // never overlaps the rows beneath it.
      className={`space-y-2 rounded-lg border p-3 ${isDragging ? 'relative z-10 bg-card shadow-sm' : ''} ${errors?.frameToken ? 'border-destructive' : ''}`}
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
            className={`w-16 ${errors?.quantity ? 'border-destructive' : ''}`}
            value={row.quantityInput}
            onChange={(e) => onUpdate(row.key, { quantityInput: e.target.value })}
          />
        ) : null}
        {row.kind === 'print' ? (
          <Select
            value={row.printSizeId ?? undefined}
            onValueChange={(value) => onUpdate(row.key, { printSizeId: String(value) })}
          >
            <SelectTrigger
              aria-label='Print size'
              className={`w-24 ${errors?.printSizeId ? 'border-destructive' : ''}`}
            >
              {/* N5: render the item LABEL explicitly — Base UI's SelectValue
                  falls through to the raw value when no items prop is given.
                  The options list ACTIVE sizes only; the explicit render still
                  resolves a deactivated CURRENT value's code. */}
              <SelectValue>
                {(value: string | null) => printSizes.find((ps) => ps.id === value)?.code ?? '—'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {printSizes
                .filter((ps) => ps.isActive)
                .map((ps) => (
                  <SelectItem key={ps.id} value={ps.id}>
                    {ps.code}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        ) : null}
        <Input
          className={`min-w-40 flex-1 ${errors?.description ? 'border-destructive' : ''}`}
          value={row.description}
          placeholder={row.kind === 'privilege' ? undefined : 'Description (optional)'}
          aria-label={row.kind === 'privilege' ? 'Privilege' : 'Description'}
          onChange={(e) => onUpdate(row.key, { description: e.target.value })}
        />
        <Button
          variant='ghost'
          size='icon-sm'
          type='button'
          aria-label='Remove'
          onClick={() => onRemove(row.key)}
        >
          <X />
        </Button>
      </div>
      {/* N7: the four-attire inline chips on framed_picture/print rows only —
          privileges drop them (the T8-scoped ruling). AQ-4: a deactivated
          attire's chip renders dimmed; the vocabulary is never truncated. */}
      {row.kind !== 'privilege' ? (
        <div className='flex flex-wrap items-center gap-1.5'>
          {attires.map((attire) => (
            <label
              key={attire.id}
              htmlFor={`${row.key}-${attire.id}`}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs ${attire.isActive ? '' : 'opacity-60'} ${errors?.attires ? 'border-destructive' : ''}`}
            >
              <Checkbox
                id={`${row.key}-${attire.id}`}
                checked={row.attireIds.includes(attire.id)}
                onCheckedChange={(checked) => onToggleAttire(row.key, attire.id, checked === true)}
              />
              {attire.name}
            </label>
          ))}
        </div>
      ) : null}
      {/* Save-gate marking: the row's offending slots, as muted destructive
          lines under the controls they name. */}
      {errors ? (
        <div className='space-y-0.5'>
          {[
            errors.quantity,
            errors.printSizeId,
            errors.attires,
            errors.description,
            errors.frameToken,
          ]
            .filter((message): message is string => message !== undefined)
            .map((message) => (
              <p key={message} className='text-destructive text-xs'>
                {message}
              </p>
            ))}
        </div>
      ) : null}
    </div>
  );
}

export function PackageEditor({ mode, packageId }: PackageEditorProps) {
  // Edit loads the package + both lookups; create loads the lookups only
  // (the disabled package query keeps hook order stable across modes).
  const packageQuery = useQuery({
    ...adminPackageQueries.byId(packageId ?? ''),
    enabled: mode === 'edit',
  });
  const printSizesQuery = useQuery(adminLookupQueries.printSizes());
  const attiresQuery = useQuery(adminLookupQueries.attires());

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // The editor's whole state is Task 3's seam shape. null = the edit read
  // hasn't landed yet (skeleton posture); create starts filled.
  const [state, setState] = useState<PackageEditorState | null>(() =>
    mode === 'create' ? newEditorState() : null
  );
  const [uploadStatus, setUploadStatus] = useState<CoverUploadStatus>({ phase: 'idle' });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<EditorDisplayErrors | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The bound preview's object URL — the caller's to revoke (Task 3's JSDoc
  // contract): on replace and on unmount.
  const previewUrlRef = useRef<string | null>(null);

  const nameId = useId();
  const descriptionId = useId();
  const priceId = useId();
  const durationId = useId();
  const slugId = useId();
  const featuredId = useId();
  const activeId = useId();

  // Hydrate once from the edit read — never on refetch (a post-save
  // invalidation must not clobber the editor's state).
  useEffect(() => {
    if (mode === 'edit' && packageQuery.data && state === null) {
      setState(editorStateFromRead(packageQuery.data));
    }
  }, [mode, packageQuery.data, state]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // One sensor set, shared by all three DndContexts: pointer small-movement
  // threshold, touch long-press so scroll never fights drag, keyboard
  // coordinates for the grips.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function updateField<K extends keyof PackageEditorState>(key: K, value: PackageEditorState[K]) {
    setState((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateInclusion(key: string, patch: Partial<EditorInclusion>) {
    setState((prev) =>
      prev
        ? {
            ...prev,
            inclusions: prev.inclusions.map((row) =>
              row.key === key ? { ...row, ...patch } : row
            ),
          }
        : prev
    );
  }

  function removeInclusion(key: string) {
    setState((prev) =>
      prev ? { ...prev, inclusions: prev.inclusions.filter((row) => row.key !== key) } : prev
    );
  }

  // N7: toggles write into the row's attireIds array — selection order is
  // membership order; the builders re-pin to the lookup's array order.
  function toggleAttire(key: string, attireId: string, checked: boolean) {
    setState((prev) =>
      prev
        ? {
            ...prev,
            inclusions: prev.inclusions.map((row) =>
              row.key === key
                ? {
                    ...row,
                    attireIds: checked
                      ? [...row.attireIds, attireId]
                      : row.attireIds.filter((id) => id !== attireId),
                  }
                : row
            ),
          }
        : prev
    );
  }

  function addFrame() {
    setState((prev) =>
      prev ? { ...prev, frames: [...prev.frames, { token: crypto.randomUUID() }] } : prev
    );
  }

  function addPrint() {
    const row: EditorInclusion = {
      key: crypto.randomUUID(),
      kind: 'print',
      quantityInput: '1',
      printSizeId: printSizesQuery.data?.find((ps) => ps.isActive)?.id ?? null,
      frameToken: null,
      attireIds: [],
      description: '',
    };
    // Insert WITHIN the prints block of the underlying array (not appended at
    // the end) so sections stay contiguous — array order must keep matching
    // displayed order (the #137 write shape).
    setState((prev) => {
      if (!prev) {
        return prev;
      }
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
    const row: EditorInclusion = {
      key: crypto.randomUUID(),
      kind: 'privilege',
      quantityInput: '',
      printSizeId: null,
      frameToken: null,
      attireIds: [],
      description: '',
    };
    // Insert WITHIN the privileges block (they close the array): after the
    // last privilege, or at the end when none exist yet.
    setState((prev) => {
      if (!prev) {
        return prev;
      }
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
  // so a drag can never cross another section's rows.
  function reorderInclusions(
    matches: (row: EditorInclusion) => boolean,
    activeId: string,
    overId: string
  ) {
    setState((prev) => {
      if (!prev) {
        return prev;
      }
      const section = prev.inclusions.filter(matches);
      const from = section.findIndex((candidate) => candidate.key === activeId);
      const to = section.findIndex((candidate) => candidate.key === overId);
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

  function makeDragEnd(matches: (row: EditorInclusion) => boolean) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      reorderInclusions(matches, String(active.id), String(over.id));
    };
  }

  // --- The cover loop (Task 3's uploadCover, wired to Task 2's presign) ---

  async function presign(req: MediaPresignRequest): Promise<MediaPresignResponse> {
    const result = await presignAdminCoverUpload({ data: req });
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.data;
  }

  function handleUploadStatus(next: CoverUploadStatus) {
    setUploadStatus(next);
    if (next.phase === 'bound') {
      // Re-upload replaces the key (and revokes the replaced preview URL);
      // binding happens only through the atomic save — the preview reflects
      // state, never commits.
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = next.previewUrl;
      setState((prev) => (prev ? { ...prev, coverImageKey: next.stagingKey } : prev));
    }
  }

  async function startUpload(file: File) {
    try {
      await uploadCover(file, presign, handleUploadStatus);
    } catch {
      // XHR error/abort already emitted `failed` through onStatus — the
      // machine never stalls; nothing further to surface here.
    }
  }

  function removeCover() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setUploadStatus({ phase: 'idle' });
    // Three-state encoding: null = explicit clear on the next save.
    setState((prev) => (prev ? { ...prev, coverImageKey: null } : prev));
  }

  // --- The save gate (client validation → result-valued mutations) ---

  function handleSaveFailure(result: SaveFailure) {
    // Server failure: 400 details map to the same inline slots; a slug
    // conflict marks the slug Field even when collapsed (auto-expand).
    const conflicts = result.status === 400 ? conflictFieldErrors(result.details) : {};
    const display: EditorDisplayErrors = { inclusions: {} };
    if (conflicts.name) {
      display.name = conflicts.name;
    }
    if (conflicts.description) {
      display.description = conflicts.description;
    }
    if (conflicts.priceCents) {
      display.price = conflicts.priceCents;
    }
    if (conflicts.slug) {
      display.slug = conflicts.slug;
    }
    if (display.name || display.description || display.price || display.slug) {
      setFieldErrors(display);
      if (display.slug) {
        setAdvancedOpen(true);
      }
      return;
    }
    toast.error(result.message);
  }

  const createSave = useMutation({
    mutationFn: (payload: CreateServicePackageInput) => saveAdminPackageCreate({ data: payload }),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminPackageQueries.all().queryKey });
        toast.success('Saved.');
        void navigate({ to: '/packages/$packageId/edit', params: { packageId: result.data.id } });
      } else {
        handleSaveFailure(result);
      }
    },
  });

  const editSave = useMutation({
    mutationFn: (payload: UpdateServicePackageInput) => {
      // Unreachable from the edit route (the param is uuid-validated); the
      // result value keeps the gate's single failure path.
      if (packageId === undefined) {
        return Promise.resolve({ ok: false as const, status: 0, message: 'Missing package id.' });
      }
      return saveAdminPackageUpdate({ data: { id: packageId, payload } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: adminPackageQueries.all().queryKey });
        queryClient.invalidateQueries({
          queryKey: adminPackageQueries.byId(result.data.id).queryKey,
        });
        toast.success('Saved.');
        // Stay on the route.
      } else {
        handleSaveFailure(result);
      }
    },
  });

  const savePending = createSave.isPending || editSave.isPending;

  function saveChanges() {
    if (!state || !printSizesQuery.data || !attiresQuery.data) {
      return;
    }
    const errors = validateEditorState(state);
    const hasInlineErrors =
      errors.name !== undefined ||
      errors.description !== undefined ||
      errors.price !== undefined ||
      Object.keys(errors.inclusions).length > 0;
    if (hasInlineErrors) {
      setFieldErrors(errors);
      toast.error('Fix the highlighted fields.');
      return;
    }
    setFieldErrors(null);
    if (mode === 'create') {
      createSave.mutate(buildCreatePayload(state, attiresQuery.data));
    } else {
      editSave.mutate(buildUpdatePayload(state, attiresQuery.data));
    }
  }

  // --- Pending posture: skeleton until the (create: two / edit: three)
  // queries have landed and the edit state has hydrated. ---
  if (
    state === null ||
    printSizesQuery.data === undefined ||
    attiresQuery.data === undefined ||
    (mode === 'edit' && packageQuery.data === undefined)
  ) {
    return (
      <section className='space-y-6' aria-busy='true'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-36' />
          <div className='flex items-center justify-between gap-4'>
            <Skeleton className='h-8 w-56' />
            <Skeleton className='h-9 w-28' />
          </div>
        </div>
        <div className='grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)]'>
          <div className='space-y-6'>
            <Skeleton className='h-96 rounded-lg' />
            <Skeleton className='h-64 rounded-lg' />
            {mode === 'edit' ? <Skeleton className='h-16 rounded-lg' /> : null}
          </div>
          <div className='min-w-0 space-y-4'>
            <Skeleton className='h-7 w-32' />
            <Skeleton className='h-44 rounded-lg' />
            <Skeleton className='h-44 rounded-lg' />
            <Skeleton className='h-44 rounded-lg' />
          </div>
        </div>
      </section>
    );
  }

  const printSizes = printSizesQuery.data;
  const attires = attiresQuery.data;
  const prints = state.inclusions.filter((row) => row.kind === 'print');
  const privileges = state.inclusions.filter((row) => row.kind === 'privilege');
  const hasDeactivatedSizes = printSizes.some((ps) => !ps.isActive);
  const uploading = uploadStatus.phase === 'presigning' || uploadStatus.phase === 'uploading';

  const rowActions: RowActions = {
    onRemove: removeInclusion,
    onUpdate: updateInclusion,
    onToggleAttire: toggleAttire,
  };

  return (
    <section className='space-y-6'>
      <header className='space-y-1'>
        <div>
          <Link
            to='/packages'
            className='text-muted-foreground hover:text-foreground w-fit text-sm'
          >
            ← Back to packages
          </Link>
        </div>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-semibold tracking-tight'>
              {mode === 'create' ? 'New package' : state.name}
            </h1>
            {mode === 'edit' ? <StatusBadge isActive={state.isActive} /> : null}
          </div>
          <Button type='button' disabled={savePending} onClick={saveChanges}>
            Save changes
          </Button>
        </div>
      </header>

      {/* E1: the field cards stand on the left, a Separator divides them from
          the inclusions area, and Frames/Prints/Privileges are three visually
          grouped section cards (radius per the G1 step-down). */}
      <div className='grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)]'>
        <div className='space-y-6'>
          {/* TODO(token-ruling): card-radius step-down pending the owner's design-system ruling (#134 open items) */}
          <Card className='rounded-lg'>
            <CardHeader>
              <CardTitle>Core</CardTitle>
            </CardHeader>
            <CardContent className='space-y-5'>
              <Field>
                <FieldLabel htmlFor={nameId}>Name</FieldLabel>
                <Input
                  id={nameId}
                  className={fieldErrors?.name ? 'border-destructive' : undefined}
                  value={state.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
                {fieldErrors?.name ? (
                  <p className='text-destructive text-xs'>{fieldErrors.name}</p>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
                <Textarea
                  id={descriptionId}
                  rows={3}
                  className={fieldErrors?.description ? 'border-destructive' : undefined}
                  value={state.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
                {fieldErrors?.description ? (
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
                    className={`pl-7 tabular-nums ${fieldErrors?.price ? 'border-destructive' : ''}`}
                    // NaN (an unparseable entry — the seam's encoding) renders
                    // as an empty input; the save gate surfaces the error.
                    value={Number.isNaN(state.priceCents) ? '' : state.priceCents / 100}
                    onChange={(e) =>
                      updateField('priceCents', Math.round(Number(e.target.value) * 100))
                    }
                  />
                </div>
                <FieldDescription>{PESO_HELPER}</FieldDescription>
                {fieldErrors?.price ? (
                  <p className='text-destructive text-xs'>{fieldErrors.price}</p>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={durationId}>Duration (minutes)</FieldLabel>
                <Input
                  id={durationId}
                  type='number'
                  value={state.durationInput}
                  onChange={(e) => updateField('durationInput', e.target.value)}
                />
                <FieldDescription>{DURATION_HELPER}</FieldDescription>
              </Field>
              <div className='flex flex-wrap gap-6'>
                <label htmlFor={featuredId} className='flex items-center gap-2 text-sm font-medium'>
                  <Checkbox
                    id={featuredId}
                    checked={state.isFeatured}
                    onCheckedChange={(checked) => updateField('isFeatured', checked === true)}
                  />
                  Featured
                </label>
                <label htmlFor={activeId} className='flex items-center gap-2 text-sm font-medium'>
                  <Checkbox
                    id={activeId}
                    checked={state.isActive}
                    onCheckedChange={(checked) => updateField('isActive', checked === true)}
                  />
                  Active
                </label>
              </div>
            </CardContent>
          </Card>

          {/* TODO(token-ruling): card-radius step-down pending the owner's design-system ruling (#134 open items) */}
          <Card className='rounded-lg'>
            <CardHeader>
              <CardTitle>Cover</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {/* Preview precedence: a fresh bound upload shows the local
                  object URL; a pending removal (coverImageKey: null) shows the
                  placeholder; else the read's coverImageUrl; else the
                  placeholder. The preview reflects state, never commits. */}
              {uploadStatus.phase === 'bound' ? (
                <img
                  src={uploadStatus.previewUrl}
                  alt={`${state.name} cover`}
                  className='aspect-[3/2] w-full rounded-md object-cover'
                />
              ) : state.coverImageKey === null ? (
                <div className='bg-muted text-muted-foreground grid aspect-[3/2] w-full place-items-center rounded-md'>
                  <Image aria-hidden='true' className='size-8' />
                </div>
              ) : state.coverImageUrl ? (
                <img
                  src={state.coverImageUrl}
                  alt={`${state.name} cover`}
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
                  accept='image/jpeg'
                  className='hidden'
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) {
                      void startUpload(file);
                    }
                  }}
                />
                <Button
                  variant='outline'
                  type='button'
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload cover
                </Button>
                <Button variant='ghost' type='button' disabled={uploading} onClick={removeCover}>
                  Remove cover
                </Button>
              </div>
              {/* The per-file status line (single-file leg) — agent-authored
                  texts, flagged for Task 7's rendered-variant record. */}
              {uploadStatus.phase === 'presigning' ? (
                <p className='text-muted-foreground text-xs'>Presigning…</p>
              ) : null}
              {uploadStatus.phase === 'uploading' ? (
                <p className='text-muted-foreground text-xs'>
                  Uploading…{' '}
                  {uploadStatus.total > 0
                    ? Math.round((uploadStatus.sent / uploadStatus.total) * 100)
                    : 0}
                  %
                </p>
              ) : null}
              {uploadStatus.phase === 'bound' ? (
                <p className='text-muted-foreground text-xs'>Cover ready — save to bind it.</p>
              ) : null}
              {uploadStatus.phase === 'failed' ? (
                <p className='text-destructive text-xs'>Upload failed: {uploadStatus.message}</p>
              ) : null}
              <p className='text-muted-foreground text-xs'>JPG only, up to 50 MiB.</p>
            </CardContent>
          </Card>

          {mode === 'edit' ? (
            // AQ-6: create renders NO Advanced card — the server generates
            // the slug at create; edit owns it behind the break-links warning.
            <div>
              {/* TODO(token-ruling): card-radius step-down pending the owner's design-system ruling (#134 open items) */}
              <Card className='rounded-lg'>
                <CardContent>
                  <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                    <CollapsibleTrigger render={<Button variant='ghost' size='sm' type='button' />}>
                      Advanced
                      <ChevronDown aria-hidden='true' className='text-muted-foreground size-4' />
                    </CollapsibleTrigger>
                    <CollapsibleContent className='space-y-2 pt-2'>
                      <Field>
                        <FieldLabel htmlFor={slugId}>Slug</FieldLabel>
                        <Input
                          id={slugId}
                          className={fieldErrors?.slug ? 'border-destructive' : undefined}
                          value={state.slug}
                          onChange={(e) => updateField('slug', e.target.value)}
                        />
                        <FieldDescription>
                          Changing the slug breaks links that point here.
                        </FieldDescription>
                        {fieldErrors?.slug ? (
                          <p className='text-destructive text-xs'>{fieldErrors.slug}</p>
                        ) : null}
                      </Field>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        {/* E1: separators between the left card column and the inclusions
            area — horizontal when stacked, vertical on the xl grid. */}
        <Separator className='xl:hidden' />
        <Separator orientation='vertical' className='hidden xl:block' />

        <div className='min-w-0 space-y-4'>
          <h2 className='text-lg font-semibold tracking-tight'>Inclusions</h2>

          {/* N6: the three section groups render bg-card — the rounded-lg
              step-down and borders are unchanged. */}
          <section className='space-y-3 rounded-lg border bg-card p-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-medium'>Frames</h3>
              <Button variant='ghost' size='sm' type='button' onClick={addFrame}>
                <Plus data-icon='inline-start' />
                Add frame
              </Button>
            </div>
            {state.frames.map((frame, frameIndex) => {
              const group = state.inclusions.filter(
                (candidate) =>
                  candidate.kind === 'framed_picture' && candidate.frameToken === frame.token
              );
              return (
                <div key={frame.token} className='bg-muted/20 space-y-2 rounded-lg border p-3'>
                  <div className='flex items-center gap-2'>
                    {/* N = index + 1 — display-derived, never an input; the
                        server renumbers from array order on save. */}
                    <Badge variant='outline' className='font-mono text-xs'>
                      Frame {frameIndex + 1}
                    </Badge>
                    {group.length === 0 ? (
                      // TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items)
                      <p className='text-muted-foreground text-xs'>
                        No framed pictures in this frame yet.
                      </p>
                    ) : null}
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={makeDragEnd(
                      (c) => c.kind === 'framed_picture' && c.frameToken === frame.token
                    )}
                  >
                    <SortableContext
                      items={group.map((row) => row.key)}
                      strategy={verticalListSortingStrategy}
                    >
                      {group.map((row) => (
                        <InclusionEditorRow
                          key={row.key}
                          row={row}
                          printSizes={printSizes}
                          attires={attires}
                          errors={fieldErrors?.inclusions[row.key]}
                          {...rowActions}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              );
            })}
          </section>

          <section className='space-y-3 rounded-lg border bg-card p-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-medium'>Prints · {prints.length}</h3>
              <Button variant='ghost' size='sm' type='button' onClick={addPrint}>
                <Plus data-icon='inline-start' />
                Add print
              </Button>
            </div>
            {hasDeactivatedSizes ? (
              // AQ-3: placement under the Prints section header.
              // TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items)
              <p className='text-muted-foreground text-xs'>
                Deactivated sizes stay on existing packages but disappear from new pickers.
              </p>
            ) : null}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={makeDragEnd((c) => c.kind === 'print')}
            >
              <SortableContext
                items={prints.map((row) => row.key)}
                strategy={verticalListSortingStrategy}
              >
                {prints.map((row) => (
                  <InclusionEditorRow
                    key={row.key}
                    row={row}
                    printSizes={printSizes}
                    attires={attires}
                    errors={fieldErrors?.inclusions[row.key]}
                    {...rowActions}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </section>

          <section className='space-y-3 rounded-lg border bg-card p-4'>
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
                items={privileges.map((row) => row.key)}
                strategy={verticalListSortingStrategy}
              >
                {privileges.map((row) => (
                  <InclusionEditorRow
                    key={row.key}
                    row={row}
                    printSizes={printSizes}
                    attires={attires}
                    errors={fieldErrors?.inclusions[row.key]}
                    {...rowActions}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </section>
        </div>
      </div>
    </section>
  );
}
