import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { cn } from 'cn';
import { BranchCard } from '../components/branch-card';
import { Reveal } from '../components/reveal';
import { BranchesSkeleton } from '../components/skeletons';
import { isEmptyJudgingParam } from '../lib/empty-override';
import { pageMetaFor } from '../lib/page-head';
import { branchQueries, siteSettingsQueries } from '../lib/queries';

export const Route = createFileRoute('/branches')({
  loader: async ({ context: { queryClient } }) => {
    // The never-throwing settings ensure (#215's law, page-local).
    await queryClient.ensureQueryData(branchQueries.all());
    const settings = await queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    return { settings };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    return { meta: pageMetaFor(settings.branchesTitle, settings.branchesDescription, settings) };
  },
  component: BranchesPage,
  // The ruled skeleton grammar (#164 Round 5): client navigations only.
  pendingComponent: BranchesSkeleton,
});

function BranchesPage() {
  // The ?empty=1 judging aid (M7 #223) — DEV-gated, never ships.
  const isEmpty = isEmptyJudgingParam(import.meta.env.DEV, useLocation().searchStr);
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { settings } = Route.useLoaderData();

  if (isEmpty || branches.length === 0) {
    // The ruled no-branches line (#164 Round 5's copy) + the Back-to-home
    // outline CTA — a branchless read reads as deliberate, not broken.
    return (
      <div className='mx-auto max-w-5xl px-6 py-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.branchesTitle}
        </h1>
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
      <section className='mx-auto max-w-5xl px-6 pt-12 pb-16'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.branchesTitle}
        </h1>
        {/* The ruled intro (#164 Round 4, draft ratified at the round's
            close). The v1 arm's tail "…or book online." → "…call ahead."
            is a pick-time transform on the v1 branch — main renders the
            settings copy verbatim, no runtime variant machinery. */}
        {settings.branchesDescription && (
          <p className='mt-2 max-w-prose text-muted-foreground'>{settings.branchesDescription}</p>
        )}
        <div className='mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {branches.map((b, i) => (
            <Reveal key={b.id} delay={(i % 2) * 90}>
              <BranchCard branch={b} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
