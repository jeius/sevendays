import { createFileRoute, useRouteContext } from '@tanstack/react-router';
import { SettingsScreen } from '#/components/settings/settings-screen';

export const Route = createFileRoute('/_shell/settings')({
  head: () => ({ meta: [{ title: 'Settings | Sevendays Admin' }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useRouteContext({ from: '/_shell' });
  return <SettingsScreen user={user} />;
}
