import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/studio-services')({
  head: () => ({ meta: [{ title: 'Studio services | Sevendays Admin' }] }),
  component: StudioServicesPage,
});

function StudioServicesPage() {
  return (
    <StubScreen
      title='Studio services'
      blurb='Studio services catalog (Photo Recovery, Tarpaulin & Bulletin Printing, …) and per-branch bookability. M5 CMS surface.'
      milestone='M5'
    />
  );
}
