// The CMS interaction system's pure seams (M7 #218, spec § the CMS UX
// maturation system — #165's ruling): the async Save contract's state, the
// one pending vocabulary's mapper, and the delete dialog's blocker-line
// derivation. Plain data in, plain data out — components/cms/shared.tsx
// renders these; this module never imports React.
//
// The async Save contract (binding): onSave resolves true = success (the
// shell closes), false = hold (the sheet stays open, state intact, retry
// safe), throw = hold (swallowed by the shell). The close-only-on-success
// rule lives in closesOnEvent; the editorNonce/keepEditorOpen remount
// machinery it replaces is deleted, not extended.

/** The three spec-pinned busy labels (+ the two moderation extensions, TODO(owner-copy) — ratify at the variants round). */
export const SAVING_LABEL = 'Saving…';
export const UPLOADING_LABEL = 'Uploading…';
export const DELETING_LABEL = 'Deleting…';
export const ACCEPTING_LABEL = 'Accepting…';
export const REJECTING_LABEL = 'Rejecting…';

/**
 * The pending vocabulary mapper (spec § one pending vocabulary): pending =
 * disabled + aria-busy + the label swap. Icon-only buttons ignore the labels
 * and swap their icon for the spinner at the call site.
 */
export function pendingVocabulary(options: {
  pending: boolean;
  idleLabel: string;
  busyLabel: string;
}): { disabled: boolean; ariaBusy: boolean; label: string } {
  return {
    disabled: options.pending,
    ariaBusy: options.pending,
    label: options.pending ? options.busyLabel : options.idleLabel,
  };
}

/** The shell's save-cycle state: started → saving; settled → idle (either way — the hold is the open sheet, never a stuck spinner). */
export type SaveContractState = { saving: boolean };

export const idleSaveContract: SaveContractState = { saving: false };

export type SaveContractEvent = { type: 'started' } | { type: 'settled'; ok: boolean };

export function reduceSaveContract(
  _state: SaveContractState,
  event: SaveContractEvent
): SaveContractState {
  return { saving: event.type === 'started' };
}

/**
 * The close rule: ONLY a settled-true closes. In-flight holds (the sheet is
 * busy), settled-false holds (a validation veto or a failed save — the
 * state is intact and retry is safe).
 */
export function closesOnEvent(event: SaveContractEvent): boolean {
  return event.type === 'settled' && event.ok;
}

/**
 * Derives the delete dialog's in-body blocker lines from a guarded-delete
 * 400's details (the #213 contract: one { path, message } per blocking
 * family, e.g. ['appointments'] + 'referenced by 3 appointment(s)'). Each
 * line leads with the capitalized family: 'Appointments — referenced by 3
 * appointment(s)'. Unknown shapes answer empty — the dialog then shows only
 * the failure message.
 */
export function blockerLines(details: unknown): string[] {
  if (!Array.isArray(details)) {
    return [];
  }
  const lines: string[] = [];
  for (const entry of details) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const { path, message } = entry as { path?: unknown; message?: unknown };
    if (typeof message !== 'string' || message === '') {
      continue;
    }
    const family = Array.isArray(path) && typeof path[0] === 'string' ? path[0] : null;
    lines.push(
      family ? `${family.charAt(0).toUpperCase()}${family.slice(1)} — ${message}` : message
    );
  }
  return lines;
}
