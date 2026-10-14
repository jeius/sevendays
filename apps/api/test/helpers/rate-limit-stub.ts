// Recording RateLimit stub for the submissions gate tests (M7 #216, the
// r2-stub pattern): every limit() call records its key; the first
// `failAfter` calls answer success, everything after answers failure
// (failAfter 0 = always fail, Infinity = always allow).
export function stubRateLimiter(failAfter = Number.POSITIVE_INFINITY) {
  const calls: string[] = [];
  let used = 0;
  const limiter = {
    async limit({ key }: { key: string }) {
      calls.push(key);
      used += 1;
      return { success: used <= failAfter };
    },
  };
  return { limiter: limiter as unknown as RateLimit, calls };
}
