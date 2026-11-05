import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { Reveal } from '../components/reveal';
import { ServiceCard } from '../components/service-card';
import { ServicesSkeleton } from '../components/skeletons';
import { bookableBranchNames } from '../lib/bookable-branches';
import { pageMetaFor } from '../lib/page-head';
import { branchQueries, siteSettingsQueries, studioServiceQueries } from '../lib/queries';

export const Route = createFileRoute('/services')({
  loader: async ({ context: { queryClient } }) => {
    // The never-throwing settings ensure (#215's law, page-local).
    await Promise.all([
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(branchQueries.all()),
    ]);
    const settings = await queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    return { settings };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    return { meta: pageMetaFor(settings.servicesTitle, settings.servicesDescription, settings) };
  },
  component: ServicesPage,
  // The ruled skeleton grammar (#164 Round 5): client navigations only.
  pendingComponent: ServicesSkeleton,
});

function ServicesPage() {
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { settings } = Route.useLoaderData();

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.servicesTitle}
        </h1>
        {/* The ruled intro (#164 Round 3): the add-ons line is GONE — the
            Services page carries Studio Services only (add-ons live inside
            the booking flow, per the landing CONTEXT); the ruled draft is
            the settings default. */}
        {settings.servicesDescription && (
          <p className='mt-2 max-w-prose text-muted-foreground'>{settings.servicesDescription}</p>
        )}
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {services.map((s, i) => (
            <Reveal key={s.id} delay={(i % 2) * 90}>
              <ServiceCard service={s} branchNames={bookableBranchNames(s, branches)} />
            </Reveal>
          ))}
        </div>
      </section>
      {/* Closing call-or-visit strip (#60 ruling) — the #97 emphasis-strip
          pattern, KEPT VERBATIM as landed (theme-aware pair included).
          Call-or-visit flavored: no booking presupposition on either
          edition. */}
      <section
        className='mt-12 border-line-soft border-t bg-brand-gray-light'
        data-strip='call-visit'
      >
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='font-semibold font-serif text-foreground text-xl'>
              Need a service at one of our branches?
            </h2>
            <p className='mt-1 text-brand-700 text-sm dark:text-brand-400'>
              Call or visit a branch — we will confirm availability.
            </p>
          </div>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Find a branch
          </Link>
        </div>
      </section>
    </div>
  );
}
