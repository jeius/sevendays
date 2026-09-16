// M3 gallery reference — the owner-ruled #92 composition, rendered:
// ink-led header + footer bands, neutral-tint (C) body. Living reference
// for the #97/#98 surface builds; deleted with the gallery at close-out
// (#101).
export function CompositionMock() {
  return (
    <section className='mt-12' data-92-composition>
      <div className='mx-auto max-w-5xl px-6'>
        <h2 className='font-semibold font-serif text-2xl text-foreground'>
          Recommended composition — your ruling, rendered
        </h2>
        <p className='mt-2 max-w-prose text-muted-foreground'>
          Ink-led header and footer bands framing a body that defaults to the petrol wash (band-2
          tone): white cards, cool hairlines, and gray-light reserved for emphasis strips. Deep
          petrol appears only as the action color and media accents.
        </p>
      </div>

      {/* Header band — ink led */}
      <div className='mt-6' data-92-comp-header>
        <div className='bg-brand-ink'>
          <div className='mx-auto flex max-w-5xl items-center justify-between px-6 py-4'>
            <span className='font-bold font-serif text-white text-xl'>Sevendays</span>
            <nav className='flex items-center gap-6'>
              <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                Packages
              </span>
              <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                Services
              </span>
              <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                Branches
              </span>
              <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                About
              </span>
              <button
                type='button'
                className='cursor-pointer rounded-md bg-brand-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-brand-primary-hover'
              >
                Book now
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Body band 1 — petrol wash canvas, hero on a white card */}
      <div className='border-line-soft border-b bg-wash-base' data-92-comp-body>
        <div className='mx-auto max-w-5xl px-6 py-12'>
          <div className='rounded-xl border border-brand-gray-cool bg-card p-8 shadow-sm'>
            <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
              Sevendays Photography
            </p>
            <h3 className='mt-3 max-w-2xl font-bold font-serif text-4xl text-brand-ink'>
              Three branches. One standard of light.
            </h3>
            <p className='mt-3 max-w-prose text-muted-text'>
              Studio-grade portrait, family, and commercial photography in Makati, Quezon City, and
              BGC — booked in minutes, delivered in seven days.
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
                className='cursor-pointer rounded-md border border-brand-gray-cool bg-card px-4 py-2 font-medium text-brand-ink text-sm transition-colors hover:bg-wash-base'
              >
                View packages
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body band 2 — lighter wash mat, package cards */}
      <div className='bg-wash-base' data-92-comp-body-2>
        <div className='mx-auto max-w-5xl px-6 py-12'>
          <h3 className='font-semibold font-serif text-2xl text-brand-ink'>Packages</h3>
          <p className='mt-1 text-muted-foreground text-sm'>
            Every session includes guided posing and hand-edited photos.
          </p>
          <div className='mt-6 grid gap-4 md:grid-cols-3'>
            <article className='flex flex-col gap-3 rounded-xl border border-brand-gray-cool bg-card p-5 shadow-sm'>
              <div className='h-28 rounded-lg bg-brand-100' />
              <h4 className='font-semibold font-serif text-brand-ink text-lg'>
                Signature Portrait
              </h4>
              <p className='text-muted-text text-sm'>₱3,500 · 90 minutes · 20 photos</p>
              <span className='self-start rounded-full bg-primary px-2.5 py-0.5 font-medium text-primary-foreground text-xs'>
                Most booked
              </span>
            </article>
            <article className='flex flex-col gap-3 rounded-xl border border-brand-gray-cool bg-card p-5 shadow-sm'>
              <div className='h-28 rounded-lg bg-[linear-gradient(135deg,var(--brand-500),var(--brand-300),var(--brand-50))]' />
              <h4 className='font-semibold font-serif text-brand-ink text-lg'>Family Session</h4>
              <p className='text-muted-text text-sm'>₱5,200 · 2 hours · 30 photos</p>
              <span className='self-start rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground text-xs'>
                Up to 6 people
              </span>
            </article>
            <article className='flex flex-col gap-3 rounded-xl border border-brand-gray-cool bg-card p-5 shadow-sm'>
              <div className='h-28 rounded-lg border border-brand-gray-cool bg-[linear-gradient(135deg,var(--brand-400),var(--brand-600),var(--brand-deep))]' />
              <h4 className='font-semibold font-serif text-brand-ink text-lg'>Commercial</h4>
              <p className='text-muted-text text-sm'>From ₱8,000 · half day · licensed</p>
              <span className='self-start rounded-full border border-border px-2.5 py-0.5 font-medium text-foreground text-xs'>
                Walk-in welcome
              </span>
            </article>
          </div>
        </div>
      </div>

      {/* Emphasis strip — gray-light alternation, the one job left to it */}
      <div className='border-line-soft border-t bg-brand-gray-light' data-92-comp-emphasis>
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h3 className='font-semibold font-serif text-brand-ink text-xl'>
              Not sure which session fits?
            </h3>
            <p className='mt-1 text-brand-700 text-sm'>
              Call or visit a branch — we will help you choose.
            </p>
          </div>
          <button
            type='button'
            className='cursor-pointer rounded-md border border-brand-gray-cool bg-card px-4 py-2 font-medium text-brand-ink text-sm transition-colors hover:bg-wash-base'
          >
            Find a branch
          </button>
        </div>
      </div>

      {/* Footer band — ink led, mirrors the header */}
      <div data-92-comp-footer>
        <div className='bg-brand-ink'>
          <div className='mx-auto max-w-5xl px-6 py-10'>
            <div className='flex flex-col justify-between gap-8 md:flex-row'>
              <div>
                <p className='font-bold font-serif text-white text-xl'>Sevendays</p>
                <p className='mt-2 max-w-xs text-sm text-white/85'>
                  Photography studios in Makati, Quezon City, and BGC.
                </p>
              </div>
              <div className='flex gap-12'>
                <div className='flex flex-col gap-2'>
                  <p className='font-semibold text-sm text-white'>Studio</p>
                  <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                    About
                  </span>
                  <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                    Branches
                  </span>
                  <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                    Contact
                  </span>
                </div>
                <div className='flex flex-col gap-2'>
                  <p className='font-semibold text-sm text-white'>Services</p>
                  <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                    Packages
                  </span>
                  <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                    Studio services
                  </span>
                  <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                    Gift cards
                  </span>
                </div>
                <div className='flex flex-col gap-2'>
                  <p className='font-semibold text-sm text-white'>Book</p>
                  <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                    Book now
                  </span>
                  <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                    Branch hours
                  </span>
                  <span className='cursor-pointer text-sm text-white/85 transition-colors hover:text-white'>
                    FAQ
                  </span>
                </div>
              </div>
            </div>
            <div className='mt-8 flex items-center justify-between border-white/20 border-t pt-4'>
              <p className='text-white/70 text-xs'>© 2026 Sevendays Photography</p>
              <p className='font-mono text-white/70 text-xs'>#92 composition mock</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
