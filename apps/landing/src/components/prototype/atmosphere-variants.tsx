// M3 gallery reference — #92 landing atmosphere variants. Three
// full-bleed bands + a photography-recede test, kept as the living
// reference for the #97/#98 builds; deleted with the gallery at
// close-out (#101).
export function AtmosphereVariants() {
  return (
    <section className='mt-12' data-92-variants>
      <div className='mx-auto max-w-5xl px-6'>
        <h2 className='font-semibold font-serif text-2xl text-foreground'>
          Landing atmosphere — three variants
        </h2>
        <p className='mt-2 max-w-prose text-muted-foreground'>
          Same token layer, three readings of the gradient-wash + layered-surfaces pattern. React to
          the pattern direction: typography and components are identical across bands, so only the
          atmosphere differs.
        </p>
      </div>

      {/* Variant A — light wash led */}
      <div
        data-92-variant-a
        className='mt-6 border-line-soft border-y bg-[linear-gradient(180deg,var(--wash-base),var(--wash-a)_60%,var(--wash-b))]'
      >
        <div className='mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 md:flex-row md:items-center'>
          <div className='flex-1'>
            <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
              A · wash-light
            </p>
            <h3 className='mt-3 font-bold font-serif text-4xl text-brand-ink'>
              Photography that takes seven days, not seven weeks.
            </h3>
            <p className='mt-3 max-w-prose text-muted-text'>
              The page stays near-white; the wash deepens toward the fold and cards sit on it as
              glass. Airiest reading — closest to a gallery wall.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <button
                type='button'
                className='cursor-pointer rounded-md bg-brand-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus-ring focus-visible:ring-offset-2'
              >
                Book a session
              </button>
              <button
                type='button'
                className='cursor-pointer rounded-md border border-line-soft bg-surface-glass px-4 py-2 font-medium text-brand-ink text-sm transition-colors'
              >
                View packages
              </button>
            </div>
          </div>
          <div className='w-full rounded-xl border border-line-soft bg-surface-glass p-4 shadow-sm md:w-80'>
            <div className='h-36 rounded-lg bg-[linear-gradient(135deg,var(--brand-500),var(--brand-300),var(--brand-50))]' />
            <p className='mt-3 font-semibold text-brand-ink text-sm'>Signature Portrait</p>
            <p className='text-muted-text text-sm'>₱3,500 · 90 minutes · 20 photos</p>
          </div>
        </div>
      </div>

      {/* Variant B — ink led (owner trial: band = brand-ink, deep petrol kept as accent) */}
      <div data-92-variant-b className='bg-brand-ink'>
        <div className='mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 md:flex-row md:items-center'>
          <div className='flex-1'>
            <p className='font-bold font-mono text-white/85 text-xs uppercase tracking-[0.16em]'>
              B · ink-led
            </p>
            <h3 className='mt-3 font-bold font-serif text-4xl text-white'>
              Studio depth behind every frame.
            </h3>
            <p className='mt-3 max-w-prose text-white/85'>
              Hero and footer carry the ink band; the page opens dark and settles into light
              sections. Strongest contrast reading.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <button
                type='button'
                className='cursor-pointer rounded-md bg-white px-4 py-2 font-medium text-brand-deep text-sm transition-colors hover:bg-white/90'
              >
                Book a session
              </button>
              <button
                type='button'
                className='cursor-pointer rounded-md border border-white/30 px-4 py-2 font-medium text-sm text-white transition-colors'
              >
                View packages
              </button>
            </div>
          </div>
          <div className='w-full rounded-xl border border-white/20 bg-surface-glass p-4 shadow-sm md:w-80'>
            <div className='h-36 rounded-lg bg-[linear-gradient(135deg,var(--brand-400),var(--brand-600),var(--brand-deep))]' />
            <p className='mt-3 font-semibold text-brand-ink text-sm'>Signature Portrait</p>
            <p className='text-brand-ink text-sm'>₱3,500 · 90 minutes · 20 photos</p>
          </div>
        </div>
      </div>

      {/* Variant C — tinted neutral led */}
      <div data-92-variant-c className='bg-brand-gray-light'>
        <div className='mx-auto flex max-w-5xl flex-col gap-8 px-6 py-14 md:flex-row md:items-center'>
          <div className='flex-1'>
            <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
              C · neutral-tint
            </p>
            <h3 className='mt-3 font-bold font-serif text-4xl text-brand-ink'>
              Quiet mats, let the photos speak.
            </h3>
            <p className='mt-3 max-w-prose text-brand-700'>
              The light neutral does the work: matted gray sections, white content cards, cool
              hairlines. Softest, most tonal reading.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <button
                type='button'
                className='cursor-pointer rounded-md bg-brand-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus-ring focus-visible:ring-offset-2'
              >
                Book a session
              </button>
              <button
                type='button'
                className='cursor-pointer rounded-md border border-brand-gray-cool bg-card px-4 py-2 font-medium text-brand-ink text-sm transition-colors'
              >
                View packages
              </button>
            </div>
          </div>
          <div className='w-full rounded-xl border border-brand-gray-cool bg-card p-4 shadow-sm md:w-80'>
            <div className='h-36 rounded-lg bg-brand-100' />
            <p className='mt-3 font-semibold text-brand-ink text-sm'>Signature Portrait</p>
            <p className='text-muted-text text-sm'>₱3,500 · 90 minutes · 20 photos</p>
          </div>
        </div>
      </div>

      {/* Photography recede test — deliberately warm/cool busy stand-in */}
      <div data-92-recede>
        <div className='mx-auto max-w-5xl px-6'>
          <p className='mt-10 font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
            Recede test · surfaces over photography
          </p>
          <div className='relative mt-3 h-64 overflow-hidden rounded-xl bg-[linear-gradient(120deg,#31576b,#b98a5f,#274050,#d9c9a8)]'>
            <div className='absolute inset-y-0 left-0 w-1/2 bg-wash-b/60' />
            <div className='absolute top-1/2 left-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line-soft bg-surface-glass p-4 shadow-sm'>
              <p className='font-semibold text-brand-ink text-sm'>Glass panel</p>
              <p className='text-brand-ink text-xs'>Ink text stays AA on glass over any photo.</p>
            </div>
            <div className='absolute right-6 bottom-6 rounded-lg border border-brand-gray-cool bg-card p-3 shadow-sm'>
              <p className='font-semibold text-brand-ink text-sm'>White card</p>
              <p className='text-muted-text text-xs'>Solid surface, full contrast.</p>
            </div>
          </div>
          <p className='mt-2 text-muted-foreground text-xs'>
            Gradient stands in for photography (busy, warm-inclusive on purpose): the cool washes
            and neutral surfaces should sit in front of it without fighting it.
          </p>
        </div>
      </div>
    </section>
  );
}
