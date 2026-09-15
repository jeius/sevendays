import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About | Sevendays Photography' }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='text-brand-ink font-bold text-4xl'>About</h1>
        {/* TODO(owner-copy): static studio story — replaced when the client supplies copy. */}
        <p className='text-muted-foreground mt-4 max-w-prose'>Our studio story is coming soon.</p>
      </section>
      <section className='mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12'>
        <h2 className='text-brand-ink font-semibold text-2xl'>Testimonials</h2>
        {/* TODO(owner-copy): testimonial placeholders — client copy pending. M5 drop-in slot. */}
        <p className='text-muted-foreground mt-2'>What clients say is coming soon.</p>
      </section>
      <section className='mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12 pb-12'>
        <h2 className='text-brand-ink font-semibold text-2xl'>Portfolio</h2>
        {/* Empty M5 drop-in slot: portfolio items render here when content lands. */}
        <div className='mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3' data-portfolio-grid />
      </section>
    </div>
  );
}
