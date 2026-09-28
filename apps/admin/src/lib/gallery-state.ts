// The gallery screens' pure seam (M5 #141): the photo editor's state ↔ the
// full-object metadata payload, the two drag-reorder helpers, and the
// upload title derivation. Everything here is a plain function over plain
// data — no React, no network, no DOM — so #143's lib-seam suite can pin
// the photo payload law (r2Key ABSENT — presence-encoded replace stays
// unexposed), the visible-subset slot-swap reorder, and the flat reorder
// without rendering a component. Order PUTs are TOTAL full-replaces (#137):
// both reorder helpers return the COMPLETE id list, never a delta.
import type {
  GalleryCategory,
  GalleryCategoryOrderInput,
  GalleryPhoto,
  GalleryPhotoOrderInput,
  Testimonial,
  TestimonialOrderInput,
  UpdateGalleryPhotoInput,
} from '@sevendays/types';

/**
 * The photo editor's whole state. `#143 seam: the photo state shape`.
 * `categoryId: null` is the uncategorized write (staff-only on the public
 * read).
 */
export interface PhotoEditorState {
  title: string;
  caption: string;
  categoryId: string | null;
  isActive: boolean;
}

/**
 * `#143 seam: read → photo state`. The read row minus server-managed
 * fields (id/position/photoUrl/createdAt/updatedAt). The editor edits
 * strings — `caption` (and `title`) null maps to `''`; null is a
 * write-time decision.
 */
export function photoStateFromRead(row: GalleryPhoto): PhotoEditorState {
  return {
    title: row.title ?? '',
    caption: row.caption ?? '',
    categoryId: row.categoryId,
    isActive: row.isActive,
  };
}

/**
 * `#143 seam: photo state → full-object metadata PUT payload`. Empty
 * strings null out (the PUT is full-object: null clears, never "leave
 * alone"); `r2Key` is ABSENT — presence-encoded replace (ADR-0019) stays
 * unexposed this ticket (AR-6); the payload never carries a key, so a
 * metadata save can never replace the photo.
 */
export function buildPhotoPayload(state: PhotoEditorState): UpdateGalleryPhotoInput {
  return {
    title: state.title === '' ? null : state.title,
    caption: state.caption === '' ? null : state.caption,
    categoryId: state.categoryId,
    isActive: state.isActive,
  };
}

/**
 * `#143 seam: read → photo flip payload`. The read's title/caption/
 * categoryId reshaped with ONLY `isActive` flipped — the flip never drops
 * a field (#137's full-object PUT). NO `r2Key`: a flip never replaces the
 * photo.
 */
export function buildPhotoFlipPayload(
  row: GalleryPhoto,
  isActive: boolean
): UpdateGalleryPhotoInput {
  return {
    title: row.title,
    caption: row.caption,
    categoryId: row.categoryId,
    isActive,
  };
}

/**
 * dnd-kit's `arrayMove`: the item at `from` re-inserted at index `to`.
 * Local on purpose — this seam stays dependency-free pure functions.
 */
function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const moved = items.slice();
  const [picked] = moved.splice(from, 1);
  if (picked !== undefined) {
    moved.splice(to, 0, picked);
  }
  return moved;
}

/**
 * `#143 seam: the flat reorder` — dnd-kit's `arrayMove` over the FULL
 * list (indexes found by id; either id missing → the input returned
 * unchanged). The returned array is the complete `photoIds` payload —
 * order PUTs are TOTAL full-replaces (#137), never a delta.
 */
export function reorderIds(ids: string[], activeId: string, overId: string): string[] {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1) {
    return ids;
  }
  return arrayMove(ids, from, to);
}

/**
 * `#143 seam: the visible-subset slot-swap reorder` — the prototype's
 * reorder math, generalized. The drag operates on the VISIBLE filtered
 * list, so: take the visible ids in their global sequence, `arrayMove`
 * that SUBSEQUENCE by (activeId, overId), write it back into the exact
 * global slots the visible items occupied — invisible photos keep their
 * positions, so a filtered drag can never collide with positions held
 * outside the filter. The returned array is the complete `photoIds`
 * payload (order PUTs are TOTAL full-replaces, #137). Either id not in
 * `visibleIds` → the input returned unchanged.
 */
export function reorderVisiblePhotos(
  globalIds: string[],
  visibleIds: string[],
  activeId: string,
  overId: string
): string[] {
  const visibleSet = new Set(visibleIds);
  if (!visibleSet.has(activeId) || !visibleSet.has(overId)) {
    return globalIds;
  }
  // The visible ids in their global sequence.
  const subsequence = globalIds.filter((id) => visibleSet.has(id));
  // Ghost-id parity with reorderIds (#143): a visibleId absent from the
  // global list (a stale filtered view) bails — the input returned
  // unchanged, never a silently corrupted write-back.
  const globalSet = new Set(globalIds);
  if (visibleIds.some((id) => !globalSet.has(id))) {
    return globalIds;
  }
  const from = subsequence.indexOf(activeId);
  const to = subsequence.indexOf(overId);
  const moved = arrayMove(subsequence, from, to);
  // Write the moved subsequence back into the exact global slots the
  // visible items occupied; invisible ids keep their slots untouched.
  // (The queue holds exactly one id per visible slot, so the fallback is
  // unreachable by construction.)
  const queue = [...moved];
  const result: string[] = [];
  for (const id of globalIds) {
    if (visibleSet.has(id)) {
      const next = queue.shift();
      result.push(next === undefined ? id : next);
    } else {
      result.push(id);
    }
  }
  return result;
}

/**
 * `#143 seam: the upload title derivation` — the file name minus its LAST
 * extension (`report.2024.jpg` → `report.2024`); empty → `''`. A leading
 * dot (`.jpg`) is a dotfile, not an extension, so the name is kept.
 */
export function titleFromFileName(name: string): string {
  if (name === '') {
    return '';
  }
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

/**
 * `#143 seam` — the category order PUT body. Array order IS the payload
 * order (TOTAL full-replace, #137).
 */
export function buildCategoryOrderPayload(
  categories: GalleryCategory[]
): GalleryCategoryOrderInput {
  return { categoryIds: categories.map((c) => c.id) };
}

/**
 * `#143 seam` — the photo order PUT body. Array order IS the payload
 * order (TOTAL full-replace, #137).
 */
export function buildPhotoOrderPayload(photos: GalleryPhoto[]): GalleryPhotoOrderInput {
  return { photoIds: photos.map((p) => p.id) };
}

/**
 * `#143 seam` — the testimonial order PUT body. Array order IS the
 * payload order (TOTAL full-replace, #137).
 */
export function buildTestimonialOrderPayload(rows: Testimonial[]): TestimonialOrderInput {
  return { testimonialIds: rows.map((row) => row.id) };
}
