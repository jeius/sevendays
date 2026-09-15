import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/add-ons')({
  head: () => ({ meta: [{ title: 'Add-ons | Sevendays Admin' }] }),
  component: AddOnsPage,
});

function AddOnsPage() {
  return (
    <StubScreen
      title='Add-ons'
      blurb='Add-on services (Makeup, Hairstyle, …) and which studio services they apply to. M5 CMS surface.'
      milestone='M5'
    />
  );
}
