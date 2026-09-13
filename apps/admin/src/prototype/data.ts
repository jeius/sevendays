// PROTOTYPE (throwaway) — wayfinder #59: admin app shell + IA variants.
// Mock data shaped like packages/db/src/schema/appointments.ts (same enum
// values, same field names) so the dashboard skeleton reacts against real
// shapes. Catalog literals mirror packages/db/scripts/catalog.ts seeds.
// Never shipped: the milestone spec owns the real admin build.
import { useCallback, useState } from 'react';

export type PrototypeStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PrototypeKind = 'scheduled' | 'walk_in' | 'visitation';

export interface PrototypeBranch {
  id: string;
  name: string;
  shortName: string;
  address: string;
}

export interface PrototypeAppointment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  branchId: string;
  offering: string;
  offeringKind: 'package' | 'studio_service';
  scheduledAt: Date;
  status: PrototypeStatus;
  kind: PrototypeKind;
  bookedPriceCents: number;
  notes: string | null;
}

export interface PrototypeFilters {
  branchId: string | 'all';
  status: PrototypeStatus | 'all';
}

export const prototypeStatuses: PrototypeStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
];

export const prototypeBranches: PrototypeBranch[] = [
  {
    id: 'br-calamba',
    name: 'Calamba Main Branch',
    shortName: 'Calamba',
    address: 'DBAN, Calamba, Misamis Occidental',
  },
  {
    id: 'br-iligan',
    name: 'Iligan Branch',
    shortName: 'Iligan',
    address: 'Iligan City, Lanao del Norte',
  },
  {
    id: 'br-dipolog',
    name: 'Dipolog Branch',
    shortName: 'Dipolog',
    address: 'Dipolog City, Zamboanga del Norte',
  },
];

