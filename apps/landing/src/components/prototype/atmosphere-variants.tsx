// PROTOTYPE (throwaway) — wayfinder #92: landing atmosphere variants.
// Three full-bleed bands rebuild the gradient-wash + layered-surfaces
// pattern on the logo palette, plus a photography-recede test. Delete
// when the design-system milestone work lands.
export function AtmosphereVariants() {
  return (
    <section className='mt-12' data-92-variants>
      <div className='mx-auto max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Landing atmosphere — three variants
        </h2>
        <p className='text-muted-foreground mt-2 max-w-prose'>
          Same token layer, three readings of the gradient-wash + layered-surfaces pattern. React to
          the pattern direction: typography and components are identical across bands, so only the
          atmosphere differs.
        </p>
      </div>

      {/* Variant A — light wash led */}
      <div
        data-92-variant-a
        className='border-line-soft mt-6 border-y bg-[linear-gradient(180deg,var(--wash-base),var(--wash-a)_60%,var(--wash-b))]'
      >
        <div className='mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 md:flex-row md:items-center'>
          <div className='flex-1'>
            <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
              A · wash-light
            </p>
            <h3 className='text-brand-ink mt-3 font-serif text-4xl font-bold'>
              Photography that takes seven days, not seven weeks.
            </h3>
            <p className='text-muted-text mt-3 max-w-prose'>
              The page stays near-white; the wash deepens toward the fold and cards sit on it as
              glass. Airiest reading — closest to a gallery wall.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <button
                type='button'
                className='bg-brand-600 hover:bg-brand-primary-hover focus-visible:ring-brand-focus-ring rounded-md px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                Book a session
              </button>
              <button
                type='button'
                className='border-line-soft bg-surface-glass text-brand-ink rounded-md border px-4 py-2 text-sm font-medium'
              >
                View packages
              </button>
            </div>
          </div>
          <div className='border-line-soft bg-surface-glass w-full rounded-xl border p-4 shadow-sm md:w-80'>
            <div className='h-36 rounded-lg bg-[linear-gradient(135deg,var(--brand-500),var(--brand-300),var(--brand-50))]' />
            <p className='text-brand-ink mt-3 text-sm font-semibold'>Signature Portrait</p>
            <p className='text-muted-text text-sm'>₱3,500 · 90 minutes · 20 photos</p>
          </div>
        </div>
      </div>

      {/* Variant B — deep petrol led */}
      <div data-92-variant-b className='bg-brand-deep'>
        <div className='mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 md:flex-row md:items-center'>
          <div className='flex-1'>
            <p className='font-mono text-xs font-bold tracking-[0.16em] text-white/85 uppercase'>
              B · deep-led
            </p>
            <h3 className='mt-3 font-serif text-4xl font-bold text-white'>
              Studio depth behind every frame.
            </h3>
            <p className='mt-3 max-w-prose text-white/85'>
              Hero and footer carry the deep petrol band; the page opens dark and settles into light
              sections. Strongest contrast reading.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <button
                type='button'
                className='rounded-md bg-white px-4 py-2 text-sm font-medium text-brand-deep hover:bg-white/90'
              >
                Book a session
              </button>
              <button
                type='button'
                className='rounded-md border border-white/30 px-4 py-2 text-sm font-medium text-white'
              >
                View packages
              </button>
            </div>
          </div>
          <div className='w-full rounded-xl border border-white/20 bg-surface-glass p-4 shadow-sm md:w-80'>
            <div className='h-36 rounded-lg bg-[linear-gradient(135deg,var(--brand-400),var(--brand-600),var(--brand-deep))]' />
            <p className='text-brand-ink mt-3 text-sm font-semibold'>Signature Portrait</p>
            <p className='text-muted-text text-sm'>₱3,500 · 90 minutes · 20 photos</p>
          </div>
        </div>
      </div>

      {/* Variant C — tinted neutral led */}
      <div data-92-variant-c className='bg-brand-gray-light'>
        <div className='mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 md:flex-row md:items-center'>
          <div className='flex-1'>
            <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
              C · neutral-tint
            </p>
            <h3 className='text-brand-ink mt-3 font-serif text-4xl font-bold'>
              Quiet mats, let the photos speak.
            </h3>
            <p className='text-brand-700 mt-3 max-w-prose'>
              The light neutral does the work: matted gray sections, white content cards, cool
              hairlines. Softest, most tonal reading.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <button
                type='button'
                className='bg-brand-600 hover:bg-brand-primary-hover focus-visible:ring-brand-focus-ring rounded-md px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
              >
                Book a session
              </button>
              <button
                type='button'
                className='border-brand-gray-cool bg-card text-brand-ink rounded-md border px-4 py-2 text-sm font-medium'
              >
                View packages
              </button>
            </div>
          </div>
          <div className='border-brand-gray-cool bg-card w-full rounded-xl border p-4 shadow-sm md:w-80'>
            <div className='bg-brand-100 h-36 rounded-lg' />
            <p className='text-brand-ink mt-3 text-sm font-semibold'>Signature Portrait</p>
            <p className='text-muted-text text-sm'>₱3,500 · 90 minutes · 20 photos</p>
          </div>
        </div>
      </div>

      {/* Photography recede test — deliberately warm/cool busy stand-in */}
      <div data-92-recede>
        <div className='mx-auto max-w-5xl px-6'>
          <p className='text-brand-700 mt-10 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
            Recede test · surfaces over photography
          </p>
          <div className='relative mt-3 h-64 overflow-hidden rounded-xl bg-[linear-gradient(120deg,#31576b,#b98a5f,#274050,#d9c9a8)]'>
            <div className='absolute inset-y-0 left-0 w-1/2 bg-wash-b/60' />
            <div className='border-line-soft bg-surface-glass absolute top-1/2 left-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-4 shadow-sm'>
              <p className='text-brand-ink text-sm font-semibold'>Glass panel</p>
              <p className='text-muted-text text-xs'>Ink and muted text stay AA on glass.</p>
            </div>
            <div className='bg-card border-brand-gray-cool absolute right-6 bottom-6 rounded-lg border p-3 shadow-sm'>
              <p className='text-brand-ink text-sm font-semibold'>White card</p>
              <p className='text-muted-text text-xs'>Solid surface, full contrast.</p>
            </div>
          </div>
          <p className='text-muted-foreground mt-2 text-xs'>
            Gradient stands in for photography (busy, warm-inclusive on purpose): the cool washes
            and neutral surfaces should sit in front of it without fighting it.
          </p>
        </div>
      </div>
    </section>
  );
}
