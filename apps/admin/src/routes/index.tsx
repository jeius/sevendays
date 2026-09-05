import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { branchQueries } from '../lib/queries';

export const Route = createFileRoute('/')({
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(branchQueries.all());
  },
  component: Home,
});

function Home() {
  // PROBE PAGE — replaced by real Dashboard/CMS when Milestone 4 lands.
  // The branches read doubles as connectivity + parse verification (#24).
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  return (
    <div className='p-8'>
      <h1 className='font-bold text-4xl'>Sevendays Admin</h1>
      <h2 className='mt-4 font-semibold text-xl'>Branches (API probe)</h2>
      <ul className='mt-2 list-disc pl-6'>
        {branches.map((b) => (
          <li key={b.id}>
            {b.name} — {b.address}
          </li>
        ))}
      </ul>
    </div>
  );
}
