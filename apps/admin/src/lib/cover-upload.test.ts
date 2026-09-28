import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CoverUploadStatus, uploadCover } from './cover-upload';

const JPEG = new File(['bytes'], 'a.jpg', { type: 'image/jpeg' });

// Minimal XHR stand-in: the test drives the handler the loop assigned.
class FakeXhr {
  static last: FakeXhr | undefined;
  upload = { onprogress: null as ((e: { loaded: number; total: number }) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 200;
  method = '';
  url = '';
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader() {}
  send() {}
}

beforeEach(() => {
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  // Node has no createObjectURL; the loop calls URL.createObjectURL on the
  // bound path. Stub a subclass so the rest of URL survives.
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL = () => 'blob:fake-preview';
    }
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  FakeXhr.last = undefined;
});

async function started(
  seen: CoverUploadStatus[]
): Promise<{ promise: Promise<void>; xhr: FakeXhr }> {
  const promise = uploadCover(
    JPEG,
    () => Promise.resolve({ key: 'tmp/k.jpg', uploadUrl: 'https://r2/put' }),
    (s) => seen.push(s)
  );
  await vi.waitFor(() => expect(FakeXhr.last).toBeDefined());
  const xhr = FakeXhr.last;
  if (!xhr) throw new Error('unreachable after waitFor');
  return { promise, xhr };
}

describe('uploadCover', () => {
  it('rejects a non-JPEG before any network call', async () => {
    const presign = vi.fn();
    const seen: CoverUploadStatus[] = [];
    await uploadCover(new File(['b'], 'a.png', { type: 'image/png' }), presign as never, (s) =>
      seen.push(s)
    );
    expect(seen).toEqual([{ phase: 'failed', message: 'Only JPG files are supported.' }]);
    expect(presign).not.toHaveBeenCalled();
  });

  it('rejects an over-cap file before any network call', async () => {
    const presign = vi.fn();
    const seen: CoverUploadStatus[] = [];
    const big = new File([new ArrayBuffer(50 * 1024 * 1024 + 1)], 'a.jpg', { type: 'image/jpeg' });
    await uploadCover(big, presign as never, (s) => seen.push(s));
    expect(seen).toEqual([{ phase: 'failed', message: 'That file is over the 50 MiB cap.' }]);
    expect(presign).not.toHaveBeenCalled();
  });

  it('a presign failure emits failed and RESOLVES', async () => {
    const seen: CoverUploadStatus[] = [];
    await expect(
      uploadCover(
        JPEG,
        () => Promise.reject(new Error('presign down')),
        (s) => seen.push(s)
      )
    ).resolves.toBeUndefined();
    expect(seen).toContainEqual({ phase: 'failed', message: 'presign down' });
  });

  it('the happy path: presigning → uploading progress → bound with the staging key and a local preview', async () => {
    const seen: CoverUploadStatus[] = [];
    const { promise, xhr } = await started(seen);
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe('https://r2/put');
    xhr.upload.onprogress?.({ loaded: 2, total: 5 });
    xhr.onload?.();
    await expect(promise).resolves.toBeUndefined();
    expect(seen[0]).toEqual({ phase: 'presigning' });
    expect(seen).toContainEqual({ phase: 'uploading', sent: 2, total: 5 });
    expect(seen.at(-1)).toEqual({
      phase: 'bound',
      stagingKey: 'tmp/k.jpg',
      previewUrl: 'blob:fake-preview',
    });
  });

  it('a non-2xx PUT emits failed with the status and RESOLVES (the HTTP story is the machine’s)', async () => {
    const seen: CoverUploadStatus[] = [];
    const { promise, xhr } = await started(seen);
    xhr.status = 403;
    xhr.onload?.();
    await expect(promise).resolves.toBeUndefined();
    expect(seen.at(-1)).toEqual({ phase: 'failed', message: 'Upload failed: 403' });
  });

  it('an XHR error emits failed and REJECTS', async () => {
    const seen: CoverUploadStatus[] = [];
    const { promise, xhr } = await started(seen);
    xhr.onerror?.();
    await expect(promise).rejects.toThrow('Upload failed: network error.');
    expect(seen.at(-1)?.phase).toBe('failed');
  });

  it('an XHR abort emits failed and REJECTS (the cancellation path)', async () => {
    const seen: CoverUploadStatus[] = [];
    const { promise, xhr } = await started(seen);
    xhr.onabort?.();
    await expect(promise).rejects.toThrow('Upload canceled.');
    expect(seen.at(-1)).toMatchObject({ phase: 'failed', message: 'Upload canceled.' });
  });
});
