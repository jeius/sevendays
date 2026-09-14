// M3 gallery reference — the owner-ruled #92 composition, rendered:
// ink-led header + footer bands, neutral-tint (C) body. Living reference
// for the #97/#98 surface builds; deleted with the gallery at close-out
// (#101).
export function CompositionMock() {
  return (
    <section className='mt-12' data-92-composition>
      <div className='mx-auto max-w-5xl px-6'>
        <h2 className='text-foreground font-serif text-2xl font-semibold'>
          Recommended composition — your ruling, rendered
        </h2>
        <p className='text-muted-foreground mt-2 max-w-prose'>
          Ink-led header and footer bands framing a body that defaults to the petrol wash (band-2
          tone): white cards, cool hairlines, and gray-light reserved for emphasis strips. Deep
          petrol appears only as the action color and media accents.
        </p>
      </div>

      {/* Header band — ink led */}
      <div className='mt-6' data-92-comp-header>
        <div className='bg-brand-ink'>
          <div className='mx-auto flex max-w-5xl items-center justify-between px-6 py-4'>
            <span className='text-white font-serif text-xl font-bold'>Sevendays</span>
            <nav className='flex items-center gap-6'>
              <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                Packages
              </span>
              <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                Services
              </span>
              <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                Branches
              </span>
              <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                About
              </span>
              <button
                type='button'
                className='bg-brand-600 hover:bg-brand-primary-hover rounded-md px-4 py-2 text-sm font-medium text-white cursor-pointer transition-colors'
              >
                Book now
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Body band 1 — petrol wash canvas, hero on a white card */}
      <div className='bg-wash-base border-line-soft border-b' data-92-comp-body>
        <div className='mx-auto max-w-5xl px-6 py-12'>
          <div className='bg-card border-brand-gray-cool rounded-xl border p-8 shadow-sm'>
            <p className='text-brand-700 font-mono text-xs font-bold tracking-[0.16em] uppercase'>
              Sevendays Photography
            </p>
            <h3 className='text-brand-ink mt-3 max-w-2xl font-serif text-4xl font-bold'>
              Three branches. One standard of light.
            </h3>
            <p className='text-muted-text mt-3 max-w-prose'>
              Studio-grade portrait, family, and commercial photography in Makati, Quezon City, and
              BGC — booked in minutes, delivered in seven days.
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <button
                type='button'
                className='bg-brand-600 hover:bg-brand-primary-hover focus-visible:ring-brand-focus-ring rounded-md px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none cursor-pointer transition-colors'
              >
                Book a session
              </button>
              <button
                type='button'
                className='border-brand-gray-cool bg-card text-brand-ink hover:bg-wash-base rounded-md border px-4 py-2 text-sm font-medium cursor-pointer transition-colors'
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
          <h3 className='text-brand-ink font-serif text-2xl font-semibold'>Packages</h3>
          <p className='text-muted-foreground mt-1 text-sm'>
            Every session includes guided posing and hand-edited photos.
          </p>
          <div className='mt-6 grid gap-4 md:grid-cols-3'>
            <article className='bg-card border-brand-gray-cool flex flex-col gap-3 rounded-xl border p-5 shadow-sm'>
              <div className='bg-brand-100 h-28 rounded-lg' />
              <h4 className='text-brand-ink font-serif text-lg font-semibold'>
                Signature Portrait
              </h4>
              <p className='text-muted-text text-sm'>₱3,500 · 90 minutes · 20 photos</p>
              <span className='bg-primary text-primary-foreground self-start rounded-full px-2.5 py-0.5 text-xs font-medium'>
                Most booked
              </span>
            </article>
            <article className='bg-card border-brand-gray-cool flex flex-col gap-3 rounded-xl border p-5 shadow-sm'>
              <div className='h-28 rounded-lg bg-[linear-gradient(135deg,var(--brand-500),var(--brand-300),var(--brand-50))]' />
              <h4 className='text-brand-ink font-serif text-lg font-semibold'>Family Session</h4>
              <p className='text-muted-text text-sm'>₱5,200 · 2 hours · 30 photos</p>
              <span className='bg-secondary text-secondary-foreground self-start rounded-full px-2.5 py-0.5 text-xs font-medium'>
                Up to 6 people
              </span>
            </article>
            <article className='bg-card border-brand-gray-cool flex flex-col gap-3 rounded-xl border p-5 shadow-sm'>
              <div className='border-brand-gray-cool h-28 rounded-lg border bg-[linear-gradient(135deg,var(--brand-400),var(--brand-600),var(--brand-deep))]' />
              <h4 className='text-brand-ink font-serif text-lg font-semibold'>Commercial</h4>
              <p className='text-muted-text text-sm'>From ₱8,000 · half day · licensed</p>
              <span className='border-border text-foreground self-start rounded-full border px-2.5 py-0.5 text-xs font-medium'>
                Walk-in welcome
              </span>
            </article>
          </div>
        </div>
      </div>

      {/* Emphasis strip — gray-light alternation, the one job left to it */}
      <div className='bg-brand-gray-light border-line-soft border-t' data-92-comp-emphasis>
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h3 className='text-brand-ink font-serif text-xl font-semibold'>
              Not sure which session fits?
            </h3>
            <p className='text-brand-700 mt-1 text-sm'>
              Call or visit a branch — we will help you choose.
            </p>
          </div>
          <button
            type='button'
            className='border-brand-gray-cool bg-card text-brand-ink hover:bg-wash-base rounded-md border px-4 py-2 text-sm font-medium cursor-pointer transition-colors'
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
                <p className='text-white font-serif text-xl font-bold'>Sevendays</p>
                <p className='mt-2 max-w-xs text-sm text-white/85'>
                  Photography studios in Makati, Quezon City, and BGC.
                </p>
              </div>
              <div className='flex gap-12'>
                <div className='flex flex-col gap-2'>
                  <p className='text-white text-sm font-semibold'>Studio</p>
                  <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                    About
                  </span>
                  <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                    Branches
                  </span>
                  <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                    Contact
                  </span>
                </div>
                <div className='flex flex-col gap-2'>
                  <p className='text-white text-sm font-semibold'>Services</p>
                  <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                    Packages
                  </span>
                  <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                    Studio services
                  </span>
                  <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                    Gift cards
                  </span>
                </div>
                <div className='flex flex-col gap-2'>
                  <p className='text-white text-sm font-semibold'>Book</p>
                  <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                    Book now
                  </span>
                  <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                    Branch hours
                  </span>
                  <span className='text-white/85 hover:text-white cursor-pointer text-sm transition-colors'>
                    FAQ
                  </span>
                </div>
              </div>
            </div>
            <div className='mt-8 flex items-center justify-between border-t border-white/20 pt-4'>
              <p className='text-white/70 text-xs'>© 2026 Sevendays Photography</p>
              <p className='text-white/70 font-mono text-xs'>#92 composition mock</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
