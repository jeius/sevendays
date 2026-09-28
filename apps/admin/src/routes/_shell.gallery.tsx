// The gallery route (M5 #141, Task 7): the gated shell's gallery entry
// point. The route mounts the pinned PageHeader + GalleryScreen — its
// `Upload photos` action is a label wired by htmlFor to the hidden file
// input that lives INSIDE the screen, so this file holds no logic beyond
// the render (the tray state is the screen's).
import { Button } from '@sevendays/ui/components/button';
import { createFileRoute } from '@tanstack/react-router';
import { ImagePlus } from 'lucide-react';
import { PageHeader } from '#/components/cms/shared';
import { GalleryScreen } from '#/components/gallery/gallery-screen';

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
        actions={
          // The label/htmlFor pair opens the screen's hidden input — the id
          // is this file's one coupling point (zero route logic). The label
          // carries the button's render prop: Base UI merges the Button's
          // classes/props onto it. nativeButton={false} tells Base UI the
          // render target is not a native <button> (suppresses the dev-mode
          // console error and applies the full useButton keyboard state),
          // and tabIndex={0} gives the label its tab stop.
          <Button
            nativeButton={false}
            render={
              <label
                htmlFor='gallery-upload-input'
                className='cursor-pointer'
                // biome-ignore lint/a11y/noNoninteractiveTabindex: this label is a Base UI <Button> render target (nativeButton={false}) — an interactive control at runtime, so it needs its own tab stop
                tabIndex={0}
              >
                <ImagePlus aria-hidden='true' />
                Upload photos
              </label>
            }
          />
        }
      />
      <GalleryScreen />
    </>
  );
}
