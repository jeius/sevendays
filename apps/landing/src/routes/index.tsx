import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { HomeImageLed } from '../components/home-image-led';
import { servicePackageQueries, studioServiceQueries } from '../lib/queries';

// Home wears the owner-endorsed #111 variant D composition (ruled flip,
// #101): image-led hero → gallery → cover-driven packages → full-image
// services → placeholder testimonials → the #92 emphasis strip. The
// branches body strip is dropped by that ruling — footer + emphasis carry
// branches — and the loader's branch prefetch went with it (the ruled
// composition's only data-layer delta, surfaced in the PR).
export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
    ]);
  },
  component: HomePage,
});

function HomePage() {
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());

  return <HomeImageLed packages={packages} services={services} />;
}
