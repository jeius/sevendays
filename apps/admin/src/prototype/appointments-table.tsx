// PROTOTYPE (throwaway) — wayfinder #59: the one dashboard content module
// shared by all three shell variants, so reactions compare shells and IA,
// not table styling. Hand-rolled from semantic tokens only — no component
// library (that's milestone work).
import {
  branchShortName,
  formatDayLabel,
  formatPeso,
  formatTimeLabel,
  type PrototypeAppointment,
  type PrototypeStatus,
  prototypeStatuses,
} from './data';

const statusBadgeClass: Record<PrototypeStatus, string> = {
  pending: 'border-border bg-secondary text-secondary-foreground',
  confirmed: 'border-primary/30 bg-primary/10 text-primary',
  completed: 'border-foreground/20 bg-foreground/5 text-foreground',
  cancelled: 'border-destructive/30 bg-destructive/10 text-destructive',
  no_show: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

const statusLabel: Record<PrototypeStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export function AppointmentsTable({
  appointments,
  onStatusChange,
  dense = false,
}: {
  appointments: PrototypeAppointment[];
  onStatusChange: (id: string, status: PrototypeStatus) => void;
  dense?: boolean;
}) {
  const cell = dense ? 'px-2 py-1.5' : 'px-4 py-3';
  const text = dense ? 'text-xs' : 'text-sm';

  if (appointments.length === 0) {
    return (
      <p className='text-muted-foreground rounded-lg border border-dashed border-border p-6 text-center text-sm'>
        No appointments match these filters.
      </p>
    );
  }

  return (
    <div className='overflow-x-auto rounded-lg border border-border'>
      <table className='w-full border-collapse text-left'>
        <thead>
          <tr className='bg-muted/50 text-muted-foreground text-xs tracking-wide uppercase'>
            <th className={`${cell} font-medium`}>Customer</th>
            <th className={`${cell} font-medium`}>Offering</th>
            <th className={`${cell} font-medium`}>Branch</th>
            <th className={`${cell} font-medium`}>When</th>
            <th className={`${cell} font-medium`}>Price</th>
            <th className={`${cell} font-medium`}>Status</th>
          </tr>
        </thead>
        <tbody className={text}>
          {appointments.map((a) => (
            <tr
              key={a.id}
              className='border-border border-t hover:bg-muted/30'
              title={a.notes ?? undefined}
            >
              <td className={cell}>
                <div className='text-foreground font-medium'>{a.customerName}</div>
                <div className='text-muted-foreground text-xs'>{a.customerEmail}</div>
              </td>
              <td className={cell}>
                <div className='text-foreground'>{a.offering}</div>
                <div className='text-muted-foreground text-xs'>
                  {a.offeringKind === 'package' ? 'Package' : 'Studio service'}
                  {a.kind === 'walk_in' ? ' · walk-in' : ''}
                  {a.kind === 'visitation' ? ' · visitation' : ''}
                </div>
              </td>
              <td className={`${cell} text-muted-foreground`}>{branchShortName(a.branchId)}</td>
              <td className={`${cell} font-mono text-xs whitespace-nowrap`}>
                <span className='text-foreground'>{formatDayLabel(a.scheduledAt)}</span>
                <span className='text-muted-foreground'> · {formatTimeLabel(a.scheduledAt)}</span>
              </td>
              <td className={`${cell} font-mono whitespace-nowrap`}>
                {formatPeso(a.bookedPriceCents)}
              </td>
              <td className={cell}>
                <div className='flex items-center gap-2 whitespace-nowrap'>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass[a.status]}`}
                  >
                    {statusLabel[a.status]}
                  </span>
                  <select
                    value={a.status}
                    onChange={(e) => onStatusChange(a.id, e.currentTarget.value as PrototypeStatus)}
                    aria-label={`Update status for ${a.customerName}`}
                    className='border-input bg-background text-foreground focus-visible:ring-ring rounded-md border px-1.5 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none'
                  >
                    {prototypeStatuses.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
