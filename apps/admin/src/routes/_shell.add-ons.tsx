// The add-ons route (M5 #140): the gated shell's add-ons entry point. The
// screen owns its state (table + editor + bulk wiring) and composes its own
// PageHeader (the `New add-on` action toggles the screen's create state, so
// the header lives where the state lives), the route only mounts it under
// the pinned head title.
import { createFileRoute } from '@tanstack/react-router';
import { AddonsScreen } from '#/components/addons/addons-screen';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

export const Route = createFileRoute('/_shell/add-ons')({
  head: () => ({ meta: [{ title: 'Add-ons | Sevendays Admin' }] }),
  // M8 #288: hover-intent priming, the screen's reads + the service
  // badges (fire-and-forget, never blocks).
  loader: ({ context: { queryClient } }) => {
    primeCmsQueries(cmsRoutePriming.addOns(queryClient));
  },
  component: AddOnsPage,
});

function AddOnsPage() {
  return <AddonsScreen />;
}