// Anchored to today's midnight (not Date.now()) so SSR and client
// hydration render identical strings and the rows never rot into the past.
function todayAt(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const prototypeAppointments: PrototypeAppointment[] = [
  {
    id: 'ap-001',
    customerName: 'Juan dela Cruz',
    customerEmail: 'juan.delacruz@example.com',
    customerPhone: '+63 917 000 0001',
    branchId: 'br-calamba',
    offering: 'Basic Package',
    offeringKind: 'package',
    scheduledAt: todayAt(1, 10, 0),
    status: 'pending',
    kind: 'scheduled',
    bookedPriceCents: 90000,
    notes: null,
  },
  {
    id: 'ap-002',
    customerName: 'Maria Santos',
    customerEmail: 'maria.santos@example.com',
    customerPhone: '+63 917 000 0002',
    branchId: 'br-iligan',
    offering: 'Package B',
    offeringKind: 'package',
    scheduledAt: todayAt(0, 14, 0),
    status: 'confirmed',
    kind: 'scheduled',
    bookedPriceCents: 150000,
    notes: 'Wants the Filipiniana shots first.',
  },
  {
    id: 'ap-003',
    customerName: 'Angelo Reyes',
    customerEmail: 'angelo.reyes@example.com',
    customerPhone: '+63 917 000 0003',
    branchId: 'br-dipolog',
    offering: 'Package E',
    offeringKind: 'package',
    scheduledAt: todayAt(-1, 9, 0),
    status: 'completed',
    kind: 'scheduled',
    bookedPriceCents: 200000,
    notes: null,
  },
  {
    id: 'ap-004',
    customerName: 'Kristine Ramos',
    customerEmail: 'kristine.ramos@example.com',
    customerPhone: '+63 917 000 0004',
    branchId: 'br-calamba',
    offering: 'Package A',
    offeringKind: 'package',
    scheduledAt: todayAt(-1, 15, 0),
    status: 'no_show',
    kind: 'scheduled',
    bookedPriceCents: 110000,
    notes: 'No answer on follow-up call.',
  },
  {
    id: 'ap-005',
    customerName: 'Pedro Villanueva',
    customerEmail: 'pedro.villanueva@example.com',
    customerPhone: '+63 917 000 0005',
    branchId: 'br-iligan',
    offering: 'Photo Recovery',
    offeringKind: 'studio_service',
    scheduledAt: todayAt(1, 16, 30),
    status: 'confirmed',
    kind: 'scheduled',
    bookedPriceCents: 150000,
    notes: 'Bringing two scanned wedding photos.',
  },
  {
    id: 'ap-006',
    customerName: 'Ana Lim',
    customerEmail: 'ana.lim@example.com',
    customerPhone: '+63 917 000 0006',
    branchId: 'br-dipolog',
    offering: 'Package D',
    offeringKind: 'package',
    scheduledAt: todayAt(2, 11, 0),
    status: 'cancelled',
    kind: 'visitation',
    bookedPriceCents: 180000,
    notes: 'Cancelled — rescheduling next month.',
  },
  {
    id: 'ap-007',
    customerName: 'Jose Ocampo',
    customerEmail: 'jose.ocampo@example.com',
    customerPhone: '+63 917 000 0007',
    branchId: 'br-calamba',
    offering: 'Tarpaulin & Bulletin Printing',
    offeringKind: 'studio_service',
    scheduledAt: todayAt(0, 10, 30),
    status: 'pending',
    kind: 'walk_in',
    bookedPriceCents: 80000,
    notes: null,
  },
  {
    id: 'ap-008',
    customerName: 'Grace Fernandez',
    customerEmail: 'grace.fernandez@example.com',
    customerPhone: '+63 917 000 0008',
    branchId: 'br-iligan',
    offering: 'Package G',
    offeringKind: 'package',
    scheduledAt: todayAt(3, 13, 0),
    status: 'confirmed',
    kind: 'scheduled',
    bookedPriceCents: 300000,
    notes: null,
  },
  {
    id: 'ap-009',
    customerName: 'Miguel Torres',
    customerEmail: 'miguel.torres@example.com',
    customerPhone: '+63 917 000 0009',
    branchId: 'br-dipolog',
    offering: 'Basic Package',
    offeringKind: 'package',
    scheduledAt: todayAt(-2, 13, 30),
    status: 'completed',
    kind: 'walk_in',
    bookedPriceCents: 90000,
    notes: null,
  },
  {
    id: 'ap-010',
    customerName: 'Liza Aquino',
    customerEmail: 'liza.aquino@example.com',
    customerPhone: '+63 917 000 0010',
    branchId: 'br-calamba',
    offering: 'Package C',
    offeringKind: 'package',
    scheduledAt: todayAt(1, 9, 0),
    status: 'pending',
    kind: 'scheduled',
    bookedPriceCents: 160000,
    notes: 'Graduation rush — needs prints in five days.',
  },
  {
    id: 'ap-011',
    customerName: 'Rafael Mendoza',
    customerEmail: 'rafael.mendoza@example.com',
    customerPhone: '+63 917 000 0011',
    branchId: 'br-iligan',
    offering: 'Package H',
    offeringKind: 'package',
    scheduledAt: todayAt(2, 14, 0),
    status: 'confirmed',
    kind: 'scheduled',
    bookedPriceCents: 300000,
    notes: 'With Makeup + Hairstyle add-ons.',
  },
  {
    id: 'ap-012',
    customerName: 'Carmen Garcia',
    customerEmail: 'carmen.garcia@example.com',
    customerPhone: '+63 917 000 0012',
    branchId: 'br-dipolog',
    offering: 'Package F',
    offeringKind: 'package',
    scheduledAt: todayAt(-1, 16, 0),
    status: 'cancelled',
    kind: 'scheduled',
    bookedPriceCents: 220000,
    notes: null,
  },
];

export function formatPeso(cents: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100);
}

export function dayOffsetOf(date: Date): number {
  // Normalize BOTH sides to local midnight before diffing: carrying
  // time-of-day in the numerator mislabels afternoon rows by a day
  // (review finding, Task 2 round 1). Clone first — never mutate the row.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDayLabel(date: Date): string {
  const diff = dayOffsetOf(date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function branchShortName(branchId: string): string {
  return prototypeBranches.find((b) => b.id === branchId)?.shortName ?? branchId;
}

export function filterAppointments(
  rows: PrototypeAppointment[],
  filters: PrototypeFilters
): PrototypeAppointment[] {
  return rows.filter(
    (r) =>
      (filters.branchId === 'all' || r.branchId === filters.branchId) &&
      (filters.status === 'all' || r.status === filters.status)
  );
}

// In-memory only (prototype rule): the status-update interaction is the
// thing being prototyped, so state stays client-side and resets on reload.
export function usePrototypeAppointments() {
  const [rows, setRows] = useState(prototypeAppointments);
  const [filters, setFilters] = useState<PrototypeFilters>({ branchId: 'all', status: 'all' });
  const visible = filterAppointments(rows, filters);
  const updateStatus = useCallback((id: string, status: PrototypeStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);
  return { rows, visible, filters, setFilters, updateStatus };
}
