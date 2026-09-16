import { buttonVariants } from '@sevendays/ui/components/button';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { PackageCard } from '../../components/package-card';
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
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.name ?? 'Package'} | Sevendays Photography` }],
  }),
  component: PackageDetail,
  // Unknown/inactive slug → uniform not-found (owner-ratified copy).
  notFoundComponent: () => (
    <div className='mx-auto max-w-5xl px-6 pt-12'>
      <div className='flex flex-col items-center gap-4 rounded-xl border border-brand-gray-cool bg-card p-10 text-center shadow-sm'>
        <h1 className='font-bold text-3xl text-brand-ink'>Package not found.</h1>
        <p className='text-muted-text text-base'>
          The package you are looking for does not exist or is no longer offered.
        </p>
        <Link
          to='/packages'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          )}
        >
          Browse all packages
        </Link>
      </div>
    </div>
  ),
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
