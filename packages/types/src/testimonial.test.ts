import { describe, expect, it } from 'vitest';
import {
  createTestimonialSchema,
  publicTestimonialSchema,
  testimonialOrderSchema,
  testimonialSchema,
  updateTestimonialSchema,
} from './testimonial.js';

const UUID = '00000000-0000-4000-8000-000000000000';
const UUID2 = '00000000-0000-4000-8000-000000000001';
const DATE = '2026-09-25T00:00:00.000Z';

describe('testimonialSchema', () => {
  it('parses a canonical row (quote, person, position, isActive)', () => {
    const result = testimonialSchema.safeParse({
      id: UUID,
      quote: 'The photos came out better than we hoped.',
      person: 'Maria, batch 2026',
      position: 2,
      isActive: true,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(result.success).toBe(true);
  });

  it('create rejects an empty quote and a missing person', () => {
    expect(createTestimonialSchema.safeParse({ quote: '', person: 'Maria' }).success).toBe(false);
    expect(createTestimonialSchema.safeParse({ quote: 'Loved it.' }).success).toBe(false);
  });

  it('create defaults isActive true and drops the server-assigned fields', () => {
    const parsed = createTestimonialSchema.parse({
      quote: 'Loved it.',
      person: 'Maria',
      id: UUID,
      position: 5,
      createdAt: DATE,
      updatedAt: DATE,
    });
    expect(parsed.isActive).toBe(true);
    expect('id' in parsed).toBe(false);
    expect('position' in parsed).toBe(false);
    expect('createdAt' in parsed).toBe(false);
    expect('updatedAt' in parsed).toBe(false);
  });

  it('update is the create schema (full-object PUT)', () => {
    expect(updateTestimonialSchema).toBe(createTestimonialSchema);
  });
});

describe('testimonialOrderSchema', () => {
  it('parses { testimonialIds }; rejects a non-uuid entry', () => {
    expect(testimonialOrderSchema.safeParse({ testimonialIds: [UUID2, UUID] }).success).toBe(true);
    expect(testimonialOrderSchema.safeParse({ testimonialIds: ['not-a-uuid'] }).success).toBe(
      false
    );
  });
});

describe('publicTestimonialSchema', () => {
  it('parses the trimmed public read (id, quote, person — array order is the render order)', () => {
    const result = publicTestimonialSchema.safeParse({
      id: UUID,
      quote: 'The photos came out better than we hoped.',
      person: 'Maria, batch 2026',
    });
    expect(result.success).toBe(true);
  });
});
