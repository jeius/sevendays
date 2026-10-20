import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { cn } from 'cn';
import { BranchCard } from '../components/branch-card';
import { isEmptyJudgingParam } from '../lib/empty-override';
import { branchQueries } from '../lib/queries';

export const Route = createFileRoute('/branches')({
  head: () => ({ meta: [{ title: 'Branches | Sevendays Photography' }] }),
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(branchQueries.all());
  },
  component: BranchesPage,
});

function BranchesPage() {
  // The ?empty=1 judging aid (M7 #223) — DEV-gated, never ships.
  const isEmpty = isEmptyJudgingParam(import.meta.env.DEV, useLocation().searchStr);
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  if (isEmpty || branches.length === 0) {
    // The ruled no-branches line (#164 Round 5's copy) + the Back-to-home
    // outline CTA — a branchless read reads as deliberate, not broken.
    return (
      <div className='mx-auto max-w-5xl px-6 py-12'>
        <h1 className='font-bold font-serif text-4xl text-foreground'>Branches</h1>
        {/* TODO(owner-copy): the no-branches line — the round ratifies. */}
        <p className='text-muted-foreground mt-6'>
          Our branches are being set up — check back soon.
        </p>
        <Link
          to='/'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          )}
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-foreground'>Branches</h1>
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {branches.map((b) => (
            <BranchCard key={b.id} branch={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
