// The packages layout (M5 #139, /packages): a pure Outlet. The table page is
// the index child (_shell.packages.index.tsx); the editor routes
// (_shell.packages.new.tsx, _shell.packages.$packageId.edit.tsx) are its
// sibling children. Found live during Task 7's evidence run: with the table
// rendered directly in THIS file and no Outlet, the child routes MATCHED
// (router state: success) but could never mount — /packages/new and the edit
// route fuzzy-fell back to the table view.
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_shell/packages')({
  head: () => ({ meta: [{ title: 'Packages | Sevendays Admin' }] }),
  component: PackagesLayout,
});

function PackagesLayout() {
  return <Outlet />;
}
