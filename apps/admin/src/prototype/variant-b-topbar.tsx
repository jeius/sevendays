// PROTOTYPE (throwaway) — wayfinder #59 variant B: top-bar shell.
// No sidebar: one sticky top nav with a two-tier Catalog section (the
// Catalog button reveals a secondary row), centered content column, and a
// compact page header with inline stats instead of KPI cards. Structurally
// the opposite bet from A: horizontal IA, narrower content, less chrome.
import type { LucideIcon } from 'lucide-react';
import {
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
  prototypeBranches,
  prototypeStatuses,
  usePrototypeAppointments,
} from './data';
import { type StubScreen, StubSurface, stubBlurbs } from './stub-surface';

type Screen = 'dashboard' | StubScreen;

const primaryNav: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'branches', label: 'Branches', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const catalogNav: { id: StubScreen; label: string; icon: LucideIcon }[] = [
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'addons', label: 'Add-ons', icon: PlusCircle },
  { id: 'services', label: 'Studio services', icon: Wrench },
];

const isCatalogScreen = (s: Screen) => s === 'packages' || s === 'addons' || s === 'services';

export function VariantBTopbar() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const { rows, visible, filters, setFilters, updateStatus } = usePrototypeAppointments();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const todayCount = rows.filter((r) => dayOffsetOf(r.scheduledAt) === 0).length;

  const onStatusChange = (id: string, status: (typeof prototypeStatuses)[number]) => {
    updateStatus(id, status);
    const row = rows.find((r) => r.id === id);
    if (row) setLastUpdate(`${row.customerName} → ${status}`);
  };

  const navButtonClass = (active: boolean) =>
    `flex items-center gap-2 border-b-2 px-1 py-1 text-sm transition-colors ${
      active
        ? 'border-primary text-foreground font-medium'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className='bg-background text-foreground min-h-dvh' data-shell-variant='b'>
      <header className='bg-background/95 sticky top-0 z-10 border-b border-border backdrop-blur'>
        <div className='mx-auto flex h-14 max-w-6xl items-center gap-6 px-6'>
          <div className='flex items-center gap-2.5'>
            <span className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold'>
              7d
            </span>
            <span className='text-sm font-semibold tracking-tight'>Sevendays Admin</span>
          </div>
          <nav className='flex items-center gap-5'>
            {primaryNav.map((item) => (
              <button
                key={item.id}
                type='button'
                onClick={() => setScreen(item.id)}
                aria-current={screen === item.id ? 'page' : undefined}
                className={navButtonClass(screen === item.id)}
              >
                <item.icon className='size-4' aria-hidden='true' />
                <span className='hidden sm:inline'>{item.label}</span>
              </button>
            ))}
            <button
              type='button'
              onClick={() => {
                setCatalogOpen((o) => !o || !isCatalogScreen(screen));
                if (!catalogOpen && !isCatalogScreen(screen)) setScreen('packages');
              }}
              aria-expanded={catalogOpen}
              aria-current={isCatalogScreen(screen) ? 'page' : undefined}
              className={navButtonClass(isCatalogScreen(screen))}
            >
              <Package className='size-4' aria-hidden='true' />
              <span className='hidden sm:inline'>Catalog</span>
            </button>
          </nav>
          <span className='bg-secondary text-secondary-foreground ml-auto flex size-8 items-center justify-center rounded-full text-xs font-semibold'>
            SO
          </span>
        </div>
        {catalogOpen && (
          <div className='border-border bg-muted/40 border-t'>
            <div className='mx-auto flex max-w-6xl items-center gap-2 px-6 py-2'>
              <span className='text-muted-foreground mr-1 font-mono text-[0.65rem] tracking-widest uppercase'>
                Catalog
              </span>
              {catalogNav.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setScreen(item.id)}
                  aria-current={screen === item.id ? 'page' : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                    screen === item.id
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground border'
                  }`}
                >
                  <item.icon className='size-3.5' aria-hidden='true' />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className='mx-auto max-w-6xl space-y-6 px-6 py-8'>
        {screen !== 'dashboard' ? (
          <StubSurface title={stubBlurbs[screen].title} blurb={stubBlurbs[screen].blurb} />
        ) : (
          <>
            <div className='flex flex-wrap items-end justify-between gap-4'>
              <div>
                <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
                <p className='text-muted-foreground mt-1 font-mono text-xs'>
                  {rows.length} bookings · {pendingCount} pending · {todayCount} today
                </p>
              </div>
              <div className='flex items-center gap-3'>
                <select
                  value={filters.branchId}
                  onChange={(e) => setFilters((f) => ({ ...f, branchId: e.currentTarget.value }))}
                  aria-label='Filter by branch'
                  className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none'
                >
                  <option value='all'>All branches</option>
                  {prototypeBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.shortName}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, status: e.currentTarget.value as typeof f.status }))
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
              </div>
            </div>

            <AppointmentsTable appointments={visible} onStatusChange={onStatusChange} />

            <p className='text-muted-foreground h-4 font-mono text-xs' aria-live='polite'>
              {lastUpdate ? `status updated — ${lastUpdate}` : ''}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
