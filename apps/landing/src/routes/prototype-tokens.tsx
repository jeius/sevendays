// M3 living token gallery — renders the live layer (post-swap #96):
// fixed points, derived ramp/states, semantic components, the admin
// tool-neutral reference, and the #92 owner-approved composition +
// atmosphere variants. Not linked from any nav. The close-out ticket
// (#101) deletes this route with the rest of the gallery.
import { createFileRoute } from '@tanstack/react-router';
import { AdminNeutralStrip } from '../components/prototype/admin-neutral';
import { AtmosphereVariants } from '../components/prototype/atmosphere-variants';
import { CompositionMock } from '../components/prototype/composition-mock';
import { SiteHeader } from '../components/site-header';
import { Button } from '@sevendays/ui/components/button';

export const Route = createFileRoute('/prototype-tokens')({
  component: PrototypeTokensPage,
});

function PrototypeTokensPage() {
  return (
    <div className='bg-background min-h-screen pb-24' data-92-frame>
      <SiteHeader />

      <header className='mx-auto mt-10 max-w-5xl px-6'>
        <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
          M3 · The live token layer
        </p>
        <h1 className='text-foreground mt-2 font-serif text-5xl font-bold'>
          Sevendays Photography
        </h1>
        <p className='text-foreground mt-3 max-w-prose'>
          Headings render in Roboto Slab via <code>font-serif</code>; body copy in Figtree via{' '}
          <code>font-sans</code>; labels in Geist Mono via <code>font-mono</code>. Per the owner's
          2026-09-14 rulings: the fixed brand points are <strong>primary and ink</strong> (white is
          the system constant), the other four logo tones are reference values, and the landing
          atmosphere is the ink-led + neutral-tint mix rendered first below.
        </p>
      </header>

      <CompositionMock />

      <section className='mx-auto mt-10 max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Fixed brand points (#90 — never nudged)
        </h2>
        <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
          <Swatch cls='bg-brand-primary' label='primary' sub='#06708e · white 5.65:1' />
          <Swatch cls='bg-brand-ink' label='ink' sub='#0e131a · 18.64:1 on white' />
          <Swatch cls='bg-brand-deep' label='deep petrol' sub='#084257 · white 10.90:1' />
          <Swatch cls='bg-brand-gray-light' label='light neutral' sub='#dedede · ink 13.85:1' />
          <Swatch cls='bg-brand-gray-mid' label='mid gray' sub='#7e7f7f · large text only' />
          <Swatch cls='bg-brand-gray-cool' label='cool gray' sub='#afb8ba · borders, inputs' />
        </div>
        <p className='text-muted-foreground mt-2 text-xs'>
          Each token stores its hex as the canonical comment beside a full-precision oklch
          conversion that round-trips to the identical color.
        </p>
      </section>

      <section className='mx-auto mt-10 max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Derived ramp — brand 50–900
        </h2>
        <div className='mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10'>
          <Swatch cls='bg-brand-50' label='50' sub='#edf7fb' />
          <Swatch cls='bg-brand-100' label='100' sub='#dff0f7' />
          <Swatch cls='bg-brand-200' label='200' sub='#c9e3ee' />
          <Swatch cls='bg-brand-300' label='300' sub='#a8d2e3' />
          <Swatch cls='bg-brand-400' label='400' sub='#69a9c2' />
          <Swatch cls='bg-brand-500' label='500' sub='#398ba9' />
          <Swatch cls='bg-brand-600' label='600' sub='primary · 5.65:1' />
          <Swatch cls='bg-brand-700' label='700' sub='hover · 8.22:1' />
          <Swatch cls='bg-brand-800' label='800' sub='#034356 · 10.82:1' />
          <Swatch cls='bg-brand-900' label='900' sub='#042e3b' />
        </div>
        <p className='text-muted-foreground mt-2 text-xs'>
          Hue held at the primary's 225.078; chroma peaks at 600. 600 IS the fixed primary. Deep
          petrol keeps its own token (its hue is 228.722 — a sibling, not a ramp step).
        </p>
      </section>

      <section className='mx-auto mt-10 max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Interaction states + muted text
        </h2>
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            className='bg-brand-600 hover:bg-brand-primary-hover focus-visible:ring-brand-focus-ring rounded-md px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none cursor-pointer transition-colors'
          >
            Default · hover to 700
          </button>
          <button
            type='button'
            className='bg-brand-primary-hover rounded-md px-4 py-2 text-sm font-medium text-white cursor-pointer transition-colors'
          >
            Hover value (700)
          </button>
          <button
            type='button'
            className='bg-brand-primary-active rounded-md px-4 py-2 text-sm font-medium text-white cursor-pointer transition-colors'
          >
            Active value (800)
          </button>
          <a
            // biome-ignore lint/a11y/useValidAnchor: prototype demo anchor shows link contrast, no navigation target
            href='#'
            className='text-brand-700 text-sm font-medium underline underline-offset-4 cursor-pointer transition-colors'
          >
            Link (700 · 8.22:1)
          </a>
          <input
            aria-label='Focus ring demo'
            type='text'
            placeholder='Focus me: ring = 400'
            className='border-input bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none transition-colors'
          />
        </div>
        <div className='border-border mt-4 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2'>
          <p className='text-muted-text text-sm'>
            Muted text on white card — #686969, 5.51:1. Derived darker than the logo's mid gray
            (#7e7f7f, ~4.0:1 — small-text fail).
          </p>
          <p className='bg-wash-b text-muted-text rounded-lg p-3 text-sm'>
            Same muted text on the darkest wash — still 4.59:1. The derivation targets the wash, not
            white, because the atmosphere sets text on washes.
          </p>
        </div>
      </section>

      <section className='mx-auto mt-10 max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Semantic components (candidate mapping)
        </h2>
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <button
            type='button'
            className='bg-primary text-primary-foreground focus-visible:ring-ring rounded-md px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none cursor-pointer transition-colors'
          >
            Book now
          </button>
          <button
            type='button'
            className='bg-secondary text-secondary-foreground rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors'
          >
            Secondary
          </button>
          <button
            type='button'
            className='border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground rounded-md border px-4 py-2 text-sm font-medium cursor-pointer transition-colors'
          >
            Outline
          </button>
          <button
            type='button'
            className='text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors'
          >
            Ghost
          </button>
          <button
            type='button'
            className='rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white cursor-pointer transition-colors'
          >
            Destructive (shadcn default)
          </button>
          <button
            type='button'
            disabled
            className='bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium opacity-50 cursor-pointer transition-colors'
          >
            Disabled
          </button>
        </div>

        <div className='mt-6 grid gap-6 md:grid-cols-2'>
          <article className='bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-6 shadow-sm'>
            <div className='bg-secondary aspect-[4/3] rounded-lg' />
            <h3 className='font-serif text-2xl font-semibold'>Signature Portrait</h3>
            <p className='text-foreground text-lg font-semibold'>₱3,500</p>
            <p className='text-muted-foreground text-sm'>
              A 90-minute session at any branch: one outfit change, guided posing, and twenty
              hand-edited photos delivered in seven days.
            </p>
            <button
              type='button'
              className='bg-primary text-primary-foreground mt-2 rounded-md px-4 py-2 text-center text-sm font-medium cursor-pointer transition-colors'
            >
              Book now
            </button>
          </article>

          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <label htmlFor='proto-name' className='text-foreground text-sm font-medium'>
                Full name
              </label>
              <input
                id='proto-name'
                type='text'
                placeholder='Juan dela Cruz'
                className='border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none transition-colors'
              />
              <p className='text-muted-foreground text-xs'>
                Helper text in muted-foreground (derived #686969).
              </p>
            </div>
            <div className='flex flex-col gap-2'>
              <label htmlFor='proto-email' className='text-foreground text-sm font-medium'>
                Email
              </label>
              <input
                id='proto-email'
                type='email'
                defaultValue='not-an-email'
                className='rounded-md border border-destructive bg-background px-3 py-2 text-sm text-destructive focus-visible:ring-destructive focus-visible:ring-2 focus-visible:outline-none transition-colors'
              />
              <p className='text-xs text-destructive'>Enter a valid email address.</p>
            </div>
            <div className='flex flex-wrap gap-2'>
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
        </div>
      </section>

      <section className='mt-10' data-tier1-tracer>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Shared primitives (<code>@sevendays/ui</code>)
        </h2>
        <p className='text-muted-foreground mt-1 text-sm'>
          Tier-1 tracer (M3 #95): the registry <code>button</code>, generated into packages/ui and
          imported through the shared package — the distribution-path proof, not a restyle.
        </p>
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <Button>Tier-1 default</Button>
          <Button variant='outline'>Tier-1 outline</Button>
        </div>
      </section>

      <AdminNeutralStrip />

      <AtmosphereVariants />

      <footer className='mx-auto mt-12 max-w-5xl border-t border-border px-6 pt-4'>
        <p className='text-muted-foreground text-xs'>
          Living token gallery (M3) — this route renders the live shared layer both apps import.
          Values adopted from the validated #92 candidate; the chart ramp was dropped at the swap
          (no chart tokens ship — data-viz is the v2 effort's). Deleted at milestone close-out.
        </p>
      </footer>
    </div>
  );
}

function Swatch({ cls, label, sub }: { cls: string; label: string; sub: string }) {
  return (
    <figure>
      <div className={`border-border h-16 rounded-lg border ${cls}`} />
      <figcaption className='mt-1 text-xs'>
        <span className='text-foreground font-medium'>{label}</span>{' '}
        <span className='text-muted-foreground'>({sub})</span>
      </figcaption>
    </figure>
  );
}
