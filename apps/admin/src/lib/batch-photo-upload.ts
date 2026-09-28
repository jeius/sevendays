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
  | { phase: 'failed'; kind: BatchFailureKind; message: string; attempts: number };

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
    onProgress: (sent: number, total: number) => void
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
 * Settlement is guaranteed: every item ends `done` or `failed`, the promise
 * resolves with the two lists, and `onStatus` has told the full story.
 * Continue-with-successes / retry-failures — never an all-or-nothing
 * barrier: only committed files become savable.
 */
export async function runBatchUpload(
  items: BatchItem[],
  deps: BatchUploadDeps
): Promise<{ done: BatchItem[]; failed: BatchItem[] }> {
  const done: BatchItem[] = [];
  const failed: BatchItem[] = [];

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
      deps.onStatus(item.id, { phase: 'failed', kind, message, attempts: attempt });
      failed.push(item);
    };

    // A `transient` failure: re-queue if attempts remain (the retry gets a
    // fresh presign), else settle `failed`.
    const retryOrFail = (message: string) => {
      if (attempt < MAX_UPLOAD_ATTEMPTS) {
        queue.push({ item, attemptsUsed: attempt, preChecked: true });
      } else {
        fail('transient', message);
      }
    };

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
    }

    // (2) Presign — the server assigns the staging key; the client never
    // supplies key text (ADR-0019). A throw is `transient`.
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

    // (3) The XHR PUT; progress events map to `uploading`. Non-2xx arrives
    // as a typed PutUploadError — 400 is `permanent`, the rest `transient`.
    // An `error`/`abort` reject is `transient`.
    try {
      await deps.put(item.file, uploadUrl, (sent, total) => {
        deps.onStatus(item.id, { phase: 'uploading', sent, total });
      });
    } catch (error) {
      if (error instanceof PutUploadError) {
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

    // (4) The commit — its own POST /admin/gallery-photos, the
    // verify/promote gate. ok → `done` (the row IS the grid's new card);
    // 400 → `permanent` with the API message; anything else `transient`.
    deps.onStatus(item.id, { phase: 'committing' });
    try {
      const result = await deps.commit({
        r2Key: stagingKey,
        title: item.title,
        categoryId: item.categoryId,
      });
      if (result.ok) {
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
      const entry = queue[next];
      if (entry === undefined) break; // unreachable below queue.length
      next += 1;
      await runAttempt(entry);
    }
  };

  await Promise.all(Array.from({ length: BATCH_CONCURRENCY }, () => worker()));

  return { done, failed };
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
 * place.
 *
 * `#143 seam: the injected PUT` — exported for the component's `deps.put`
 * wiring and for the suite's stubbing seam.
 */
export async function putFileToPresignedUrl(
  file: File,
  uploadUrl: string,
  onProgress: (sent: number, total: number) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'image/jpeg');
    xhr.upload.onprogress = (event) => {
      onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new PutUploadError(xhr.status));
      }
    };
    xhr.onerror = () => {
      reject(new Error('Upload failed: network error.'));
    };
    xhr.onabort = () => {
      reject(new Error('Upload canceled.'));
    };
    xhr.send(file);
  });
}
