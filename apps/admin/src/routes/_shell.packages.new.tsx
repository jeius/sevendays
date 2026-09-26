// The create-package route (M5 #139, /packages/new): lands in Task 5 as a
// minimal stub (PD6 route-order ruling) so the table's typed Links validate
// against the registered tree — the editor composition replaces it in Task 6.
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '#/components/cms/shared';

export const Route = createFileRoute('/_shell/packages/new')({
  head: () => ({ meta: [{ title: 'New package | Sevendays Admin' }] }),
  component: NewPackagePage,
});

function NewPackagePage() {
  // Task 6 replaces this stub body
  return <PageHeader title='New package' />;
}
