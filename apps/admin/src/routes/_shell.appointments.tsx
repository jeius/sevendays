import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/appointments')({
  head: () => ({ meta: [{ title: 'Appointments | Sevendays Admin' }] }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  return (
    <StubScreen
      title='Appointments'
      blurb='The bookings worklist — list, branch/status filters, status updates. The real surface is the appointments dashboard, now v2 payload.'
      milestone='v2'
    />
  );
}
