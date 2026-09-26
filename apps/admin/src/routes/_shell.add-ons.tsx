// The add-ons route (M5 #140): the gated shell's add-ons entry point. The
// screen owns its state (table + editor + bulk wiring) and composes its own
// PageHeader (the `New add-on` action toggles the screen's create state, so
// the header lives where the state lives) — the route only mounts it under
// the pinned head title.
import { createFileRoute } from '@tanstack/react-router';
import { AddonsScreen } from '#/components/addons/addons-screen';

export const Route = createFileRoute('/_shell/add-ons')({
  head: () => ({ meta: [{ title: 'Add-ons | Sevendays Admin' }] }),
  component: AddOnsPage,
});

function AddOnsPage() {
  return <AddonsScreen />;
}
