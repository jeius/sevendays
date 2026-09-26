// The branches route (M5 #140): the gated shell's branches entry point.
// The screen owns its state (table + editor + bulk wiring) and composes its
// own PageHeader (the `New branch` action toggles the screen's create state,
// so the header lives where the state lives) — the route only mounts it
// under the pinned head title.
import { createFileRoute } from '@tanstack/react-router';
import { BranchesScreen } from '#/components/branches/branches-screen';

export const Route = createFileRoute('/_shell/branches')({
  head: () => ({ meta: [{ title: 'Branches | Sevendays Admin' }] }),
  component: BranchesPage,
});

function BranchesPage() {
  return <BranchesScreen />;
}
