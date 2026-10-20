import { createFileRoute } from '@tanstack/react-router';
import { PackageCard } from '../../components/package-card';
import { toNotFoundError } from '../../lib/package-slug';
import { servicePackageQueries } from '../../lib/queries';

export const Route = createFileRoute('/packages/$slug')({
  loader: async ({ params, context: { queryClient } }) => {
    // Unknown/inactive slug → the router's notFound() — the ROOT's global
    // NotFound answers (M7 #223; the route-level override is gone).
    try {
      return await queryClient.ensureQueryData(servicePackageQueries.bySlug(params.slug));
    } catch (err) {
      throw toNotFoundError(err);
    }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.name ?? 'Package'} | Sevendays Photography` }],
  }),
  component: PackageDetail,
});

function PackageDetail() {
  const pkg = Route.useLoaderData();

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <div className='mx-auto max-w-2xl'>
          <PackageCard pkg={pkg} cta='detail' />
        </div>
      </section>
    </div>
  );
}
