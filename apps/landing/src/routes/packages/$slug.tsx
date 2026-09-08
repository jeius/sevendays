import { createFileRoute } from '@tanstack/react-router';
import { PackageCard } from '../../components/package-card';
import { SiteHeader } from '../../components/site-header';
import { toNotFoundError } from '../../lib/package-slug';
import { servicePackageQueries } from '../../lib/queries';

export const Route = createFileRoute('/packages/$slug')({
  loader: async ({ params, context: { queryClient } }) => {
    try {
      return await queryClient.ensureQueryData(servicePackageQueries.bySlug(params.slug));
    } catch (err) {
      throw toNotFoundError(err);
    }
  },
  component: PackageDetail,
  // Unknown/inactive slug → uniform not-found (owner-ratified copy).
  notFoundComponent: () => (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <div className='mt-16 flex flex-col items-center gap-4'>
        <h1 className='font-semibold text-2xl'>Package not found.</h1>
        {/* Plain anchor: keeps the not-found page dependency-free. */}
        <a href='/packages' className='underline'>
          Browse all packages
        </a>
      </div>
    </div>
  ),
});

function PackageDetail() {
  const pkg = Route.useLoaderData();

  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <div className='mx-auto mt-10 max-w-2xl'>
        <PackageCard pkg={pkg} />
      </div>
    </div>
  );
}
