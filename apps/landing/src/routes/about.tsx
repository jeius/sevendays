import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About | Sevendays Photography' }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold text-4xl text-brand-ink'>About</h1>
        {/* TODO(owner-copy): static studio story — replaced when the client supplies copy. */}
        <p className='mt-4 max-w-prose text-muted-foreground'>Our studio story is coming soon.</p>
      </section>
      <section className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12'>
        <h2 className='font-semibold text-2xl text-brand-ink'>Testimonials</h2>
        {/* TODO(owner-copy): testimonial placeholders — client copy pending. M5 drop-in slot. */}
        <p className='mt-2 text-muted-foreground'>What clients say is coming soon.</p>
      </section>
      <section className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12 pb-12'>
        <h2 className='font-semibold text-2xl text-brand-ink'>Portfolio</h2>
        {/* Empty M5 drop-in slot: portfolio items render here when content lands. */}
        <div className='mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3' data-portfolio-grid />
      </section>
    </div>
  );
}
