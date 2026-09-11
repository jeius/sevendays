import { createFileRoute } from '@tanstack/react-router';
import { SiteHeader } from '../components/site-header';

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About | Sevendays Photography' }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <h1 className='mt-10 font-bold text-4xl'>About</h1>
      {/* TODO(owner-copy): static studio story — replaced when the client supplies copy. */}
      <p className='mt-4 text-neutral-700'>Our studio story is coming soon.</p>
      <section className='mt-10'>
        <h2 className='font-semibold text-2xl'>Testimonials</h2>
        {/* TODO(owner-copy): testimonial placeholders — client copy pending. */}
        <p className='mt-2 text-neutral-700'>What clients say is coming soon.</p>
      </section>
      <section className='mt-10'>
        <h2 className='font-semibold text-2xl'>Portfolio</h2>
        {/* Empty M5 drop-in slot: portfolio items render here when content lands. */}
        <div className='mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3' data-portfolio-grid />
      </section>
    </div>
  );
}
