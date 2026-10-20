// The empty-states judging aid (#164 Round 5's mechanism, built DEV-gated
// for #223): `?empty=1` forces the ruled whole-page empty lines so the
// owner round judges them without emptying the live catalog. The URL is
// read RAW (route search validation strips unknown params); `dev` is the
// caller's `import.meta.env.DEV` so production builds answer false by
// construction — the aid never ships.
export function isEmptyJudgingParam(dev: boolean, search: string): boolean {
  if (!dev) return false;
  return new URLSearchParams(search).get('empty') === '1';
}
