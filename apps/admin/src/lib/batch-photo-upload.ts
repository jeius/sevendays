// The gallery batch upload's pure seam (M5 #141, spec § The media pipeline):
// per-file XHR with progress, ~4 parallel, per-file retry (1–2 attempts),
// per-file status, continue-with-successes / retry-failures — never an
// all-or-nothing barrier. Only committed files become savable: each file's
// `commit` (its own POST /admin/gallery-photos) is the verify/promote gate,
// so a success adds a real row while a failure leaves the staging object to
// the tmp/ lifecycle GC. Everything here is a plain loop over injected I/O —
// no React, no network of its own — so #143's lib-seam suite can pin the
// concurrency cap, the retry classes, and the status machine with fake
// presign/put/commit fns. The XHR implementation is injected too (the
// component wires the cover-upload loop's browser-direct PUT).
// M7 #220 adds the abort seam: an optional AbortSignal settles every
// unsettled item `canceled` — never a retry (the pre-#220 pool classed the
// XHR abort-reject `transient` and would have re-queued a canceled upload),
// no new network call starts after the abort, and a commit already in
// flight completes with its verdict standing. The tray/guard predicates
// below are the one vocabulary both the tray UI and the leaving guard read.
import type {
  CreateGalleryPhotoInput,
  GalleryPhoto,
  MediaPresignRequest,
  MediaPresignResponse,
} from '@sevendays/types';

/** The spec's "~4 parallel", pinned as the one named constant. */
export const BATCH_CONCURRENCY = 4;

/** The spec's "1–2 attempts", pinned: one try, one auto-retry on `transient`. */
export const MAX_UPLOAD_ATTEMPTS = 2;

/**
 * The retry law (spec § The media pipeline): only `transient` consumes an
 * attempt and auto-retries — `pre-check` and `permanent` fail immediately
 * with no Retry affordance (the file itself is the problem — the operator
 * re-picks).
 *
 * - `pre-check` — the client's courtesy gates (wrong type / over cap)
 *   before any network call.
 * - `permanent` — the commit answered 400 (the server said no — cap
 *   violation, unknown category, bad key shape). A 400 PUT is permanent
 *   too: the same "the server said no" verdict, at the upload hop.
 * - `transient` — everything else: a presign throw, XHR error/abort, a
 *   non-2xx non-400 XHR status, a non-400 failed commit status.
 */
export type BatchFailureKind = 'pre-check' | 'transient' | 'permanent';

/**
 * `#143 seam: the per-file status machine` — the tray renders this per
 * item. `done` carries the committed read: the caller invalidates the
 * photos query and the row IS the grid's new card. `failed` carries the
 * retry class, the message, and the attempts consumed.
 */
export type BatchItemStatus =
  | { phase: 'queued' }
  | { phase: 'uploading'; sent: number; total: number }
  | { phase: 'committing' }
  | { phase: 'done'; photo: GalleryPhoto }
  | { phase: 'failed'; kind: BatchFailureKind; message: string; attempts: number }
  | { phase: 'canceled' };

/**
 * The injected I/O — the pool owns no network of its own.
 *
 * The component wires `presign` = an adapter over the LANDED
 * `presignAdminCoverUpload` server fn (its schema already carries
 * `purpose: 'gallery-photo'`; the name is #139-historical — a call-site
 * comment pins that), `put` = `putFileToPresignedUrl` below, `commit` = an
 * adapter over `saveAdminGalleryPhotoCreate` mapping its result union.
 * `onStatus` is the tray's render tap — every transition goes through it.
 */
