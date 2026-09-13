// PROTOTYPE (throwaway) — wayfinder #59 variant A: labeled sidebar shell.
// Fixed left sidebar with grouped nav, sticky top bar with search/user,
// KPI cards + filter bar + appointments table on the dashboard screen.
// The sidebar is desktop-only here (hidden below md); a mobile drawer is
// out of prototype scope — the ruling is shell + IA.
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  CalendarDays,
  LayoutDashboard,
  MapPin,
  Package,
  PlusCircle,
  Settings,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { AppointmentsTable } from './appointments-table';
import {
  dayOffsetOf,
  formatPeso,
  prototypeBranches,
  prototypeStatuses,
  usePrototypeAppointments,
} from './data';
import { type StubScreen, StubSurface, stubBlurbs } from './stub-surface';

type Screen = 'dashboard' | StubScreen;

interface NavItem {
  id: Screen;
  label: string;
  icon: LucideIcon;
}

const navGroups: { heading: string | null; items: NavItem[] }[] = [
  {
    heading: null,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'appointments', label: 'Appointments', icon: CalendarDays },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { id: 'packages', label: 'Packages', icon: Package },
      { id: 'addons', label: 'Add-ons', icon: PlusCircle },
      { id: 'services', label: 'Studio services', icon: Wrench },
    ],
  },
  {
    heading: 'Studio',
    items: [
      { id: 'branches', label: 'Branches', icon: MapPin },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const screenTitle: Record<Screen, string> = {
  dashboard: 'Dashboard',
  appointments: stubBlurbs.appointments.title,
  packages: stubBlurbs.packages.title,
  addons: stubBlurbs.addons.title,
  services: stubBlurbs.services.title,
  branches: stubBlurbs.branches.title,
  settings: stubBlurbs.settings.title,
};

export function VariantASidebar() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const { rows, visible, filters, setFilters, updateStatus } = usePrototypeAppointments();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const sessionsToday = rows.filter((r) => dayOffsetOf(r.scheduledAt) === 0).length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const confirmedValue = rows
    .filter((r) => r.status === 'confirmed' || r.status === 'completed')
    .reduce((sum, r) => sum + r.bookedPriceCents, 0);
  const walkInCount = rows.filter((r) => r.kind === 'walk_in').length;

  const onStatusChange = (id: string, status: (typeof prototypeStatuses)[number]) => {
    updateStatus(id, status);
    const row = rows.find((r) => r.id === id);
    if (row) setLastUpdate(`${row.customerName} → ${status}`);
  };

  return (
    <div className='bg-background text-foreground flex min-h-dvh' data-shell-variant='a'>
      <aside className='bg-sidebar text-sidebar-foreground sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border md:flex'>
        <div className='flex items-center gap-3 px-4 py-5'>
          <span className='bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
            7d
          </span>
          <div>
            <p className='text-sm leading-tight font-semibold'>Sevendays</p>
            <p className='text-sidebar-foreground/60 font-mono text-[0.65rem] tracking-widest uppercase'>
              Admin
            </p>
          </div>
        </div>
        <nav className='flex-1 space-y-4 overflow-y-auto px-3 py-2'>
          {navGroups.map((group) => (
            <div key={group.heading ?? 'main'}>
              {group.heading && (
                <p className='text-sidebar-foreground/50 px-3 pt-2 pb-1 font-mono text-[0.65rem] tracking-widest uppercase'>
                  {group.heading}
                </p>
              )}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setScreen(item.id)}
                  aria-current={screen === item.id ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    screen === item.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'hover:bg-sidebar-accent/60 text-sidebar-foreground/80'
                  }`}
                >
                  <item.icon className='size-4 shrink-0' aria-hidden='true' />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className='border-sidebar-border border-t p-3'>
          <div className='flex items-center gap-3 rounded-md px-2 py-1.5'>
            <span className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold'>
              SO
            </span>
            <div>
              <p className='text-sm leading-tight font-medium'>Studio Owner</p>
              <p className='text-sidebar-foreground/60 text-xs'>Owner</p>
            </div>
          </div>
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border px-6 backdrop-blur'>
          <h1 className='text-sm font-semibold'>{screenTitle[screen]}</h1>
          <div className='ml-auto flex items-center gap-3'>
            <input
              type='search'
              placeholder='Search…'
              aria-label='Search'
              className='border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring hidden w-56 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none sm:block'
            />
            <button
              type='button'
              aria-label='Notifications'
              className='text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md p-2'
            >
              <Bell className='size-4' aria-hidden='true' />
            </button>
          </div>
        </header>

        <main className='flex-1 space-y-6 p-6'>
          {screen !== 'dashboard' ? (
            <StubSurface title={stubBlurbs[screen].title} blurb={stubBlurbs[screen].blurb} />
          ) : (
            <>
              <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                <KpiCard label="Today's sessions" value={String(sessionsToday)} />
                <KpiCard label='Pending review' value={String(pendingCount)} />
                <KpiCard label='Confirmed value' value={formatPeso(confirmedValue)} />
                <KpiCard label='Walk-ins' value={String(walkInCount)} />
              </section>

              <section className='space-y-3'>
                <div className='flex flex-wrap items-center gap-3'>
                  <select
                    value={filters.branchId}
                    onChange={(e) => setFilters((f) => ({ ...f, branchId: e.currentTarget.value }))}
                    aria-label='Filter by branch'
                    className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none'
                  >
                    <option value='all'>All branches</option>
                    {prototypeBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        status: e.currentTarget.value as typeof f.status,
                      }))
                    }
                    aria-label='Filter by status'
                    className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none'
                  >
                    <option value='all'>All statuses</option>
                    {prototypeStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', '-')}
                      </option>
                    ))}
                  </select>
                  <p className='text-muted-foreground ml-auto font-mono text-xs'>
                    {visible.length} / {rows.length} appointments
                  </p>
                </div>

                <AppointmentsTable appointments={visible} onStatusChange={onStatusChange} />

                <p className='text-muted-foreground h-4 font-mono text-xs' aria-live='polite'>
                  {lastUpdate ? `status updated — ${lastUpdate}` : ''}
                </p>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className='bg-card text-card-foreground rounded-xl border p-4 shadow-sm'>
      <p className='text-muted-foreground text-xs tracking-wide uppercase'>{label}</p>
      <p className='mt-1 text-2xl font-semibold'>{value}</p>
    </article>
  );
}
