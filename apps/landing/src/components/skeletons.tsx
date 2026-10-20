import { Skeleton } from '@sevendays/ui/components/skeleton';
import { cn } from 'cn';
import { spanFor } from '../lib/mosaic';

// The skeleton grammar (#164 Round 5, owner-ruled: "emphasize the loading
// skeletons a little bit" → the brand-tinted sweep): structure-only
// silhouettes per surface on the shared Tier-1 skeleton primitive — no
// per-element spinners, first loads server-rendered; these render as route
// pendingComponents on client navigations. The .skeleton-grammar wrapper
// (styles.css) rides the sweep over every skeleton inside it. Home is
// #223's silhouette; the per-surface skeletons join their surfaces with
// #224 (the catalog pair here; services/branches/about in that task).
const SLOTS_8 = [1, 2, 3, 4, 5, 6, 7, 8];
const SLOTS_6 = [1, 2, 3, 4, 5, 6];
const SLOTS_3 = [1, 2, 3];
const SLOTS_4 = [1, 2, 3, 4];

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

/** The packages index (#164 Round 5, built #224): six plate silhouettes. */
export function PackagesSkeleton() {
  return (
    <div className='skeleton-grammar mx-auto max-w-5xl px-6 py-16'>
      <Skeleton className='h-9 w-44' />
      <div className='mt-8 grid gap-6 sm:grid-cols-2'>
        {SLOTS_6.map((slot) => (
          <div key={slot} className='overflow-hidden rounded-xl border border-line-soft'>
            <Skeleton className='aspect-[4/3] w-full rounded-none' />
            <div className='space-y-2 p-5'>
              <Skeleton className='h-5 w-2/3' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-4/5' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The package detail (#164 Round 5, built #224): plate half + panel half,
 * then the spec-sheet block. */
export function PackageDetailSkeleton() {
  return (
    <div className='skeleton-grammar mx-auto max-w-5xl px-6 pt-8 pb-16'>
      <Skeleton className='h-5 w-28' />
      <div className='mt-6 grid overflow-hidden rounded-xl border border-line-soft md:grid-cols-5'>
        <Skeleton className='min-h-64 w-full rounded-none md:col-span-3 md:min-h-[26rem]' />
        <div className='space-y-3 p-6 md:col-span-2 md:p-8'>
          <Skeleton className='h-8 w-3/4' />
          <Skeleton className='h-5 w-24' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-5/6' />
          <Skeleton className='h-10 w-40' />
        </div>
      </div>
      <div className='mt-10 grid gap-10 md:grid-cols-3 md:gap-8'>
        {SLOTS_3.map((slot) => (
          <div key={slot} className='space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-4/5' />
            <Skeleton className='h-4 w-3/5' />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Services (#164 Round 5, built #224): five image-backed card silhouettes. */
export function ServicesSkeleton() {
  return (
    <div className='skeleton-grammar mx-auto max-w-5xl px-6 py-16'>
      <Skeleton className='h-9 w-36' />
      <div className='mt-8 grid gap-6 sm:grid-cols-2'>
        {SLOTS_4.map((slot) => (
          <Skeleton key={slot} className='h-72 w-full rounded-xl' />
        ))}
      </div>
    </div>
  );
}

/** Branches (#164 Round 5, built #224): three cover-card silhouettes. */
export function BranchesSkeleton() {
  return (
    <div className='skeleton-grammar mx-auto max-w-5xl px-6 py-16'>
      <Skeleton className='h-9 w-40' />
      <div className='mt-8 grid gap-6 sm:grid-cols-2'>
        {SLOTS_3.map((slot) => (
          <div key={slot} className='overflow-hidden rounded-xl border border-line-soft'>
            <Skeleton className='aspect-[16/9] w-full rounded-none' />
            <div className='space-y-2 p-6'>
              <Skeleton className='h-5 w-1/2' />
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-10 w-40' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
