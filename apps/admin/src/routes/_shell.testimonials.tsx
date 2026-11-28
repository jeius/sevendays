// The testimonials route (M5 #141, Task 8): the gated shell's testimonials
// entry point. The screen owns its state (person-main rows + the
// grip-handle reorder + the editor wiring) and composes its own PageHeader
// (the `New testimonial` action toggles the screen's create state, so the
// header lives where the state lives), the route only mounts it under the
// pinned head title. M9 #314: the tab deep link, the Notification
// panel's `Open Submissions` footer aims at ?tab=submissions (tolerant by
// construction, the audit-log posture: a stale or hand-edited value drops
// to the default, never fails a visit).
import { createFileRoute } from '@tanstack/react-router';
import { TestimonialsScreen } from '#/components/testimonials/testimonials-screen';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';
import { testimonialsSearchSchema } from '#/lib/submissions-state';

export const Route = createFileRoute('/_shell/testimonials')({
  head: () => ({ meta: [{ title: 'Testimonials | Sevendays Admin' }] }),
  validateSearch: testimonialsSearchSchema,
  // M8 #288: hover-intent priming, the testimonials rows + the
  // submissions queue (fire-and-forget, never blocks).
  loader: ({ context: { queryClient } }) => {
    primeCmsQueries(cmsRoutePriming.testimonials(queryClient));
  },
  component: TestimonialsPage,
});

function TestimonialsPage() {
  const search = Route.useSearch();
  return <TestimonialsScreen search={search} />;
}
