import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { CardSystemCompare } from '../components/prototype/card-system-compare';
import { ChromeVariants } from '../components/prototype/chrome-variants';
import { branchQueries, servicePackageQueries, studioServiceQueries } from '../lib/queries';

// PROTOTYPE (#111) — the remediation ruling surface (Tracks 2 + 3). Not
// linked from any nav; throwaway on prototype/98-landing-remediation, in
// the house style of /prototype-tokens (deleted when the rulings land).
// Track 1 (home ×2) lives on / via ?variant=a|b.

export const Route = createFileRoute('/prototype-remediation')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(branchQueries.all()),
    ]);
  },
  component: PrototypeRemediation,
});

function PrototypeRemediation() {
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  return (
    <div className='min-h-screen bg-background pb-24'>
      <header className='mx-auto max-w-5xl px-6 pt-12'>
        <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
          #111 · UI remediation prototype · throwaway
        </p>
        <h1 className='mt-2 font-bold font-serif text-4xl text-foreground'>The ruling surface</h1>
        <p className='mt-3 max-w-prose text-muted-foreground'>
          Tracks 2 and 3 of the remediation prototype: the unified card system at two densities, and
          the chrome text treatments with re-measured AA pairs. Track 1 (the image-led home, two
          compositions) lives on <code>/?variant=a</code> and <code>/?variant=b</code>. Stand-in
          photos + DRAFT copy throughout — nothing here is production; the owner's reactions become
          the rulings.
        </p>
      </header>

      <CardSystemCompare packages={packages} services={services} branches={branches} />
      <ChromeVariants />

      <footer className='mx-auto mt-16 max-w-5xl border-border border-t px-6 pt-4'>
        <p className='text-muted-foreground text-xs'>
          Prototype artifact (#111) — deleted with the rulings pass. Seams untouched; the default
          routes render exactly as landed.
        </p>
      </footer>
    </div>
  );
}
