import { createFileRoute } from '@tanstack/react-router';
import { StubScreen } from '#/components/stub-screen';

export const Route = createFileRoute('/_shell/branches')({
  head: () => ({ meta: [{ title: 'Branches | Sevendays Admin' }] }),
  component: BranchesPage,
});

function BranchesPage() {
  return (
    <StubScreen
      title='Branches'
      blurb='Branch info editing — name, address, phone, walk-in flag, business hours, slot capacity. M5 CMS surface.'
      milestone='M5'
    />
  );
}
