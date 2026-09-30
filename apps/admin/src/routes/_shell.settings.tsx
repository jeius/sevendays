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
      blurb='Admin settings — shape to be charted by an upcoming milestone.'
    />
  );
}
