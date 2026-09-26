// The edit-package route (M5 #139, /packages/$packageId/edit): the full
// editor in edit mode; the route's param typing validates the id as a uuid
// and feeds adminPackageQueries.byId. The gate lives on `_shell` (no
// per-route beforeLoad). key={packageId} remounts per package so the editor
// state never straddles two reads.
import { createFileRoute } from '@tanstack/react-router';
import { PackageEditor } from '#/components/packages/package-editor';

export const Route = createFileRoute('/_shell/packages/$packageId/edit')({
  head: () => ({ meta: [{ title: 'Edit package | Sevendays Admin' }] }),
  component: EditPackagePage,
});

function EditPackagePage() {
  const { packageId } = Route.useParams();
  return <PackageEditor mode='edit' packageId={packageId} key={packageId} />;
}
