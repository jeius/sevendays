// The gallery route (M5 #141): the gated shell's gallery entry point. The
// screen (Task 7) will own its state (rail + category panel, upload tray,
// card grid) and take over this render — the route only mounts the pinned
// PageHeader + a temporary placeholder until then.
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '#/components/cms/shared';

export const Route = createFileRoute('/_shell/gallery')({
  head: () => ({ meta: [{ title: 'Gallery | Sevendays Admin' }] }),
  component: GalleryPage,
});

function GalleryPage() {
  return (
    <>
      <PageHeader
        title='Gallery'
        subline='The /about portfolio — upload in batches, organize by category.'
      />
      <p className='text-muted-foreground text-sm'>Screen lands in Task 7.</p>
    </>
  );
}
