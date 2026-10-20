import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';

// Branded global error surface (#164 Round 1; the ink-field family member
// per #223 — ink + logo + a way forward). Dependency-free by contract:
// when this renders, the API may be the thing that failed, so no fetched
// content, no photos — ink, type, and the reload button only. The dev-only
// error line stays (import.meta.env.DEV never ships). Copy is the
// prototype's DRAFT — TODO(owner-copy), the round ratifies.
export function ErrorComponent({ error }: { error: Error }) {
  return (
    <div className='bg-brand-ink'>
      <div className='mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-24 md:py-32'>
        <img src='/photos/sd.png' alt='' aria-hidden='true' className='size-12 rounded-md' />
        {/* TODO(owner-copy): headline + body — the prototype drafts, the round ratifies. */}
        <h1 className='max-w-2xl font-bold font-serif text-4xl text-white md:text-5xl'>
          Something went wrong.
        </h1>
        <p className='max-w-xl text-brand-200'>
          An unexpected error interrupted the page. Try again — or reach the studio directly and
          we'll take it from there.
        </p>
        <div className='flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={() => window.location.reload()}
            className={cn(
              buttonVariants(),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Try again
          </button>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Call or visit a branch
          </Link>
        </div>
        {error instanceof Error && import.meta.env.DEV ? (
          <pre className='max-w-full overflow-auto rounded-md bg-white/5 p-4 text-white/60 text-xs'>
            {error.message}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
