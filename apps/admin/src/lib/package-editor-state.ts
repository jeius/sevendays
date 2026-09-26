// The package editor's pure seam (M5 #139): editor state ↔ the atomic save
// payload. Everything here is a plain function over plain data — no React,
// no network — so #143's lib-seam suite can pin state → payload (frames/
// inclusions ordering), validation, and conflict → field-error mapping
// without rendering a component. Array order IS position: frames[] and
// inclusions[] serialize in array order and the server renumbers from it
// (#137); the editor's job is to keep displayed order = array order.
import type {
  Attire,
  CreateServicePackageInput,
  PackageInclusionKind,
  ServicePackageRead,
  UpdateServicePackageInput,
} from '@sevendays/types';

/**
 * One inclusion row as the editor holds it. `#143 seam: the editor row shape`.
 *
 * - `key` is a client-only React key — existing rows carry their inclusion
 *   uuid, new rows a `crypto.randomUUID()`. It never rides a payload.
 * - `quantityInput`/`description` stay RAW: the empty-string-is-null mapping
 *   lives in the builders, so a cleared field never becomes a silent 0.
 * - `frameToken` references a `frames[]` token (framed_picture rows only).
 * - `attireIds` is selection order; the builders re-pin it to the attires
 *   lookup's array order.
 */
export interface EditorInclusion {
  key: string;
  kind: PackageInclusionKind;
  quantityInput: string;
  printSizeId: string | null;
  frameToken: string | null;
  attireIds: string[];
  description: string;
}

/**
 * The editor's whole state. `#143 seam: the editor state shape`.
 *
 * - `durationInput` is a raw input string ('' = null after the builder).
 * - `priceCents` is the mapped centavos number (input × 100 at the
 *   component); `NaN` encodes an unparseable input and fails validation.
 * - `coverImageKey` is the three-state media encoding: `undefined` =
 *   unchanged (absent from the PUT), `null` = clear, string = a fresh
 *   staging key (ADR-0019) to bind on the next atomic save.
 */
export interface PackageEditorState {
  name: string;
  description: string;
  priceCents: number;
  durationInput: string;
  isFeatured: boolean;
  isActive: boolean;
  slug: string;
  coverImageUrl: string | null;
  coverImageKey: string | null | undefined;
  frames: { token: string }[];
  inclusions: EditorInclusion[];
}

/**
 * Per-row inline errors, keyed by the row's `key` (AQ-5 row marking).
 * `#143 seam: the inclusion-error shape`.
 */
export interface InclusionFieldErrors {
  quantity?: string;
  printSizeId?: string;
  attires?: string;
  description?: string;
  frameToken?: string;
}

/**
 * `validateEditorState`'s result. `#143 seam: the editor-error shape`.
 * Valid ⇔ no name/description/price string AND an empty `inclusions`
 * record. `printSizeId` is reserved for server-side conflict mapping —
 * the schema's superRefines never reject on it client-side.
 */
export interface EditorFieldErrors {
  name?: string;
  description?: string;
  price?: string;
  inclusions: Record<string, InclusionFieldErrors>;
}

/**
 * `#143 seam: quantity mapping`. Empty → null (the schema's
 * positive-int-or-null). A non-empty input keeps its Number — a `0`/`NaN`
 * quantity is a VALIDATION error, never a silent null.
 */
export function quantityFromInput(input: string): number | null {
  return input === '' ? null : Number(input);
}

/**
 * `#143 seam: duration mapping`. Empty / `NaN` / `<= 0` → null — the
 * catalog specifies no durations, so a meaningless duration is simply
 * absent (unlike quantity, which must surface as a validation error).
 */
