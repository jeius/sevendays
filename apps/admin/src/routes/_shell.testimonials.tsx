// The testimonials route (M5 #141): the gated shell's testimonials entry
// point. The screen (Task 8) will own its state (person-main rows + the
// grip-handle reorder) and take over this render — the route only mounts
// the pinned PageHeader + a temporary placeholder until then.
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '#/components/cms/shared';

export const Route = createFileRoute('/_shell/testimonials')({
  head: () => ({ meta: [{ title: 'Testimonials | Sevendays Admin' }] }),
  component: TestimonialsPage,
});

function TestimonialsPage() {
  return (
    <>
      <PageHeader title='Testimonials' subline='Client quotes shown on the /about page, ordered.' />
      <p className='text-muted-foreground text-sm'>Screen lands in Task 8.</p>
    </>
  );
}
