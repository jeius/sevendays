import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { BranchCard } from '../components/branch-card';
import { SiteHeader } from '../components/site-header';
import { branchQueries } from '../lib/queries';

export const Route = createFileRoute('/branches')({
  head: () => ({ meta: [{ title: 'Branches | Sevendays Photography' }] }),
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(branchQueries.all());
  },
  component: BranchesPage,
});

function BranchesPage() {
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <h1 className='mt-10 font-bold text-4xl'>Branches</h1>
      <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
        {branches.map((b) => (
          <BranchCard key={b.id} branch={b} />
        ))}
      </div>
    </div>
  );
}
