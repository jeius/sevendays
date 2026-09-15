// The admin app shell layout (pathless — no URL segment): everything
// staff-facing renders through it, so M4's login can mount outside it
// without restructuring. Variant A per #59; composition lands with #100's
// shell task.
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_shell')({
  component: ShellLayout,
});

function ShellLayout() {
  return <Outlet />;
}
