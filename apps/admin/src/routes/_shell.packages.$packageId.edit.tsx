// The edit-package route (M5 #139, /packages/$packageId/edit): the full
// editor in edit mode; the route's param typing validates the id as a uuid
// and feeds adminPackageQueries.byId. The gate lives on `_shell` (no
// per-route beforeLoad). key={packageId} remounts per package so the editor
// state never straddles two reads.
import { createFileRoute } from '@tanstack/react-router';
import { PackageEditor } from '#/components/packages/package-editor';
import { cmsRoutePriming, primeCmsQueries } from '#/lib/cms-queries';

export const Route = createFileRoute('/_shell/packages/$packageId/edit')({
  head: () => ({ meta: [{ title: 'Edit package | Sevendays Admin' }] }),
  // M8 #288: hover-intent priming, the byId read + both lookups start
  // while the edit link is hovered (fire-and-forget, never blocks).
  loader: ({ context: { queryClient }, params }) => {
    primeCmsQueries(cmsRoutePriming.packageEdit(queryClient, params.packageId));
  },
  component: EditPackagePage,
});

function EditPackagePage() {
  const { packageId } = Route.useParams();
  return <PackageEditor mode='edit' packageId={packageId} key={packageId} />;
}
