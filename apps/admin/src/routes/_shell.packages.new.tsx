// The create-package route (M5 #139, /packages/new): the full editor in
// create mode over live lookups. No package query and NO Advanced card — the
// server generates the slug at create (AQ-6). The gate lives on `_shell`
// (no per-route beforeLoad).
import { createFileRoute } from '@tanstack/react-router';
import { PackageEditor } from '#/components/packages/package-editor';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

export const Route = createFileRoute('/_shell/packages/new')({
  head: () => ({ meta: [{ title: 'New package | Sevendays Admin' }] }),
  // M8 #288: hover-intent priming — create mode loads the lookups only
  // (fire-and-forget, never blocks).
  loader: ({ context: { queryClient } }) => {
    primeCmsQueries(cmsRoutePriming.packageNew(queryClient));
  },
  component: NewPackagePage,
});

function NewPackagePage() {
  return <PackageEditor mode='create' />;
}
