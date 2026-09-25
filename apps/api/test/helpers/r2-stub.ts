// Recording R2Bucket stub for the write tests that ride the commit contract
// (#137): the Map-backed shape of services/media.test.ts's stubBucket as a
// shared helper. head/get feed commitUpload's verify, put records the
// promote (key + options), delete records deletions — assertions run
// against the recorded calls, so promote/delete semantics are pinned
// without a mock's looseness.
export function stubCommitBucket(
  initial: Record<string, { size: number; contentType: string }> = {}
) {
  const objects = new Map(
    Object.entries(initial).map(([key, meta]) => [key, { ...meta, deleted: false }])
  );
  const putCalls: { key: string; value: unknown; options: unknown }[] = [];
  const deleteCalls: string[] = [];
  const bucket = {
    async head(key: string) {
      const obj = objects.get(key);
      if (!obj || obj.deleted) return null;
      return { key, size: obj.size, httpMetadata: { contentType: obj.contentType } };
    },
    async get(key: string) {
      const obj = objects.get(key);
      if (!obj || obj.deleted) return null;
      return {
        key,
        size: obj.size,
        httpMetadata: { contentType: obj.contentType },
        body: 'staging-bytes',
      };
    },
    async put(key: string, value: unknown, options: unknown) {
      putCalls.push({ key, value, options });
      objects.set(key, { size: 1, contentType: 'image/jpeg' });
      return { key };
    },
    async delete(keys: string | string[]) {
      for (const key of [keys].flat()) {
        deleteCalls.push(key);
        const existing = objects.get(key);
        if (existing) objects.set(key, { ...existing, deleted: true });
      }
    },
  };
  return { bucket: bucket as unknown as R2Bucket, putCalls, deleteCalls };
}