export function durationFromInput(input: string): number | null {
  if (input === '') return null;
  const parsed = Number(input);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * `#143 seam: frame token minting`. Existing identity echoes as-is;
 * `null` mints a fresh token (the component's `Add frame` path).
 */
export function tokenFor(existing: string | null): string {
  return existing ?? crypto.randomUUID();
}

/**
 * `#143 seam: read → editor state`. Frames echo their uuids as tokens in
 * frames array order; framed_picture inclusions map the resolved `frameId`
 * uuid to `frameToken`; `quantityInput`/`durationInput` are the raw-string
 * views of the nullable numbers (null → ''); `coverImageKey` starts
 * `undefined` (a read never echoes keys, so there is nothing to echo —
 * the cover is unchanged until the editor says otherwise).
 */
export function editorStateFromRead(read: ServicePackageRead): PackageEditorState {
  return {
    name: read.name,
    description: read.description,
    priceCents: read.priceCents,
    durationInput: read.durationMinutes == null ? '' : String(read.durationMinutes),
    isFeatured: read.isFeatured,
    isActive: read.isActive,
    slug: read.slug,
    coverImageUrl: read.coverImageUrl,
    coverImageKey: undefined,
    frames: read.frames.map((frame) => ({ token: frame.id })),
    inclusions: read.inclusions.map((inclusion) => ({
      key: inclusion.id,
      kind: inclusion.kind,
      quantityInput: inclusion.quantity == null ? '' : String(inclusion.quantity),
      printSizeId: inclusion.printSize?.id ?? null,
      frameToken: inclusion.kind === 'framed_picture' ? inclusion.frameId : null,
      attireIds: inclusion.attires.map((attire) => attire.id),
      description: inclusion.description ?? '',
    })),
  };
}

/**
 * `#143 seam: create-mode initial state`. Empty strings, `priceCents: 0`,
 * active by default, no cover, no frames/inclusions.
 */
export function newEditorState(): PackageEditorState {
  return {
    name: '',
    description: '',
    priceCents: 0,
    durationInput: '',
    isFeatured: false,
    isActive: true,
    slug: '',
    coverImageUrl: null,
    coverImageKey: undefined,
    frames: [],
    inclusions: [],
  };
}

// One row → one payload inclusion, shared by both builders. Array order is
// the position (#137): rows serialize in state order; attireIds re-pin to
// the attires LOOKUP's array order (filtered to membership) so junction
// positions are deterministic — the server renumbers from array order.
function inclusionFromEditor(
  row: EditorInclusion,
  attires: readonly Attire[]
): CreateServicePackageInput['inclusions'][number] {
  return {
    kind: row.kind,
    quantity: quantityFromInput(row.quantityInput),
    printSizeId: row.printSizeId,
    // Only framed_picture carries a frameId — other kinds omit the key
    // entirely (the schema's "only framed_picture inclusions carry a
    // frameId" rule).
    ...(row.kind === 'framed_picture' ? { frameId: row.frameToken } : {}),
    attireIds: attires
      .filter((attire) => row.attireIds.includes(attire.id))
      .map((attire) => attire.id),
    description: row.description.trim() === '' ? null : row.description,
  };
}

function basePayloadFields(state: PackageEditorState, attires: readonly Attire[]) {
  return {
    name: state.name,
    description: state.description,
    priceCents: state.priceCents,
    durationMinutes: durationFromInput(state.durationInput),
    isActive: state.isActive,
    isFeatured: state.isFeatured,
    frames: state.frames.map((frame) => ({ id: frame.token })),
    inclusions: state.inclusions.map((row) => inclusionFromEditor(row, attires)),
  };
}

/**
 * `#143 seam: state → create payload`. `durationMinutes` via
 * `durationFromInput`; frames map to `{ id: token }` in ARRAY ORDER;
 * inclusions in ARRAY ORDER with `frameId` only on framed_picture rows;
 * attireIds pinned to the passed attires lookup's array order filtered to
 * membership (callers pass the lookup in — junction positions become
 * deterministic). `coverImageKey` is included ONLY when the state carries
 * a fresh staging key string.
 */
export function buildCreatePayload(
  state: PackageEditorState,
  attires: readonly Attire[]
): CreateServicePackageInput {
  return {
    ...basePayloadFields(state, attires),
    ...(typeof state.coverImageKey === 'string' ? { coverImageKey: state.coverImageKey } : {}),
  };
}

/**
 * `#143 seam: state → update payload`. The create mapping plus
 * `slug: state.slug` and the three-state cover encoding: `undefined` =
 * property ABSENT from the object (unchanged), `null` = explicit clear,
 * string = bind the fresh staging key (#137's update shape / ADR-0019).
 */
export function buildUpdatePayload(
  state: PackageEditorState,
  attires: readonly Attire[]
): UpdateServicePackageInput {
  return {
    ...basePayloadFields(state, attires),
    slug: state.slug,
    ...(state.coverImageKey !== undefined ? { coverImageKey: state.coverImageKey } : {}),
  };
}

/**
 * `#143 seam: read → flip payload`. The table's deactivate/reactivate:
 * the READ re-shaped back into the full-object update payload with ONLY
 * `isActive` flipped — frames echo their uuids as tokens, inclusions map
 * their resolved `printSize.id`/`attires[].id` back to ids in resolved
 * order, `slug` from the read.
 *
 * `coverImageKey` is deliberately ABSENT: the absence is what makes a
 * flip never re-verify or clobber media — the cover is untouched by the
 * put (#137's three-state encoding; the read never echoes keys anyway).
 */
export function buildRowFlipPayload(
  row: ServicePackageRead,
  isActive: boolean
): UpdateServicePackageInput {
  return {
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    durationMinutes: row.durationMinutes,
    isActive,
    isFeatured: row.isFeatured,
    slug: row.slug,
    frames: row.frames.map((frame) => ({ id: frame.id })),
    inclusions: row.inclusions.map((inclusion) => ({
      kind: inclusion.kind,
      quantity: inclusion.quantity,
      printSizeId: inclusion.printSize?.id ?? null,
      ...(inclusion.kind === 'framed_picture' ? { frameId: inclusion.frameId } : {}),
      attireIds: inclusion.attires.map((attire) => attire.id),
      description: inclusion.description,
    })),
  };
}

/**
 * `#143 seam: editor-side validation` — mirrors the save schema's rules in
 * client order for inline row marking (AQ-5): name/description min-1
 * (trimmed); a parseable price ≥ 0 (`NaN` fails); every framed_picture/
 * print needs ≥ 1 attireIds; every framed_picture needs a frameToken;
 * privileges need a non-empty trimmed description; quantity, when present
 * (non-empty input), parses to a positive integer. An all-empty result
 * (no field strings, empty `inclusions` record) = valid.
 */
export function validateEditorState(state: PackageEditorState): EditorFieldErrors {
  const errors: EditorFieldErrors = { inclusions: {} };
  if (state.name.trim().length < 1) {
    errors.name = 'Name is required.';
  }
  if (state.description.trim().length < 1) {
    errors.description = 'Description is required.';
  }
  if (!Number.isFinite(state.priceCents) || state.priceCents < 0) {
    errors.price = 'Enter a price of zero or more.';
  }
  for (const row of state.inclusions) {
    const rowErrors: InclusionFieldErrors = {};
    if (row.kind === 'framed_picture' || row.kind === 'print') {
      if (row.attireIds.length < 1) {
        rowErrors.attires = 'Pick at least one attire.';
      }
    }
    if (row.kind === 'framed_picture' && (row.frameToken == null || row.frameToken === '')) {
      rowErrors.frameToken = 'framed pictures need a frame';
    }
    if (row.kind === 'privilege' && row.description.trim().length < 1) {
      rowErrors.description = 'Privileges need a description.';
    }
    if (row.quantityInput !== '') {
      const quantity = Number(row.quantityInput);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        rowErrors.quantity = 'Enter a positive whole number.';
      }
    }
    if (Object.keys(rowErrors).length > 0) {
      errors.inclusions[row.key] = rowErrors;
    }
  }
  return errors;
}

/**
 * `#143 seam: conflicts → field-error mapping`. Defensively narrows the
 * API's 400 `details` (the `AdminDetail` shape from #137's admin-shared.ts:
 * `Array<{ path: string[]; message: string }>`) into a flat
 * `Record<firstPathSegment, message>`. ANYTHING non-conforming — not an
 * array, an entry missing `path`/`message`, an empty path — returns `{}`
 * and the caller toasts the message instead. Later entries for the same
 * segment overwrite earlier ones.
 */
export function conflictFieldErrors(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) return {};
  const record: Record<string, string> = {};
  for (const entry of details) {
    if (typeof entry !== 'object' || entry === null) return {};
    const path = (entry as { path?: unknown }).path;
    const message = (entry as { message?: unknown }).message;
    if (!Array.isArray(path) || path.length < 1 || typeof path[0] !== 'string') return {};
    if (typeof message !== 'string') return {};
    record[path[0]] = message;
  }
  return record;
}

/** `#143 seam: the price helper copy` — owner-ratified; never re-inline it. */
export const PESO_HELPER = 'Stored as centavos.';

/** `#143 seam: the duration helper copy` — owner-ratified; never re-inline it. */
export const DURATION_HELPER = 'Optional';
