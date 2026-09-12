// PROTOTYPE (throwaway) — wayfinder #57: brand → shadcn token unification.
// Renders representative shadcn-style components using ONLY semantic tokens
// so the preset mapping can be judged on real UI. Not linked from any nav.
// Delete this file when the design-system milestone work lands.
import { createFileRoute } from '@tanstack/react-router';
import { SiteHeader } from '../components/site-header';

export const Route = createFileRoute('/prototype-tokens')({
  component: PrototypeTokensPage,
});

function PrototypeTokensPage() {
  return (
    <div className='mx-auto max-w-5xl p-6 pb-24' data-prototype-tokens>
      <SiteHeader />

      <header className='mt-10'>
        <p className='text-muted-foreground text-xs font-bold tracking-[0.16em] uppercase'>
          Wayfinder #57 · Preset b1uGsTYZ6
        </p>
        <h1 className='text-foreground mt-2 font-serif text-5xl font-bold'>
          Sevendays Photography
        </h1>
        <p className='text-foreground mt-3 max-w-prose'>
          Display headings render in Fraunces via <code>font-serif</code>; this body copy renders in
          Figtree via <code>font-sans</code>. Every color below is a semantic token — react to the
          mapping, not to individual hex values.
        </p>
      </header>

      <section className='mt-10'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>Buttons</h2>
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            className='bg-primary text-primary-foreground focus-visible:ring-ring rounded-md px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
          >
            Book now
          </button>
          <button
            type='button'
            className='bg-secondary text-secondary-foreground rounded-md px-4 py-2 text-sm font-medium'
          >
            Secondary
          </button>
          <button
            type='button'
            className='border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground rounded-md border px-4 py-2 text-sm font-medium'
          >
            Outline
          </button>
          <button
            type='button'
            className='text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 text-sm font-medium'
          >
            Ghost
          </button>
          <button
            type='button'
            className='rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white'
          >
            Destructive
          </button>
          <button
            type='button'
            disabled
            className='bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium opacity-50'
          >
            Disabled
          </button>
        </div>
      </section>

      <section className='mt-10 grid gap-6 md:grid-cols-2'>
        <div>
          <h2 className='text-foreground font-serif text-2xl font-semibold'>Package card</h2>
          <article className='bg-card text-card-foreground mt-4 flex flex-col gap-3 rounded-xl border p-6 shadow-sm'>
            <div className='bg-secondary aspect-[4/3] rounded-lg' />
            <h3 className='font-serif text-2xl font-semibold'>Signature Portrait</h3>
            <p className='text-foreground text-lg font-semibold'>₱3,500</p>
            <p className='text-muted-foreground text-sm'>
              A 90-minute session at any branch: one outfit change, guided posing, and twenty
              hand-edited photos delivered in seven days.
            </p>
            <button
              type='button'
              className='bg-primary text-primary-foreground mt-2 rounded-md px-4 py-2 text-center text-sm font-medium'
            >
              Book now
            </button>
          </article>
        </div>

        <div>
          <h2 className='text-foreground font-serif text-2xl font-semibold'>Form</h2>
          <div className='mt-4 flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <label htmlFor='proto-name' className='text-foreground text-sm font-medium'>
                Full name
              </label>
              <input
                id='proto-name'
                type='text'
                placeholder='Juan dela Cruz'
                className='border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none'
              />
              <p className='text-muted-foreground text-xs'>Helper text in muted-foreground.</p>
            </div>
            <div className='flex flex-col gap-2'>
              <label htmlFor='proto-email' className='text-foreground text-sm font-medium'>
                Email
              </label>
              <input
                id='proto-email'
                type='email'
                defaultValue='not-an-email'
                className='rounded-md border border-destructive bg-background px-3 py-2 text-sm text-destructive focus-visible:ring-destructive focus-visible:ring-2 focus-visible:outline-none'
              />
              <p className='text-xs text-destructive'>Enter a valid email address.</p>
            </div>
          </div>

          <h2 className='text-foreground mt-8 font-serif text-2xl font-semibold'>Badges</h2>
          <div className='mt-4 flex flex-wrap gap-2'>
            <span className='bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
              Confirmed
            </span>
            <span className='bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
              Pending
            </span>
            <span className='border-border text-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium'>
              Walk-in
            </span>
          </div>
        </div>
      </section>

      <section className='mt-10'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Chart palette (CSS stand-in)
        </h2>
        <div className='bg-card mt-4 flex h-40 items-end gap-3 rounded-xl border p-6'>
          <div className='bg-chart-1 h-3/5 w-full rounded-t-sm' title='chart-1' />
          <div className='bg-chart-2 h-2/5 w-full rounded-t-sm' title='chart-2' />
          <div className='bg-chart-3 h-4/5 w-full rounded-t-sm' title='chart-3' />
          <div className='bg-chart-4 h-3/5 w-full rounded-t-sm' title='chart-4' />
          <div className='bg-chart-5 h-2/5 w-full rounded-t-sm' title='chart-5' />
        </div>
        <p className='text-muted-foreground mt-2 text-xs'>
          chart-1…chart-5, left to right. The brand has no five-hue ramp — these fallbacks are a
          brand tonal ramp unless the preset supplied its own.
        </p>
      </section>

      <section className='mt-10'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>Admin sidebar mock</h2>
        <aside className='bg-sidebar mt-4 w-64 rounded-xl border border-sidebar-border p-3'>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground rounded-lg px-3 py-2 font-serif font-bold'>
            Sevendays Admin
          </div>
          <nav className='mt-3 flex flex-col gap-1'>
            <span className='bg-sidebar-accent text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm font-medium'>
              Dashboard
            </span>
            <span className='text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm'>
              Appointments
            </span>
            <span className='text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm'>
              Packages
            </span>
            <span className='text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm'>
              Branches
            </span>
          </nav>
        </aside>
      </section>

      <section className='mt-10'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Brand primitives (fixed inputs)
        </h2>
        <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7'>
          <Swatch cls='bg-sea-ink' label='sea-ink' sub='text' />
          <Swatch cls='bg-sea-ink-soft' label='sea-ink-soft' sub='muted text' />
          <Swatch cls='bg-lagoon' label='lagoon' sub='bright accent' />
          <Swatch cls='bg-lagoon-deep' label='lagoon-deep' sub='interactive' />
          <Swatch cls='bg-palm' label='palm' sub='kicker green' />
          <Swatch cls='bg-sand' label='sand' sub='soft surface' />
          <Swatch cls='bg-foam' label='foam' sub='lightest surface' />
        </div>
      </section>

      <footer className='mt-12 border-t border-border pt-4'>
        <p className='text-muted-foreground text-xs'>
          Prototype for wayfinder #57 — preset b1uGsTYZ6 applied 2026-09-12. Throwaway: this route
          never ships.
        </p>
      </footer>
    </div>
  );
}

function Swatch({ cls, label, sub }: { cls: string; label: string; sub: string }) {
  return (
    <figure>
      <div className={`h-16 rounded-lg border border-border ${cls}`} />
      <figcaption className='mt-1 text-xs'>
        <span className='text-foreground font-medium'>{label}</span>{' '}
        <span className='text-muted-foreground'>({sub})</span>
      </figcaption>
    </figure>
  );
}
