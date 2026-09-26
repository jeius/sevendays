// The light-entity editors' pure seam (M5 #140): editor state ↔ the
// full-object save payloads, the two matrix payloads, and the add-on
// matrix's per-service diff. Everything here is a plain function over
// plain data — no React, no network — so #143's lib-seam suite can pin
// flip payloads, the matrix diff, and validation without rendering a
// component. All three entities save as FULL-OBJECT PUTs (update schema
// === create schema, #137): a flip carries every field with ONLY isActive
// flipped. The add-on applies-to matrix is service-keyed in the write
// model (#137): toggling one add-on's applicability fans out into one
// full-replace PUT per AFFECTED service — the diff below is that seam.
import type {
  AddonService,
  Branch,
  StudioServiceAddonMatrixInput,
  StudioServiceBranchMatrixInput,
  StudioServiceWithBranches,
  UpdateAddonServiceInput,
  UpdateBranchInput,
  UpdateStudioServiceInput,
} from '@sevendays/types';

/**
 * The branch editor's whole state. `#143 seam: the branch state shape`.
 */
export interface BranchEditorState {
  name: string;
  address: string;
  phone: string;
  acceptsWalkIns: boolean;
  isActive: boolean;
}

/**
 * The studio-service editor's whole state. `#143 seam: the studio-service
 * state shape`. `branchIds` is in CLICK order (the prototype's toggle
 * appends): junction order is the fact, membership is what round-trips.
 */
export interface StudioServiceEditorState {
  name: string;
  description: string;
  priceCents: number;
  isActive: boolean;
  branchIds: string[];
}

/**
 * The add-on editor's whole state. `#143 seam: the add-on state shape`.
 * `appliesToServiceIds` is in click order, same law as `branchIds` —
 * though applicability itself is service-keyed (#137), so this list only
 * drives the editor's matrix display; the write path is
 * `buildAddonMatrixDiff`.
 */
export interface AddonEditorState {
  name: string;
  description: string;
  priceCents: number;
  isActive: boolean;
  appliesToServiceIds: string[];
}

/**
 * Per-field inline errors for all three light entities (AQ-5's
 * inline-marking posture). `#143 seam: the light-entity error shape`.
 * An empty errors object = valid.
 */
export type LightFieldErrors = {
  name?: string;
  address?: string;
  phone?: string;
  description?: string;
  price?: string;
};

/**
 * `#143 seam: read → branch state`. The read row minus server-managed
 * fields (id/createdAt/updatedAt).
 */
export function branchStateFromRead(row: Branch): BranchEditorState {
  return {
    name: row.name,
    address: row.address,
    phone: row.phone,
    acceptsWalkIns: row.acceptsWalkIns,
    isActive: row.isActive,
  };
}

/**
 * `#143 seam: create-mode branch state`. Empty strings,
 * `acceptsWalkIns: false`, active by default.
 */
export function newBranchState(): BranchEditorState {
  return {
    name: '',
    address: '',
    phone: '',
    acceptsWalkIns: false,
    isActive: true,
  };
}

/**
 * `#143 seam: branch state → full-object PUT payload`. All five fields
 * explicit — the schema's `.default(false)`/`.default(true)` are never
 * trusted client-side (#137's full-object PUT: no undefined-vs-null
 * merge semantics).
 */
export function buildBranchPayload(state: BranchEditorState): UpdateBranchInput {
  return {
    name: state.name,
    address: state.address,
    phone: state.phone,
    acceptsWalkIns: state.acceptsWalkIns,
    isActive: state.isActive,
  };
}

/**
 * `#143 seam: read → branch flip payload`. The table's deactivate/
 * reactivate: the read reshaped back into the full-object update payload
 * with ONLY `isActive` flipped — the flip never drops a field, because
 * the PUT is full-object and a missing field would overwrite real data
 * with the schema default (#137's deactivation contract).
 */
export function buildBranchFlipPayload(row: Branch, isActive: boolean): UpdateBranchInput {
  return {
    name: row.name,
    address: row.address,
    phone: row.phone,
    acceptsWalkIns: row.acceptsWalkIns,
    isActive,
  };
}

/**
 * `#143 seam: read → studio-service state`. From the row's own fields;
 * the embedded `bookableBranchIds` map to `branchIds` in resolved order.
 */
export function studioServiceStateFromRead(
  row: StudioServiceWithBranches
): StudioServiceEditorState {
  return {
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    isActive: row.isActive,
    branchIds: row.bookableBranchIds,
  };
}

/**
 * `#143 seam: create-mode studio-service state`. Empty strings,
 * `priceCents: 0`, active by default, no branches.
 */
export function newStudioServiceState(): StudioServiceEditorState {
  return {
    name: '',
    description: '',
    priceCents: 0,
    isActive: true,
    branchIds: [],
  };
}

/**
 * `#143 seam: studio-service state → full-object PUT payload`. The four
 * entity fields ONLY — never the matrix ids; relations ride their own
 * full-replace PUTs (`buildBranchMatrixPayload` / the add-on diff).
 */
export function buildStudioServicePayload(
  state: StudioServiceEditorState
): UpdateStudioServiceInput {
  return {
    name: state.name,
    description: state.description,
    priceCents: state.priceCents,
    isActive: state.isActive,
  };
}

/**
 * `#143 seam: read → studio-service flip payload`. The read reshaped
 * into the full-object update payload with ONLY `isActive` flipped —
 * every entity field carried, the flip never drops a field (#137).
 */
export function buildStudioServiceFlipPayload(
  row: StudioServiceWithBranches,
  isActive: boolean
): UpdateStudioServiceInput {
  return {
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    isActive,
  };
}

