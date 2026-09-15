import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/')({
  head: () => ({ meta: [{ title: 'Dashboard | Sevendays Admin' }] }),
  component: DashboardPage,
});

function DashboardPage() {
  // The honest empty state (#93): the appointments dashboard — its cards,
  // filters, and table — is v2 payload, created wholesale then. Nothing
  // dashboard-shaped ships in v1, so this screen ships empty on purpose.
  return (
    <StubScreen
      title='Dashboard'
      blurb='This screen ships empty for now — the appointments dashboard arrives with v2.'
      milestone='v2'
    />
  );
}
