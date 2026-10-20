import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { HomeImageLed } from '../components/home-image-led';
import { HomeSkeleton } from '../components/skeletons';
import {
  galleryQueries,
  servicePackageQueries,
  siteSettingsQueries,
  studioServiceQueries,
  testimonialQueries,
} from '../lib/queries';

// Home wears the ruled #164 composition (built M7 #223): hero under the
// glass bar → the live mosaic gallery → D2 featured plates → the services
// marquee → REAL paginated testimonials → the emphasis strip. The loader
// ensures all four reads + the chrome's settings (the root loader already
// ensured settings; this ensure is idempotent cache-wise and keeps the
// route honest standalone).
export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(siteSettingsQueries.all()),
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(galleryQueries.all()),
      queryClient.ensureQueryData(testimonialQueries.all()),
    ]);
  },
  component: HomePage,
  // The skeleton grammar (#164 Round 5): client navigations only — first
  // loads are server-rendered (the M5 freshness rule); judge by throttling
  // in devtools while clicking between pages.
  pendingComponent: HomeSkeleton,
});

function HomePage() {
  const { data: settings } = useSuspenseQuery(siteSettingsQueries.all());
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: gallery } = useSuspenseQuery(galleryQueries.all());
  const { data: testimonials } = useSuspenseQuery(testimonialQueries.all());

  return (
    <HomeImageLed
      settings={settings}
      packages={packages}
      services={services}
      gallery={gallery}
      testimonials={testimonials}
    />
  );
}
