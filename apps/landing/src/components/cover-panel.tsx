import { cn } from 'cn';

// The cover rule (M5 ticket #142): coverImageUrl present → the CMS-bound
// photo (object-cover, alt = the package name, lazy); null → today's
// initials placeholder VERBATIM, so the CDP assertion "placeholder ⇔ no
// cover" stays meaningful. `className` re-boxes both branches (cn is a
// tailwind-merge engine: the surface's classes override the defaults) —
// list/detail keep the h-40 card box, home-featured goes edge-to-edge.
// #97: the deep-petrol media gradient is the atmosphere's accent lane
// (deep petrol = media gradients only) — dark stops (600→800→deep) keep
// the white text AA on every stop.
export function CoverPanel({
  name,
  coverImageUrl,
  className,
}: {
  name: string;
  coverImageUrl: string | null;
  className?: string;
}) {
  if (coverImageUrl) {
    return (
      <img
        src={coverImageUrl}
        alt={name}
        loading='lazy'
        className={cn('h-40 w-full rounded-lg object-cover', className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex h-40 flex-col items-center justify-center gap-1 rounded-lg bg-[linear-gradient(135deg,var(--brand-600),var(--brand-800),var(--brand-deep))]',
        className
      )}
    >
      <span className='font-bold text-3xl text-white'>{initialsOf(name)}</span>
      <span className='text-white/85 text-xs'>Cover photo coming soon</span>
    </div>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
