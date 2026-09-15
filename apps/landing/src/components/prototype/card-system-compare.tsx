import type {
  Branch,
  ServicePackageWithInclusions,
  StudioServiceWithBranches,
} from '@sevendays/types';
import { cn } from 'cn';
import {
  CARD_GRID,
  PrototypeBranchCard,
  PrototypePackageCard,
  PrototypeServiceCard,
  PrototypeStripItem,
} from './card-system';

// PROTOTYPE (#111) Track 2 — one card system, two densities, real seeded
// data. The uniformity mechanics are the ruling surface: 1-line titles,
// clamp-2 descriptions, fixed media heights, first-3 chips + "+K" click
// popover. Density AND title register ride together (d92 = serif titles,
// tight = sans) so the owner can rule both axes from one look.

function branchNamesFor(service: StudioServiceWithBranches, branches: Branch[]) {
  return branches.filter((b) => service.bookableBranchIds.includes(b.id)).map((b) => b.name);
}

export function CardSystemCompare({
  packages,
  services,
  branches,
}: {
  packages: ServicePackageWithInclusions[];
  services: StudioServiceWithBranches[];
  branches: Branch[];
}) {
  const [pkg, svc] = [packages[0], services[0]];
  const svcBranches = svc ? branchNamesFor(svc, branches) : [];
  const branch = branches[0];

  return (
    <section className='mx-auto mt-16 max-w-5xl px-6' data-track='cards'>
      <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
        Track 2 — the card system
      </p>
      <h2 className='mt-2 font-semibold font-serif text-3xl text-foreground'>
        One card system, two densities
      </h2>
      <div className='mt-5 rounded-xl border border-line-soft bg-card p-5'>
        <p className='text-foreground text-sm'>
          The ruled mechanics, applied to every card type: <strong>1-line titles</strong>,{' '}
          <strong>clamp-2 descriptions</strong>, <strong>fixed media heights</strong>, and{' '}
          <strong>first-3 chips + a “+K” chip that opens a click popover</strong> (click one —
          mobile-safe, Base UI popover; the first card's popover renders OPEN as the demo). Registry
          note: <code>popover</code> was not in the pulled Tier-1 list; pulling it into{' '}
          <code>@sevendays/ui</code> is a recorded registry addition (#111).
        </p>
      </div>

      {/* Density 1 — the #92 mock's relaxed pass */}
      <h3 className='mt-10 font-semibold font-serif text-2xl text-foreground'>
        Density 1 — the #92 pass (3-col, p-5, serif titles)
      </h3>
      <div className={cn(CARD_GRID.d92, 'mt-5')}>
        {pkg && <PrototypePackageCard pkg={pkg} density='d92' demoOpen />}
        {svc && <PrototypeServiceCard service={svc} branchNames={svcBranches} density='d92' />}
        {branch && <PrototypeBranchCard branch={branch} density='d92' />}
      </div>
      <div className={cn(CARD_GRID.d92, 'mt-5')}>
        {packages.slice(1, 4).map((p) => (
          <PrototypePackageCard key={p.id} pkg={p} density='d92' />
        ))}
      </div>

      {/* Density 2 — the tighter comparator */}
      <h3 className='mt-12 font-semibold font-serif text-2xl text-foreground'>
        Density 2 — tighter (3-col, p-3.5, sans titles)
      </h3>
      <div className={cn(CARD_GRID.tight, 'mt-5')}>
        {pkg && <PrototypePackageCard pkg={pkg} density='tight' />}
        {svc && <PrototypeServiceCard service={svc} branchNames={svcBranches} density='tight' />}
        {branch && <PrototypeBranchCard branch={branch} density='tight' />}
      </div>
      <div className={cn(CARD_GRID.tight, 'mt-5')}>
        {packages.slice(0, 3).map((p) => (
          <PrototypePackageCard key={p.id} pkg={p} density='tight' />
        ))}
      </div>

      {/* The compact strip item — the system's home-teaser shape */}
      <h3 className='mt-12 font-semibold font-serif text-2xl text-foreground'>
        Compact strip item (home teasers)
      </h3>
      <div className='mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {services.slice(0, 4).map((s) => (
          <PrototypeStripItem
            key={s.id}
            title={s.name}
            meta={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(
              s.priceCents / 100
            )}
            chips={branchNamesFor(s, branches)}
            search={{ service: s.id }}
          />
        ))}
      </div>
    </section>
  );
}
