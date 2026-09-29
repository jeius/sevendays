import { describe, expect, it } from 'vitest';
import { bulkConfirmName } from './bulk-counts';

describe('bulkConfirmName (#155 owner-ratified formats)', () => {
  it('every selected row eligible: the plain count', () => {
    expect(bulkConfirmName(3, 3)).toBe('3 items');
  });

  it('a split: eligible of selected', () => {
    expect(bulkConfirmName(3, 2)).toBe('2 of 3 selected items');
  });

  it('none eligible: the honest zero split', () => {
    expect(bulkConfirmName(3, 0)).toBe('0 of 3 selected items');
  });

  it('plural only — a lone selection keeps the plural form (the bar’s `{n} selected` matches; no singular branch by ruling)', () => {
    expect(bulkConfirmName(1, 1)).toBe('1 items');
  });
});
