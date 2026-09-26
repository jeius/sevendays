import type { Database } from '@sevendays/db';
import { testimonials } from '@sevendays/db';
import type { PublicTestimonial } from '@sevendays/types';
import { asc, eq } from 'drizzle-orm';

/**
 * The public testimonials read (#138): active rows in position order, the
 * projection stripped to the public shape (id, quote, person — no position,
 * no activity flag, no timestamps). Array order is the render order.
 */
export async function listActiveTestimonials(db: Database): Promise<PublicTestimonial[]> {
  return db
    .select({ id: testimonials.id, quote: testimonials.quote, person: testimonials.person })
    .from(testimonials)
    .where(eq(testimonials.isActive, true))
    .orderBy(asc(testimonials.position), asc(testimonials.id));
}
