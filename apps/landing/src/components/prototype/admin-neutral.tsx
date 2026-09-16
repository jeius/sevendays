// M3 gallery reference — #92 admin tool-neutral strip: flat shadcn
// surfaces, brand reduced to wordmark + primary. Reference for the
// #100 admin shell; deleted with the gallery at close-out (#101).
export function AdminNeutralStrip() {
  return (
    <section className='mx-auto mt-10 max-w-5xl px-6' data-92-admin>
      <h2 className='font-semibold font-serif text-2xl text-foreground'>Admin — tool-neutral</h2>
      <p className='mt-2 max-w-prose text-muted-foreground'>
        Flat shadcn surfaces; the brand appears only as wordmark and primary. Sidebar mapping comes
        from the candidate token layer.
      </p>

      <div className='mt-4 grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-[16rem_1fr]'>
        <aside className='rounded-lg border border-sidebar-border bg-sidebar p-3'>
          <div className='rounded-md bg-sidebar-primary px-3 py-2 font-semibold text-sidebar-primary-foreground'>
            Sevendays Admin
          </div>
          <nav className='mt-3 flex flex-col gap-1'>
            <span className='rounded-md bg-sidebar-accent px-3 py-2 font-medium text-sidebar-accent-foreground text-sm'>
              Dashboard
            </span>
            <span className='rounded-md px-3 py-2 text-sidebar-foreground text-sm'>
              Appointments
            </span>
            <span className='rounded-md px-3 py-2 text-sidebar-foreground text-sm'>Catalog</span>
            <span className='rounded-md px-3 py-2 text-sidebar-foreground text-sm'>Branches</span>
            <span className='rounded-md px-3 py-2 text-sidebar-foreground text-sm'>Settings</span>
          </nav>
        </aside>

        <div className='flex flex-col gap-4'>
          <div className='grid grid-cols-3 gap-3'>
            <div className='rounded-lg border border-border p-3'>
              <p className='text-muted-foreground text-xs'>Today</p>
              <p className='font-mono font-semibold text-2xl text-foreground'>14</p>
            </div>
            <div className='rounded-lg border border-border p-3'>
              <p className='text-muted-foreground text-xs'>This week</p>
              <p className='font-mono font-semibold text-2xl text-foreground'>86</p>
            </div>
            <div className='rounded-lg border border-border p-3'>
              <p className='text-muted-foreground text-xs'>Unconfirmed</p>
              <p className='font-mono font-semibold text-2xl text-primary'>5</p>
            </div>
          </div>

          <div className='rounded-lg border border-border'>
            <div className='border-border border-b px-4 py-3'>
              <p className='font-semibold text-foreground text-sm'>Upcoming appointments</p>
            </div>
            <ul className='divide-y divide-border'>
              <li className='flex items-center justify-between px-4 py-2.5 text-foreground text-sm'>
                <span>Signature Portrait · Makati</span>
                <span className='flex items-center gap-3'>
                  <span className='font-mono text-muted-foreground text-xs'>14:00</span>
                  <span className='rounded-full bg-primary px-2.5 py-0.5 font-medium text-primary-foreground text-xs'>
                    Confirmed
                  </span>
                </span>
              </li>
              <li className='flex items-center justify-between px-4 py-2.5 text-foreground text-sm'>
                <span>Family Session · Quezon City</span>
                <span className='flex items-center gap-3'>
                  <span className='font-mono text-muted-foreground text-xs'>16:30</span>
                  <span className='rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground text-xs'>
                    Pending
                  </span>
                </span>
              </li>
              <li className='flex items-center justify-between px-4 py-2.5 text-foreground text-sm'>
                <span>Couple Shoot · BGC</span>
                <span className='flex items-center gap-3'>
                  <span className='font-mono text-muted-foreground text-xs'>18:00</span>
                  <span className='rounded-full bg-destructive px-2.5 py-0.5 font-medium text-white text-xs'>
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
