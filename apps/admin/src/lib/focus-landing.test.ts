import { describe, expect, it } from 'vitest';
import { FOCUS_HIGHLIGHT_MS, FOCUS_ROW_CLASS, focusSearchSchema } from './focus-landing.js';
import { testimonialsSearchSchema } from './submissions-state.js';

const UUID = '00000000-0000-4000-8000-000000000001';

describe('focusSearchSchema — the param read (D10, tolerant by construction)', () => {
  it('absent focus → dropped — normal navigation untouched', () => {
    expect(focusSearchSchema.parse({})).toEqual({});
  });

  it('a uuid passes through verbatim', () => {
    expect(focusSearchSchema.parse({ focus: UUID })).toEqual({ focus: UUID });
  });

  it('non-uuid garbage drops to undefined — never throws (the audit-log posture); the charset law also keeps the row selector quote-safe', () => {
    expect(focusSearchSchema.parse({ focus: 'x"]' })).toEqual({});
    expect(focusSearchSchema.parse({ focus: '' })).toEqual({});
    expect(focusSearchSchema.parse({ focus: 'not-a-uuid' })).toEqual({});
  });

  it('a non-string value drops too (catch, not throw)', () => {
    expect(focusSearchSchema.parse({ focus: 42 })).toEqual({});
  });
});

describe('the testimonials interplay (tab + focus compose on one route)', () => {
  it('tab and focus parse together', () => {
    expect(testimonialsSearchSchema.parse({ tab: 'submissions', focus: UUID })).toEqual({
      tab: 'submissions',
      focus: UUID,
    });
  });

  it('a focus-only visit keeps the #314 default (the published list, where the focused row lives)', () => {
    expect(testimonialsSearchSchema.parse({ focus: UUID })).toEqual({ focus: UUID });
    expect(testimonialsSearchSchema.parse({ focus: 'garbage' })).toEqual({});
  });
});

describe('the pinned constants (the plan-time rulings, 2026-11-17)', () => {
  it('FOCUS_HIGHLIGHT_MS — the ~1.6 s fade law', () => {
    expect(FOCUS_HIGHLIGHT_MS).toBe(1600);
  });

  it('FOCUS_ROW_CLASS — semantic tokens only, paints nothing without [data-focused]', () => {
    expect(FOCUS_ROW_CLASS).toBe(
      'transition-colors data-[focused]:bg-primary/10 data-[focused]:ring-1 data-[focused]:ring-primary/30'
    );
  });
});
