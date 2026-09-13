// PROTOTYPE (throwaway) — wayfinder #59 variant C: icon-rail shell.
// Narrow always-visible icon rail (labels via tooltip), full-width content
// with no max-width — the most "tool" of the three and the one that
// anticipates M5's wide CMS editors (image-heavy package editing) most
// directly. Dense table, mono micro-stats, minimal chrome.
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
  formatPeso,
  prototypeBranches,
  prototypeStatuses,
  usePrototypeAppointments,
} from './data';
import { type StubScreen, StubSurface, stubBlurbs } from './stub-surface';

type Screen = 'dashboard' | StubScreen;

const railItems: { id: Screen; label: string; icon: LucideIcon; group: number }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 0 },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, group: 0 },
  { id: 'packages', label: 'Packages', icon: Package, group: 1 },
  { id: 'addons', label: 'Add-ons', icon: PlusCircle, group: 1 },
  { id: 'services', label: 'Studio services', icon: Wrench, group: 1 },
  { id: 'branches', label: 'Branches', icon: MapPin, group: 2 },
  { id: 'settings', label: 'Settings', icon: Settings, group: 2 },
];

export function VariantCRail() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const { rows, visible, filters, setFilters, updateStatus } = usePrototypeAppointments();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const sessionsToday = rows.filter((r) => dayOffsetOf(r.scheduledAt) === 0).length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const confirmedValue = rows
    .filter((r) => r.status === 'confirmed' || r.status === 'completed')
    .reduce((sum, r) => sum + r.bookedPriceCents, 0);

  const onStatusChange = (id: string, status: (typeof prototypeStatuses)[number]) => {
    updateStatus(id, status);
    const row = rows.find((r) => r.id === id);
    if (row) setLastUpdate(`${row.customerName} → ${status}`);
  };

  let lastGroup = -1;

  return (
    <div className='bg-background text-foreground flex min-h-dvh' data-shell-variant='c'>
      <aside className='bg-sidebar border-sidebar-border sticky top-0 flex h-dvh w-16 shrink-0 flex-col items-center border-r py-3'>
        <span className='bg-sidebar-primary text-sidebar-primary-foreground mb-2 flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
          7d
        </span>
        <nav className='flex flex-1 flex-col items-center gap-1'>
          {railItems.map((item) => {
            const divider = lastGroup !== -1 && item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id} className='flex flex-col items-center'>
                {divider && <span className='border-sidebar-border my-1 block h-px w-8 border-t' />}
                <button
                  type='button'
                  onClick={() => setScreen(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={screen === item.id ? 'page' : undefined}
                  className={`flex size-10 items-center justify-center rounded-lg transition-colors ${
                    screen === item.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  }`}
                >
                  <item.icon className='size-4.5' aria-hidden='true' />
                </button>
              </div>
            );
          })}
        </nav>
        <span className='bg-primary text-primary-foreground mt-2 flex size-8 items-center justify-center rounded-full text-xs font-semibold'>
          SO
        </span>
      </aside>

      <div className='min-w-0 flex-1 p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 className='text-lg font-semibold tracking-tight'>
              {screen === 'dashboard' ? 'Dashboard' : stubBlurbs[screen].title}
            </h1>
            <p className='text-muted-foreground mt-1 font-mono text-[0.65rem] tracking-widest uppercase'>
              {screen === 'dashboard'
                ? 'sevendays admin — all branches'
                : 'stub surface — later milestone'}
            </p>
          </div>
          {screen === 'dashboard' && (
            <div className='flex items-center gap-3'>
              <select
                value={filters.branchId}
                onChange={(e) => setFilters((f) => ({ ...f, branchId: e.currentTarget.value }))}
                aria-label='Filter by branch'
                className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-2.5 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none'
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
                className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-2.5 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none'
              >
                <option value='all'>All statuses</option>
                {prototypeStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', '-')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {screen !== 'dashboard' ? (
          <div className='mt-6'>
            <StubSurface title={stubBlurbs[screen].title} blurb={stubBlurbs[screen].blurb} />
          </div>
        ) : (
          <div className='mt-4 space-y-3'>
            <div className='flex flex-wrap gap-2'>
              <StatChip label='today' value={String(sessionsToday)} />
              <StatChip label='pending' value={String(pendingCount)} />
              <StatChip label='confirmed value' value={formatPeso(confirmedValue)} />
              <StatChip label='showing' value={`${visible.length}/${rows.length}`} />
            </div>
            <AppointmentsTable appointments={visible} onStatusChange={onStatusChange} dense />
            <p className='text-muted-foreground h-4 font-mono text-xs' aria-live='polite'>
              {lastUpdate ? `status updated — ${lastUpdate}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className='border-border bg-card text-muted-foreground rounded-md border px-2 py-1 font-mono text-xs'>
      {label} <span className='text-foreground font-semibold'>{value}</span>
    </span>
  );
}
