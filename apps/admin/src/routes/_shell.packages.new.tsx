// The create-package route (M5 #139, /packages/new): the full editor in
// create mode over live lookups. No package query and NO Advanced card — the
// server generates the slug at create (AQ-6). The gate lives on `_shell`
// (no per-route beforeLoad).
import { createFileRoute } from '@tanstack/react-router';
import { PackageEditor } from '#/components/packages/package-editor';

export const Route = createFileRoute('/_shell/packages/new')({
  head: () => ({ meta: [{ title: 'New package | Sevendays Admin' }] }),
  component: NewPackagePage,
});

function NewPackagePage() {
  return <PackageEditor mode='create' />;
}
