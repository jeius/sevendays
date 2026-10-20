import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { Phone } from 'lucide-react';

// Branded global 404 (#164 Round 1, owner-ruled: white body, no logo — the
// earlier ink field left a light band above the footer on tall desktop
// viewports, so min-h-full makes the white own the page's full stretch
// between header and footer; dark returns the ink field — the ruled
// pre-light look). GLOBAL at __root (M7 #223): the two route-level
// notFound() overrides are gone — unknown routes AND unknown/inactive
// slugs/ids all wear this one surface. Copy is the prototype's DRAFT —
// TODO(owner-copy), the round ratifies.
export function NotFound() {
  return (
    <div className='min-h-full bg-white dark:bg-brand-ink'>
      <div className='mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-24 md:py-32'>
        {/* TODO(owner-copy): headline + body — the prototype drafts, the round ratifies. */}
        <h1 className='max-w-2xl font-bold font-serif text-4xl text-brand-ink md:text-5xl dark:text-foreground'>
          This page never developed.
        </h1>
        <p className='max-w-xl text-muted-foreground'>
          The page you're looking for doesn't exist or has moved. The rest of the studio is right
          where you left it.
        </p>
        <div className='flex flex-wrap gap-3'>
          <Link
            to='/'
            className={cn(
              buttonVariants(),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Back to home
          </Link>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <Phone className='size-4' aria-hidden='true' />
            Call or visit a branch
          </Link>
        </div>
      </div>
    </div>
  );
}
