// The lookups route (M5 #141, Task 9): the gated shell's lookups entry
// point. The header carries no actions (the New buttons live in the
// sections' CardActions), so it stays here and the screen — two Card
// sections over live PrintSize/Attire rows, full CRUD — mounts under it.
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '#/components/cms/shared';
import { LookupsScreen } from '#/components/lookups/lookups-screen';

export const Route = createFileRoute('/_shell/lookups')({
  head: () => ({ meta: [{ title: 'Lookups | Sevendays Admin' }] }),
  component: LookupsPage,
});

function LookupsPage() {
  return (
    <>
      <PageHeader
        title='Lookups'
        subline='Shared catalog vocabularies used by package inclusions.'
      />
      <LookupsScreen />
    </>
  );
}
