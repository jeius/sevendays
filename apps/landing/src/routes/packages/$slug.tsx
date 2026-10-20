import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { createFileRoute } from '@tanstack/react-router';
import { PackageDetail } from '../../components/package-detail';
import { PackageDetailSkeleton } from '../../components/skeletons';
import { toNotFoundError } from '../../lib/package-slug';
import { pageMetaFor } from '../../lib/page-head';
import { servicePackageQueries, siteSettingsQueries } from '../../lib/queries';

export const Route = createFileRoute('/packages/$slug')({
  loader: async ({ params, context: { queryClient } }) => {
    // The never-throwing settings ensure (#215's law): a dead settings read
    // degrades the head to code defaults; the package read still owns its
    // own failure (the global NotFound below).
    const settings = await queryClient
      .ensureQueryData(siteSettingsQueries.all())
      .catch(() => SITE_SETTINGS_DEFAULTS);
    try {
      const pkg = await queryClient.ensureQueryData(servicePackageQueries.bySlug(params.slug));
      return { pkg, settings };
    } catch (err) {
      throw toNotFoundError(err);
    }
  },
  head: ({ loaderData }) => {
    const pkg = loaderData?.pkg;
    const settings = loaderData?.settings ?? SITE_SETTINGS_DEFAULTS;
    // The detail's title is the package's own name and its description the
    // entity's (the spec's page-titles law governs the five pages; the
    // detail composes through the same seam for the brand suffix).
    return { meta: pageMetaFor(pkg?.name ?? null, pkg?.description ?? null, settings) };
  },
  component: PackageDetailPage,
  // The ruled skeleton grammar (#164 Round 5): client navigations only —
  // first loads are server-rendered (the M5 freshness rule).
  pendingComponent: PackageDetailSkeleton,
  // Unknown/inactive slug → the router's notFound() — the ROOT's global
  // NotFound answers (M7 #223; the route-level override is gone).
});

function PackageDetailPage() {
  const { pkg } = Route.useLoaderData();
  return <PackageDetail pkg={pkg} />;
}
