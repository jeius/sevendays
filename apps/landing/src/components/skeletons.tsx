import { Skeleton } from '@sevendays/ui/components/skeleton';
import { cn } from 'cn';
import { spanFor } from '../lib/mosaic';

// The skeleton grammar (#164 Round 5, owner-ruled: "emphasize the loading
// skeletons a little bit" → the brand-tinted sweep): structure-only
// silhouettes per surface on the shared Tier-1 skeleton primitive — no
// per-element spinners, first loads server-rendered; these render as route
// pendingComponents on client navigations. The .skeleton-grammar wrapper
// (styles.css) rides the sweep over every skeleton inside it. Home is
// #223's silhouette; the per-surface skeletons (#224's surfaces) join
// their surfaces at #224.
const SLOTS_8 = [1, 2, 3, 4, 5, 6, 7, 8];

export function HomeSkeleton() {
  return (
    <div className='skeleton-grammar'>
      <div className='mx-auto max-w-5xl px-6 py-24 md:py-36'>
        <Skeleton className='h-3.5 w-44' />
        <Skeleton className='mt-4 h-12 w-full max-w-2xl' />
        <Skeleton className='mt-5 h-5 w-full max-w-prose' />
        <Skeleton className='mt-8 h-11 w-36' />
      </div>
      <div className='mx-auto max-w-5xl px-6 py-16'>
        <Skeleton className='h-9 w-32' />
        <div className='mt-8 grid auto-rows-[9rem] grid-cols-2 gap-4 md:auto-rows-[11rem] md:grid-cols-4'>
          {SLOTS_8.map((slot) => (
            <Skeleton key={slot} className={cn('h-full w-full rounded-xl', spanFor(slot - 1))} />
          ))}
        </div>
      </div>
      <div className='mx-auto max-w-5xl px-6 pt-16'>
        <Skeleton className='h-9 w-48' />
        <Skeleton className='mt-8 h-56 w-full rounded-xl md:h-[22rem]' />
        <div className='flex justify-center py-8'>
          <Skeleton className='h-0.5 w-16 rounded-full' />
        </div>
        <Skeleton className='h-56 w-full rounded-xl md:h-[22rem]' />
      </div>
      <div className='border-line-soft border-y bg-wash-b px-6 py-16'>
        <div className='mx-auto max-w-5xl'>
          <Skeleton className='h-9 w-36' />
          <div className='mt-8 grid gap-8 md:grid-cols-5'>
            <Skeleton className='h-24 w-full md:col-span-3' />
            <div className='flex flex-col gap-6 md:col-span-2'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
