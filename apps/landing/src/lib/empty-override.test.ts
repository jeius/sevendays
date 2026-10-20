// The empty-states judging aid (#164 Round 5's mechanism, built DEV-gated):
// ?empty=1 forces the ruled whole-page empty lines so the round judges them
// without emptying the live catalog. Production builds answer false by
// construction — the aid never ships.
import { describe, expect, it } from 'vitest';
import { isEmptyJudgingParam } from './empty-override';

describe('isEmptyJudgingParam (M7 #223 — DEV-gated)', () => {
  it('dev + ?empty=1 → true (the judging path)', () => {
    expect(isEmptyJudgingParam(true, '?empty=1')).toBe(true);
  });

  it('production + ?empty=1 → false (the aid never ships)', () => {
    expect(isEmptyJudgingParam(false, '?empty=1')).toBe(false);
  });

  it('dev without the param → false', () => {
    expect(isEmptyJudgingParam(true, '')).toBe(false);
    expect(isEmptyJudgingParam(true, '?other=1')).toBe(false);
  });

  it('dev + ?empty=0 → false (only the exact value arms it)', () => {
    expect(isEmptyJudgingParam(true, '?empty=0')).toBe(false);
  });
});
