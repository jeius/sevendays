import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { BranchCard } from '../components/branch-card';
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
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink'>Branches</h1>
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {branches.map((b) => (
            <BranchCard key={b.id} branch={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
