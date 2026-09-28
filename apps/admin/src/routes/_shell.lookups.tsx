// The lookups route (M5 #141): the gated shell's lookups entry point. The
// screen (Task 9) will own its state (the two Card sections — print sizes
// + attires) and take over this render — the route only mounts the pinned
// PageHeader + a temporary placeholder until then.
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '#/components/cms/shared';

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
      <p className='text-muted-foreground text-sm'>Screen lands in Task 9.</p>
    </>
  );
}
