import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/settings')({
  head: () => ({ meta: [{ title: 'Settings | Sevendays Admin' }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <StubScreen
      title='Settings'
      blurb='Admin settings — surfaces with M4 admin auth (staff accounts and sessions). Shape TBD by that milestone.'
      milestone='M4'
    />
  );
}