/**
 * `#143 seam: branches matrix payload`. The one full-replace PUT body
 * for the service's bookable branches, in the state's (click) order.
 */
export function buildBranchMatrixPayload(
  state: StudioServiceEditorState
): StudioServiceBranchMatrixInput {
  return { branchIds: state.branchIds };
}

/**
 * `#143 seam: read → add-on state`. From the row's own fields; the bare
 * `AddonService` read embeds no applicability ids, so
 * `appliesToServiceIds` starts empty — the editor fills it from the
 * services snapshot for display; the write path is
 * `buildAddonMatrixDiff`.
 */
export function addonStateFromRead(row: AddonService): AddonEditorState {
  return {
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    isActive: row.isActive,
    appliesToServiceIds: [],
  };
}

/**
 * `#143 seam: create-mode add-on state`. Empty strings, `priceCents: 0`,
 * active by default, applies to nothing yet.
 */
export function newAddonState(): AddonEditorState {
  return {
    name: '',
    description: '',
    priceCents: 0,
    isActive: true,
    appliesToServiceIds: [],
  };
}

/**
 * `#143 seam: add-on state → full-object PUT payload`. The four entity
 * fields explicit (#137's full-object PUT).
 */
export function buildAddonPayload(state: AddonEditorState): UpdateAddonServiceInput {
  return {
    name: state.name,
    description: state.description,
    priceCents: state.priceCents,
    isActive: state.isActive,
  };
}

/**
 * `#143 seam: read → add-on flip payload`. The read reshaped into the
 * full-object update payload with ONLY `isActive` flipped — every entity
 * field carried, the flip never drops a field (#137's deactivation
 * contract). Applicability is service-keyed and untouched by this PUT.
 */
export function buildAddonFlipPayload(
  row: AddonService,
  isActive: boolean
): UpdateAddonServiceInput {
  return {
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    isActive,
  };
}

/**
 * `#143 seam: the add-on matrix diff` — THE matrix seam. The add-on
 * applies-to matrix is service-keyed (#137): toggling one add-on's
 * applicability fans out into one full-replace PUT per AFFECTED service.
 *
 * For each service in ARRAY order, `want = desired.includes(service.id)`,
 * `have = service.applicableAddonServiceIds.includes(addonId)`; when
 * `want !== have`, emit one entry whose payload is that service's FULL
 * new set — other add-on memberships preserved — so the client fan-out
 * stays truthful against concurrent edits to OTHER relations. Only
 * affected services are emitted.
 *
 * The source of truth is the services snapshot the editor opened with:
 * a mid-edit concurrent change to THIS add-on's memberships is
 * overwritten — single-studio staff per ADR-0018, accepted.
 */
export function buildAddonMatrixDiff(
  services: StudioServiceWithBranches[],
  addonId: string,
  desired: string[]
): Array<{ serviceId: string; payload: StudioServiceAddonMatrixInput }> {
  const diff: Array<{ serviceId: string; payload: StudioServiceAddonMatrixInput }> = [];
  for (const service of services) {
    const want = desired.includes(service.id);
    const have = service.applicableAddonServiceIds.includes(addonId);
    if (want !== have) {
      diff.push({
        serviceId: service.id,
        payload: {
          addonServiceIds: want
            ? [...service.applicableAddonServiceIds, addonId]
            : service.applicableAddonServiceIds.filter((id) => id !== addonId),
        },
      });
    }
  }
  return diff;
}

/**
 * `#143 seam: branch validation` — mirrors the save schema's
 * client-relevant rules for inline marking (AQ-5): name/address/phone
 * min-1 (trimmed). An all-empty result = valid.
 */
export function validateBranchState(state: BranchEditorState): LightFieldErrors {
  const errors: LightFieldErrors = {};
  if (state.name.trim().length < 1) {
    errors.name = 'Name is required.';
  }
  if (state.address.trim().length < 1) {
    errors.address = 'Address is required.';
  }
  if (state.phone.trim().length < 1) {
    errors.phone = 'Phone is required.';
  }
  return errors;
}

/**
 * `#143 seam: studio-service validation` — name + description min-1
 * (trimmed); `priceCents` ≥ 0 integer guard (defense-in-depth — the
 * controlled input makes it near-unreachable). An all-empty result =
 * valid.
 */
export function validateStudioServiceState(state: StudioServiceEditorState): LightFieldErrors {
  const errors: LightFieldErrors = {};
  if (state.name.trim().length < 1) {
    errors.name = 'Name is required.';
  }
  if (state.description.trim().length < 1) {
    errors.description = 'Description is required.';
  }
  if (!Number.isInteger(state.priceCents) || state.priceCents < 0) {
    errors.price = 'Enter a valid price.';
  }
  return errors;
}

/**
 * `#143 seam: add-on validation` — name + description min-1 (trimmed);
 * `priceCents` ≥ 0 integer guard (defense-in-depth — the controlled
 * input makes it near-unreachable). An all-empty result = valid.
 */
export function validateAddonState(state: AddonEditorState): LightFieldErrors {
  const errors: LightFieldErrors = {};
  if (state.name.trim().length < 1) {
    errors.name = 'Name is required.';
  }
  if (state.description.trim().length < 1) {
    errors.description = 'Description is required.';
  }
  if (!Number.isInteger(state.priceCents) || state.priceCents < 0) {
    errors.price = 'Enter a valid price.';
  }
  return errors;
}

// A single named re-export, never a barrel — #140 keeps #139's shared
// conflict→field-error mapper under one import path for the three
// light-entity screens, re-exported (never re-implemented) per the seam.
// biome-ignore lint/performance/noBarrelFile: single named re-export, per the ticket seam
export { conflictFieldErrors } from './package-editor-state';
