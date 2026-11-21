// The studio-services route (M5 #140): the gated shell's studio-services
// entry point. The screen owns its state (table + editor + bulk wiring) and
// composes its own PageHeader (the `New service` action toggles the
// screen's create state, so the header lives where the state lives) — the
// route only mounts it under the pinned head title.
import { createFileRoute } from '@tanstack/react-router';
import { StudioServicesScreen } from '#/components/studio-services/studio-services-screen';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

export const Route = createFileRoute('/_shell/studio-services')({
  head: () => ({ meta: [{ title: 'Studio services | Sevendays Admin' }] }),
  // M8 #288: hover-intent priming — the screen's reads + the branch
  // badges (fire-and-forget, never blocks).
  loader: ({ context: { queryClient } }) => {
    primeCmsQueries(cmsRoutePriming.studioServices(queryClient));
  },
  component: StudioServicesPage,
});

function StudioServicesPage() {
  return <StudioServicesScreen />;
}
