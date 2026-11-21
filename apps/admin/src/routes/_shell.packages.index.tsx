// The packages index (M5 #139): the gated shell's catalog entry point —
// PageHeader over the consolidated packages table (the #131 table ruling).
// The prototype's honesty caption does NOT port. Extracted from
// _shell.packages.tsx during Task 7's evidence run when the editor routes
// proved unmountable under a parent that rendered the table without an
// Outlet (the Task 5 plan structure — matched-but-never-rendered children).
// M9 #316: the ?focus= deep link — a Global Search result lands here with
// the matched row scrolled into view + highlighted (tolerant by
// construction: absent/garbage drops, an unknown id no-ops; the packages
// edit route stays one deliberate click away — the landing never opens it).
import { Button } from '@sevendays/ui/components/button';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { PageHeader } from '#/components/cms/shared';
import { PackagesTable } from '#/components/packages/packages-table';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';
import { focusSearchSchema } from '#/lib/focus-landing';

export const Route = createFileRoute('/_shell/packages/')({
  head: () => ({ meta: [{ title: 'Packages | Sevendays Admin' }] }),
  validateSearch: focusSearchSchema,
  // M8 #288: hover-intent priming — fire-and-forget, never blocks
  // (the cms-queries seam carries the law).
  loader: ({ context: { queryClient } }) => {
    primeCmsQueries(cmsRoutePriming.packagesIndex(queryClient));
  },
  component: PackagesPage,
});

function PackagesPage() {
  const { focus } = Route.useSearch();
  return (
    <section className='space-y-4'>
      <PageHeader
        title='Packages'
        subline="Everything on the landing site's /packages page, editable in place."
        actions={
          <Button render={<Link to='/packages/new' />}>
            <Plus aria-hidden='true' />
            New package
          </Button>
        }
      />
      <PackagesTable focus={focus} />
    </section>
  );
}
