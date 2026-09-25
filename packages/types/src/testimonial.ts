import { z } from 'zod';

// Testimonial (M5, glossary): a structured customer quote — quote text,
// person attributed, display position. The order PUT owns reordering, so
// create/update carry no position field; array order is the render order.
export const testimonialSchema = z.object({
  id: z.uuid(),
  quote: z.string().min(1),
  person: z.string().min(1),
  position: z.number().int().min(1),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Testimonial = z.infer<typeof testimonialSchema>;

export const createTestimonialSchema = testimonialSchema.omit({
  id: true,
  position: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;

// Full-object PUT (M5 § Mutation shapes): update is the same client field set.
export const updateTestimonialSchema = createTestimonialSchema;

export type UpdateTestimonialInput = CreateTestimonialInput;

export const testimonialOrderSchema = z.object({
  testimonialIds: z.array(z.uuid()),
});

export type TestimonialOrderInput = z.infer<typeof testimonialOrderSchema>;

// Public read (GET /api/v1/testimonials, #138): active rows in position
// order; array order is the render order.
export const publicTestimonialSchema = z.object({
  id: z.uuid(),
  quote: z.string().min(1),
  person: z.string().min(1),
});

export type PublicTestimonial = z.infer<typeof publicTestimonialSchema>;
