// The testimonials route (M5 #141, Task 8): the gated shell's testimonials
// entry point. The screen owns its state (person-main rows + the
// grip-handle reorder + the editor wiring) and composes its own PageHeader
// (the `New testimonial` action toggles the screen's create state, so the
// header lives where the state lives) — the route only mounts it under the
// pinned head title.
import { createFileRoute } from '@tanstack/react-router';
import { TestimonialsScreen } from '#/components/testimonials/testimonials-screen';

export const Route = createFileRoute('/_shell/testimonials')({
  head: () => ({ meta: [{ title: 'Testimonials | Sevendays Admin' }] }),
  component: TestimonialsPage,
});

function TestimonialsPage() {
  return <TestimonialsScreen />;
}