export interface BatchUploadDeps {
  presign(req: MediaPresignRequest): Promise<MediaPresignResponse>;
  put(
    file: File,
    uploadUrl: string,
    onProgress: (sent: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<void>;
  commit(
    input: CreateGalleryPhotoInput
  ): Promise<{ ok: true; photo: GalleryPhoto } | { ok: false; status: number; message: string }>;
  onStatus(itemId: string, status: BatchItemStatus): void;
}

/**
 * One staged file. `categoryId`/`title` are captured AT ENQUEUE — the
 * filter/title rule is the tray's; the pool never re-reads UI state. What
 * it commits is exactly what the operator queued.
 */
export interface BatchItem {
  id: string;
  file: File;
  categoryId: string | null;
  title: string;
  /** M7 #214: the caption pass-through seam — captured at enqueue (null;
   * pre-commit metadata editing is ruled out) and committed unchanged. */
  caption: string | null;
}

/**
 * The courtesy gates, BEFORE any network call — the exact `uploadCover`
 * messages (apps/admin/src/lib/cover-upload.ts), shared wording; the commit
 * re-verifies server-side, so these are never trusted (#136).
 *
 * `#143 seam: the pre-check gate` — returns the problem message, or null
 * when the file may proceed.
 */
export async function preCheckFile(file: File): Promise<string | null> {
  if (file.type !== 'image/jpeg') {
    return 'Only JPG files are supported.';
  }
  if (file.size > 50 * 1024 * 1024) {
    return 'That file is over the 50 MiB cap.';
  }
  return null;
}

/**
 * `#143 seam: the batch pool` — a shared queue index drained by
 * BATCH_CONCURRENCY workers (Promise.all of 4 worker loops).
 *
 * Per item: `queued` on dequeue; then at most MAX_UPLOAD_ATTEMPTS attempts —
 * the FIRST attempt runs `preCheckFile` (a `pre-check` failure settles
 * `failed` immediately, no network call); then `presign` (a throw is
 * `transient`); then `put` with progress events → `uploading` (an
 * error/abort reject is `transient`; a non-2xx status fails with
 * `Upload failed: <status>` and is `transient` unless the status is 400 —
 * a 400 PUT is `permanent`); then `commit` (ok → `done`; status 400 →
 * `permanent` with the API message; any other status → `transient`). After
 * a `transient` failure, if attempts remain, the item re-queues (attempt 2
 * presigns fresh — an expired URL never poisons the retry); else it
 * settles `failed`.
 *
 * M7 #220 — the abort seam: an optional `signal`. Once aborted, no new
 * network call starts (checked at attempt start and after every awaited
 * hop), in-flight PUTs abort through the injected signal, and every
 * unsettled item settles `{ phase: 'canceled' }` — cancel is a verdict,
 * never a failure class and never a retry. A commit already in flight
 * completes and its verdict stands; an abort after the PUT still cancels
 * (nothing canceled is promoted — the staged object is the tmp/ lifecycle
 * GC's). Settlement is guaranteed either way: every item ends `done`,
 * `failed`, or `canceled` exactly once, and `onStatus` has told the full
 * story. Continue-with-successes / retry-failures — never an
 * all-or-nothing barrier: only committed files become savable.
 */
export async function runBatchUpload(
  items: BatchItem[],
  deps: BatchUploadDeps,
  signal?: AbortSignal
): Promise<{ done: BatchItem[]; failed: BatchItem[]; canceled: BatchItem[] }> {
  const done: BatchItem[] = [];
  const failed: BatchItem[] = [];
  const canceled: BatchItem[] = [];
  // Settlement bookkeeping: every item ends done | failed | canceled
  // exactly once — the post-drain sweep reads this to settle never-run
  // items after an abort without double-settling retried entries.
  const settled = new Set<string>();
  const aborted = () => signal?.aborted === true;

  const settleCanceled = (item: BatchItem) => {
    if (settled.has(item.id)) {
      return;
    }
    settled.add(item.id);
    deps.onStatus(item.id, { phase: 'canceled' });
    canceled.push(item);
  };

  interface QueueEntry {
    item: BatchItem;
    attemptsUsed: number;
    preChecked: boolean;
  }

  const queue: QueueEntry[] = items.map((item) => ({
    item,
    attemptsUsed: 0,
    preChecked: false,
  }));
  let next = 0;

  const runAttempt = async (entry: QueueEntry): Promise<void> => {
    const { item } = entry;
    const attempt = entry.attemptsUsed + 1;

    const fail = (kind: BatchFailureKind, message: string) => {
      settled.add(item.id);
      deps.onStatus(item.id, { phase: 'failed', kind, message, attempts: attempt });
      failed.push(item);
    };

    // A `transient` failure: re-queue if attempts remain (the retry gets a
    // fresh presign), else settle `failed`. An ABORTED pool never
    // re-queues — cancel is a verdict, not a failure class (#220).
    const retryOrFail = (message: string) => {
      if (aborted()) {
        settleCanceled(item);
        return;
      }
      if (attempt < MAX_UPLOAD_ATTEMPTS) {
        queue.push({ item, attemptsUsed: attempt, preChecked: true });
      } else {
        fail('transient', message);
      }
    };

    if (aborted()) {
      // A canceled run never even claims "queued" — a pre-aborted pool
      // settles straight to canceled (the suite pins phases exactly).
      settleCanceled(item);
      return;
    }

    deps.onStatus(item.id, { phase: 'queued' });

    // (1) FIRST attempt only: the courtesy type/size gates, before any
    // network call. A retry never re-runs them — the file does not change.
    if (!entry.preChecked) {
      entry.preChecked = true;
      const problem = await preCheckFile(item.file);
      if (problem !== null) {
        fail('pre-check', problem);
        return;
      }
      if (aborted()) {
        settleCanceled(item);
        return;
      }
    }

    // (2) Presign — the server assigns the staging key; the client never
    // supplies key text (ADR-0019). A throw is `transient`; an abort that
    // landed mid-await stops the next hop.
    let stagingKey: string;
    let uploadUrl: string;
    try {
      const presigned = await deps.presign({
        purpose: 'gallery-photo',
        contentType: 'image/jpeg',
      });
      stagingKey = presigned.key;
      uploadUrl = presigned.uploadUrl;
    } catch (error) {
      retryOrFail(error instanceof Error ? error.message : 'Could not start the upload.');
      return;
    }
    if (aborted()) {
      settleCanceled(item);
      return;
    }

    // (3) The XHR PUT; progress events map to `uploading`. Non-2xx arrives
    // as a typed PutUploadError — 400 is `permanent`, the rest `transient`.
    // An `error`/`abort` reject is `transient` — UNLESS the pool was
    // aborted, when it settles `canceled` (never a retry).
    try {
      await deps.put(
        item.file,
        uploadUrl,
        (sent, total) => {
          deps.onStatus(item.id, { phase: 'uploading', sent, total });
        },
        signal
      );
    } catch (error) {
      if (aborted()) {
        settleCanceled(item);
      } else if (error instanceof PutUploadError) {
        if (error.status === 400) {
          fail('permanent', error.message);
        } else {
          retryOrFail(error.message);
        }
      } else {
        retryOrFail(error instanceof Error ? error.message : 'Upload failed: network error.');
      }
      return;
    }
    if (aborted()) {
      // The PUT finished, but the operator canceled — nothing canceled is
      // promoted; the staged object is the tmp/ lifecycle GC's.
      settleCanceled(item);
      return;
    }

    // (4) The commit — its own POST /admin/gallery-photos, the
    // verify/promote gate. An abort BEFORE it fires cancels (above); once
    // in flight, its verdict stands. ok → `done`; 400 → `permanent` with
    // the API message; anything else `transient`.
    deps.onStatus(item.id, { phase: 'committing' });
    try {
      const result = await deps.commit({
        r2Key: stagingKey,
        title: item.title,
        caption: item.caption,
        categoryId: item.categoryId,
      });
      if (result.ok) {
        settled.add(item.id);
        deps.onStatus(item.id, { phase: 'done', photo: result.photo });
        done.push(item);
      } else if (result.status === 400) {
        fail('permanent', result.message);
      } else {
        retryOrFail('Could not save the photo: ' + result.status);
      }
    } catch (error) {
      // The commit adapter answers in its result union; a throw is
      // "everything else" — `transient`, same as a presign throw.
      retryOrFail(error instanceof Error ? error.message : 'Could not save the photo.');
    }
  };

  const worker = async (): Promise<void> => {
    while (next < queue.length) {
      if (aborted()) {
        break; // an aborted pool stops dequeueing
      }
      const entry = queue[next];
      if (entry === undefined) break; // unreachable below queue.length
      next += 1;
      await runAttempt(entry);
    }
  };

  await Promise.all(Array.from({ length: BATCH_CONCURRENCY }, () => worker()));

  // The abort sweep: workers stopped before dequeueing every entry — each
  // never-run (or mid-retry-queue) item settles `canceled` now. Without an
  // abort this is a no-op (every item already settled).
  for (const entry of queue) {
    settleCanceled(entry.item);
  }

  return { done, failed, canceled };
}

/**
 * A non-2xx PUT response, typed. Carries the status so the pool can split
 * 400 (`permanent`) from every other non-2xx (`transient`) in one place.
 */
export class PutUploadError extends Error {
  readonly status: number;

  constructor(status: number) {
    super('Upload failed: ' + status);
    this.name = 'PutUploadError';
    this.status = status;
  }
}

/**
 * The browser-direct XHR PUT — the `cover-upload.ts` step-3 port, verbatim
 * semantics: `PUT`, `Content-Type: image/jpeg`, `xhr.upload.onprogress`
 * (fetch has no upload progress — the spec's XHR ruling), 2xx resolves.
 * Unlike the cover loop it THROWS a typed `PutUploadError` on non-2xx and
 * rejects on `error`/`abort`, so the pool's retry-class map stays in one
 * place. M7 #220: the optional `signal` is the cancel wire — an already-
 * aborted signal rejects without sending; an abort mid-flight calls
 * `xhr.abort()`, whose `onabort` reject ('Upload canceled.') the pool
 * settles `canceled` (never a retry). The listener is `once`-style and
 * removed on every settle.
 *
 * `#143 seam: the injected PUT` — exported for the component's `deps.put`
 * wiring and for the suite's stubbing seam.
 */
export async function putFileToPresignedUrl(
  file: File,
  uploadUrl: string,
  onProgress: (sent: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Upload canceled.'));
      return;
    }
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort);
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'image/jpeg');
    xhr.upload.onprogress = (event) => {
      onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      signal?.removeEventListener('abort', onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new PutUploadError(xhr.status));
      }
    };
    xhr.onerror = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new Error('Upload failed: network error.'));
    };
    xhr.onabort = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(new Error('Upload canceled.'));
    };
    xhr.send(file);
  });
}

