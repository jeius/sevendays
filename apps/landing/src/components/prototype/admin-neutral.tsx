// PROTOTYPE (throwaway) — wayfinder #92: admin tool-neutral strip.
// Flat shadcn surfaces; brand reduced to wordmark + primary. Delete when
// the design-system milestone work lands.
export function AdminNeutralStrip() {
  return (
    <section className='mx-auto mt-10 max-w-5xl px-6' data-92-admin>
      <h2 className='text-foreground font-serif text-2xl font-semibold'>Admin — tool-neutral</h2>
      <p className='text-muted-foreground mt-2 max-w-prose'>
        Flat shadcn surfaces; the brand appears only as wordmark and primary. Sidebar mapping comes
        from the candidate token layer.
      </p>

      <div className='border-border mt-4 grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[16rem_1fr]'>
        <aside className='border-sidebar-border bg-sidebar rounded-lg border p-3'>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground rounded-md px-3 py-2 font-semibold'>
            Sevendays Admin
          </div>
          <nav className='mt-3 flex flex-col gap-1'>
            <span className='bg-sidebar-accent text-sidebar-accent-foreground rounded-md px-3 py-2 text-sm font-medium'>
              Dashboard
            </span>
            <span className='text-sidebar-foreground rounded-md px-3 py-2 text-sm'>
              Appointments
            </span>
            <span className='text-sidebar-foreground rounded-md px-3 py-2 text-sm'>Catalog</span>
            <span className='text-sidebar-foreground rounded-md px-3 py-2 text-sm'>Branches</span>
            <span className='text-sidebar-foreground rounded-md px-3 py-2 text-sm'>Settings</span>
          </nav>
        </aside>

        <div className='flex flex-col gap-4'>
          <div className='grid grid-cols-3 gap-3'>
            <div className='border-border rounded-lg border p-3'>
              <p className='text-muted-foreground text-xs'>Today</p>
              <p className='text-foreground font-mono text-2xl font-semibold'>14</p>
            </div>
            <div className='border-border rounded-lg border p-3'>
              <p className='text-muted-foreground text-xs'>This week</p>
              <p className='text-foreground font-mono text-2xl font-semibold'>86</p>
            </div>
            <div className='border-border rounded-lg border p-3'>
              <p className='text-muted-foreground text-xs'>Unconfirmed</p>
              <p className='text-primary font-mono text-2xl font-semibold'>5</p>
            </div>
          </div>

          <div className='border-border rounded-lg border'>
            <div className='border-border border-b px-4 py-3'>
              <p className='text-foreground text-sm font-semibold'>Upcoming appointments</p>
            </div>
            <ul className='divide-border divide-y'>
              <li className='text-foreground flex items-center justify-between px-4 py-2.5 text-sm'>
                <span>Signature Portrait · Makati</span>
                <span className='flex items-center gap-3'>
                  <span className='text-muted-foreground font-mono text-xs'>14:00</span>
                  <span className='bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
                    Confirmed
                  </span>
                </span>
              </li>
              <li className='text-foreground flex items-center justify-between px-4 py-2.5 text-sm'>
                <span>Family Session · Quezon City</span>
                <span className='flex items-center gap-3'>
                  <span className='text-muted-foreground font-mono text-xs'>16:30</span>
                  <span className='bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'>
                    Pending
                  </span>
                </span>
              </li>
              <li className='text-foreground flex items-center justify-between px-4 py-2.5 text-sm'>
                <span>Couple Shoot · BGC</span>
                <span className='flex items-center gap-3'>
                  <span className='text-muted-foreground font-mono text-xs'>18:00</span>
                  <span className='rounded-full bg-destructive px-2.5 py-0.5 text-xs font-medium text-white'>
                    No-show
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
