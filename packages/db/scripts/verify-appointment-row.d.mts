import postgres from 'postgres';

export interface AppointmentProbeAddon {
  addonServiceId: string;
  name: string;
  priceCents: number;
}

export interface AppointmentProbeExpected {
  id: string;
  branchId: string;
  servicePackageId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string | null;
  kind: string;
  status: string;
  packagePriceCents: number;
  scheduledAt?: string;
  addonServices?: AppointmentProbeAddon[];
}

export interface AppointmentProbeResult {
  ok: boolean;
  reason?: 'not_found';
  row?: Record<string, unknown>;
  addons?: Record<string, unknown>[];
  failed?: { label: string; ok: boolean }[];
}

export function assertAppointmentRecord(
  sql: postgres.Sql,
  expected: AppointmentProbeExpected
): Promise<AppointmentProbeResult>;

export function deleteAppointmentRow(sql: postgres.Sql, id: string): Promise<{ deleted: boolean }>;

export function assertAppointmentAbsent(
  sql: postgres.Sql,
  id: string
): Promise<{ absent: boolean }>;
