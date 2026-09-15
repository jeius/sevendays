import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/packages')({
  head: () => ({ meta: [{ title: 'Packages | Sevendays Admin' }] }),
  component: PackagesPage,
});

function PackagesPage() {
  return (
    <StubScreen
      title='Packages'
      blurb='Package catalog CRUD — create, edit, deactivate. Cover-photo uploads land here with M5 CMS and its R2 media bucket.'
      milestone='M5'
    />
  );
}
