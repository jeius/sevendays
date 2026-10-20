import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { cn } from 'cn';
import { CatalogPlates } from '../../components/catalog-plates';
import { PackagesSkeleton } from '../../components/skeletons';
import { isEmptyJudgingParam } from '../../lib/empty-override';
import { pageMetaFor } from '../../lib/page-head';
import { servicePackageQueries, siteSettingsQueries } from '../../lib/queries';

export const Route = createFileRoute('/packages/')({
  // The never-throwing settings ensure (#215's law — the #223 root-loader
  // posture, page-local): the intro + head degrade to code defaults; the
  // packages read owns its own failure surface.
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(servicePackageQueries.all());
    const settings = await queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    return { settings };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    return { meta: pageMetaFor(settings.packagesTitle, settings.packagesDescription, settings) };
  },
  component: PackagesPage,
  // The ruled skeleton grammar (#164 Round 5): client navigations only —
  // first loads are server-rendered (the M5 freshness rule); judge by
  // throttling in devtools while clicking between pages.
  pendingComponent: PackagesSkeleton,
});

function PackagesPage() {
  // The ?empty=1 judging aid (M7 #223): DEV-gated — production builds
  // answer false by construction, so the aid never ships. The hooks run
  // unconditionally (rules of hooks); the gate renders after them.
  const isEmpty = isEmptyJudgingParam(import.meta.env.DEV, useLocation().searchStr);
  // The API serves only ACTIVE packages here; inactive are invisible
  // (landing CONTEXT.md: Deactivated (Service Package)).
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { settings } = Route.useLoaderData();

  if (isEmpty || packages.length === 0) {
    // The ruled whole-page empty line (#164 Round 5): the M5 line + the
    // Back-to-home outline CTA; the h1 rides the settings title.
    return (
      <div className='mx-auto max-w-5xl px-6 py-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.packagesTitle}
        </h1>
        <p className='text-muted-foreground mt-6'>
          No packages to show right now — check back soon.
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
      {/* The ruled intro (#164 Round 3): the Services-page shape — h1 +
          description from settings, defaults being the Round-3-ratified
          draft. */}
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-brand-ink dark:text-foreground'>
          {settings.packagesTitle}
        </h1>
        {settings.packagesDescription && (
          <p className='mt-2 max-w-prose text-muted-foreground'>{settings.packagesDescription}</p>
        )}
      </section>
      <section className='mx-auto max-w-5xl px-6 pt-8 pb-16'>
        <CatalogPlates strip={packages} />
      </section>
    </div>
  );
}