/**
 * `#220 seam: the leave-guard predicate` — true while ANY item has not
 * reached a terminal status. `undefined` counts (enqueued; the pool has
 * not reported yet), as do queued/uploading/committing; done/failed/
 * canceled are terminal. BOTH navigation guards consume this one
 * predicate — the router blocker and the browser beforeunload — so the
 * two classes can never disagree about what "unsettled" means.
 */
export function hasUnsettledUploads(
  items: BatchItem[],
  statuses: Map<string, BatchItemStatus>
): boolean {
  return items.some((item) => {
    const status = statuses.get(item.id);
    if (status === undefined) {
      return true;
    }
    return (
      status.phase === 'queued' || status.phase === 'uploading' || status.phase === 'committing'
    );
  });
}

/**
 * `#220 seam: the tray's visibility law` — the tray renders while anything
 * is unsettled OR any row still needs staff eyes (a failure to retry, a
 * canceled row to acknowledge); an all-done tray hides itself. Canceled
 * rows hold the tray open: after a mid-batch cancel the operator still
 * sees what did NOT upload (Done clears).
 */
export function trayIsVisible(items: BatchItem[], statuses: Map<string, BatchItemStatus>): boolean {
  if (items.length === 0) {
    return false;
  }
  if (hasUnsettledUploads(items, statuses)) {
    return true;
  }
  return items.some((item) => {
    const phase = statuses.get(item.id)?.phase;
    return phase === 'failed' || phase === 'canceled';
  });
}
