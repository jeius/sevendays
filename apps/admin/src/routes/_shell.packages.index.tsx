// The packages index (M5 #139): the gated shell's catalog entry point —
// PageHeader over the consolidated packages table (the #131 table ruling).
// The prototype's honesty caption does NOT port. Extracted from
// _shell.packages.tsx during Task 7's evidence run when the editor routes
// proved unmountable under a parent that rendered the table without an
// Outlet (the Task 5 plan structure — matched-but-never-rendered children).
import { Button } from '@sevendays/ui/components/button';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PageHeader } from '#/components/cms/shared';
import { PackagesTable } from '#/components/packages/packages-table';

export const Route = createFileRoute('/_shell/packages/')({
  head: () => ({ meta: [{ title: 'Packages | Sevendays Admin' }] }),
  component: PackagesPage,
});

function PackagesPage() {
  return (
    <section className='space-y-4'>
      <PageHeader
        title='Packages'
        subline="Everything on the landing site's /packages page, editable in place."
        actions={<Button render={<Link to='/packages/new' />}>New package</Button>}
      />
      <PackagesTable />
    </section>
  );
}
