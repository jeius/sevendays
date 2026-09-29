import { describe, expect, it, vi } from 'vitest';
import {
  type BatchItem,
  type BatchUploadDeps,
  PutUploadError,
  preCheckFile,
  runBatchUpload,
} from './batch-photo-upload';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const okFile = () => new File(['bytes'], `p-${Math.random()}.jpg`, { type: 'image/jpeg' });

// The commit adapter's result union, so a mock's `ok: true` stays literal
// instead of widening to `boolean`.
type CommitResult = ReturnType<BatchUploadDeps['commit']>;

function item(n: number): BatchItem {
  return { id: uuid(n), file: okFile(), categoryId: null, title: `Photo ${n}` };
}

function deps(overrides: Partial<BatchUploadDeps> = {}): BatchUploadDeps & {
  presignCalls: string[];
} {
  const presignCalls: string[] = [];
  return {
    presignCalls,
    presign: vi.fn(async () => {
      presignCalls.push(`p${presignCalls.length + 1}`);
      return {
        key: `tmp/${presignCalls.length}.jpg`,
        uploadUrl: `https://r2/${presignCalls.length}`,
      };
    }),
    put: vi.fn(async () => {}),
    commit: vi.fn(async (): CommitResult => ({ ok: true, photo: { id: uuid(99) } as never })),
    onStatus: vi.fn(),
    ...overrides,
  };
}

describe('preCheckFile', () => {
  it('type and size gates; null when clear', async () => {
    expect(await preCheckFile(new File(['b'], 'a.png', { type: 'image/png' }))).toBe(
      'Only JPG files are supported.'
    );
    expect(
      await preCheckFile(
        new File([new ArrayBuffer(50 * 1024 * 1024 + 1)], 'a.jpg', { type: 'image/jpeg' })
      )
    ).toBe('That file is over the 50 MiB cap.');
    expect(await preCheckFile(new File(['b'], 'a.jpg', { type: 'image/jpeg' }))).toBeNull();
  });
});

describe('runBatchUpload', () => {
  it('an ok item walks queued → uploading → committing → done and lands in done', async () => {
    const d = deps();
    const result = await runBatchUpload([item(1)], d);
    expect(result.done).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
    const phases = (d.onStatus as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[1].phase);
    expect(phases).toContain('queued');
    expect(phases).toContain('committing');
    expect(phases.at(-1)).toBe('done');
  });

  it('a pre-check failure settles failed immediately with zero network calls', async () => {
    const d = deps();
    const bad = { ...item(1), file: new File(['b'], 'a.png', { type: 'image/png' }) };
    const result = await runBatchUpload([bad], d);
    expect(result.failed).toEqual([bad]);
    expect(d.presign).not.toHaveBeenCalled();
    expect(d.put).not.toHaveBeenCalled();
  });

  it('a transient PUT failure re-queues and attempt 2 presigns FRESH, then succeeds', async () => {
    let calls = 0;
    const d = deps({
      put: vi.fn(async () => {
        calls += 1;
        if (calls === 1) throw new PutUploadError(500);
      }),
    });
    const result = await runBatchUpload([item(1)], d);
    expect(result.done).toHaveLength(1);
    expect(d.presignCalls).toEqual(['p1', 'p2']);
  });

  it('a transient failure on BOTH attempts settles failed with attempts: 2', async () => {
    const d = deps({
      put: vi.fn(async () => {
        throw new PutUploadError(500);
      }),
    });
    const result = await runBatchUpload([item(1)], d);
    expect(result.failed).toHaveLength(1);
    const last = (d.onStatus as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    expect(last?.[1]).toMatchObject({ phase: 'failed', kind: 'transient', attempts: 2 });
  });

  it('a 400 PUT is PERMANENT — no retry, no second presign', async () => {
    const d = deps({
      put: vi.fn(async () => {
        throw new PutUploadError(400);
      }),
    });
    const result = await runBatchUpload([item(1)], d);
    expect(result.failed).toHaveLength(1);
    expect(d.presignCalls).toEqual(['p1']);
    const last = (d.onStatus as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    expect(last?.[1]).toMatchObject({ phase: 'failed', kind: 'permanent' });
  });

  it('a commit 400 is permanent with the API message; a commit throw retries transiently', async () => {
    const permanent = deps({
      commit: vi.fn(async () => ({ ok: false as const, status: 400, message: 'not an image' })),
    });
    const p1 = await runBatchUpload([item(1)], permanent);
    expect(p1.failed).toHaveLength(1);
    const last = (permanent.onStatus as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    expect(last?.[1]).toMatchObject({
      phase: 'failed',
      kind: 'permanent',
      message: 'not an image',
    });

    let calls = 0;
    const flaky = deps({
      commit: vi.fn(async (): CommitResult => {
        calls += 1;
        if (calls === 1) throw new Error('boom');
        return { ok: true, photo: { id: uuid(99) } as never };
      }),
    });
    const p2 = await runBatchUpload([item(2)], flaky);
    expect(p2.done).toHaveLength(1);
  });

  it('a mixed batch settles DISJOINTLY: every item ends done or failed, never both', async () => {
    const d = deps({
      put: vi.fn(async (file: File) => {
        if (file.name.includes('bad')) throw new PutUploadError(400);
      }),
    });
    const good1 = item(1);
    const bad = { ...item(2), file: new File(['b'], 'bad.jpg', { type: 'image/jpeg' }) };
    const good2 = item(3);
    const result = await runBatchUpload([good1, bad, good2], d);
    expect(result.done.map((i) => i.id)).toEqual([good1.id, good2.id]);
    expect(result.failed.map((i) => i.id)).toEqual([bad.id]);
    const doneIds = new Set(result.done.map((i) => i.id));
    expect(result.failed.every((i) => !doneIds.has(i.id))).toBe(true);
  });

  it('a THROWING injected onStatus is a caller error: the pool rejects (pinned caller-error semantics, #141 T6)', async () => {
    const d = deps({
      onStatus: () => {
        throw new Error('listener bug');
      },
    });
    await expect(runBatchUpload([item(1)], d)).rejects.toThrow('listener bug');
  });
});
