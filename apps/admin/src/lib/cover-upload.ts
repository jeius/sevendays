// The cover upload loop (M5 #139, ADR-0019): presign (server-side, through
// the admin server fn) → browser-direct XHR PUT to the presigned URL (the
// one by-design browser call; the bucket CORS lists the admin origins) →
// the staging key rides the NEXT atomic package save, whose commit is the
// real verify/promote gate (#136/#137). Framework-free on purpose: #143's
// lib-seam suite drives this loop with a fake presign + a stubbed XHR.
import type { MediaPresignRequest, MediaPresignResponse } from '@sevendays/types';

/**
 * The upload status machine the caller renders. `#143 seam: the cover
 * status machine`. `failed` carries the message; `bound` carries the
 * staging key to put on `coverImageKey` and the local object-URL preview.
 */
export type CoverUploadStatus =
  | { phase: 'idle' }
  | { phase: 'presigning' }
  | { phase: 'uploading'; sent: number; total: number }
  | { phase: 'bound'; stagingKey: string; previewUrl: string }
  | { phase: 'failed'; message: string };

/**
 * `#143 seam: the presign → upload → bind loop`. The full path, in order:
 *
 * 1. Client pre-checks BEFORE any network call — type must be
 *    `image/jpeg`, size ≤ 50 MiB. The commit re-verifies server-side
 *    (#136's contract); the client check is courtesy, never trusted.
 * 2. `presigning` → the injected `presign` fn (the component wires the
 *    admin server fn in) with `{ purpose: 'package-cover',
 *    contentType: 'image/jpeg' }`.
 * 3. `uploading` — XHR PUT (fetch has no upload progress — the spec's XHR
 *    ruling) with `Content-Type: image/jpeg`; progress events map to
 *    `{ sent, total }`; a non-2xx response fails with the status code.
 * 4. `bound` with `stagingKey` (the presigned `key` — it rides the NEXT
 *    atomic package save, whose commit is the real verify/promote gate)
 *    and a local `previewUrl`.
 *
 * Settlement: every failure emits `failed` through `onStatus` first — the
 * machine never stalls. The promise RESOLVES on pre-check/presign/non-2xx
 * failures (the HTTP-level story is fully told by the machine) and
 * REJECTS only on XHR `error`/`abort` (network anomaly / cancellation).
 *
 * The `previewUrl` object URL is revoked by the CALLER — the editor
 * revokes on replace/unmount.
 */
export async function uploadCover(
  file: File,
  presign: (req: MediaPresignRequest) => Promise<MediaPresignResponse>,
  onStatus: (status: CoverUploadStatus) => void
): Promise<void> {
  // (1) Courtesy pre-checks, before any network call. The commit is the
  // real gate — these are never trusted server-side (#136).
  if (file.type !== 'image/jpeg') {
    onStatus({ phase: 'failed', message: 'Only JPG files are supported.' });
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    onStatus({ phase: 'failed', message: 'That file is over the 50 MiB cap.' });
    return;
  }

  // (2) Presign through the injected seam — the server assigns the key;
  // the client never supplies key text (ADR-0019).
  onStatus({ phase: 'presigning' });
  let stagingKey: string;
  let uploadUrl: string;
  try {
    const presigned = await presign({ purpose: 'package-cover', contentType: 'image/jpeg' });
    stagingKey = presigned.key;
    uploadUrl = presigned.uploadUrl;
  } catch (error) {
    onStatus({
      phase: 'failed',
      message: error instanceof Error ? error.message : 'Could not start the upload.',
    });
    return;
  }

  // (3) Browser-direct XHR PUT — the one by-design browser call; fetch has
  // no upload progress, so the XHR ruling stands.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'image/jpeg');
    xhr.upload.onprogress = (event) => {
      onStatus({ phase: 'uploading', sent: event.loaded, total: event.total });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // (4) Bound — the staging key rides the NEXT atomic save; the
        // object URL is the caller's to revoke (replace/unmount).
        onStatus({
          phase: 'bound',
          stagingKey,
          previewUrl: URL.createObjectURL(file),
        });
        resolve();
      } else {
        onStatus({ phase: 'failed', message: 'Upload failed: ' + xhr.status });
        resolve();
      }
    };
    xhr.onerror = () => {
      onStatus({ phase: 'failed', message: 'Upload failed: network error.' });
      reject(new Error('Upload failed: network error.'));
    };
    xhr.onabort = () => {
      onStatus({ phase: 'failed', message: 'Upload canceled.' });
      reject(new Error('Upload canceled.'));
    };
    xhr.send(file);
  });
}
