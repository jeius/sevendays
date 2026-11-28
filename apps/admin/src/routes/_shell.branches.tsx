// The branches route (M5 #140): the gated shell's branches entry point.
// The screen owns its state (table + editor + bulk wiring) and composes its
// own PageHeader (the `New branch` action toggles the screen's create state,
// so the header lives where the state lives), the route only mounts it
// under the pinned head title. M9 #316: the ?focus= deep link, a Global
// Search result lands here with the matched row scrolled into view +
// highlighted (tolerant by construction: absent/garbage drops, an unknown
// id no-ops).
import { createFileRoute } from '@tanstack/react-router';
import { BranchesScreen } from '#/components/branches/branches-screen';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';
import { focusSearchSchema } from '#/lib/focus-landing';

export const Route = createFileRoute('/_shell/branches')({
  head: () => ({ meta: [{ title: 'Branches | Sevendays Admin' }] }),
  validateSearch: focusSearchSchema,
  // M8 #288: hover-intent priming, the cms-queries seam carries the law.
  loader: ({ context: { queryClient } }) => {
    primeCmsQueries(cmsRoutePriming.branches(queryClient));
  },
  component: BranchesPage,
});

function BranchesPage() {
  const { focus } = Route.useSearch();
  return <BranchesScreen focus={focus} />;
}
