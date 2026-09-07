import type { AppointmentWithAddons } from '@sevendays/types';
import { appointmentWithAddonsSchema } from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

type CreateEndpoint = RpcClient['api']['v1']['appointments']['$post'];
type GetEndpoint = RpcClient['api']['v1']['appointments'][':id']['$get'];

/**
 * Create input as the RPC surface declares it — the zod INPUT side of
 * createAppointmentSchema: timestamps as ISO strings, addonServiceIds and
 * notes optional, and NO price field (the server snapshots the price).
 */
export type CreateAppointmentArgs = InferRequestType<CreateEndpoint>['json'];

/**
 * The single-get endpoint's declared input: `{ param: { id: string } }`
 * (the route's z.uuid() param schema shapes the type; the wrapper passes
 * the caller's string through — validation is the API's job, and a
 * non-uuid surfaces as ApiClientError(400) through unwrap).
 */
export type GetAppointmentArgs = InferRequestType<GetEndpoint>;

/** Appointment wrappers: list + single-get + create under /api/v1/appointments. */
export function appointmentsRoutes(raw: RpcClient) {
  return {
    /** GET /api/v1/appointments — newest-first, optional branch filter, 200 cap. */
    async list(
      args: { query: { branchId?: string } } = { query: {} }
    ): Promise<AppointmentWithAddons[]> {
      const res = await raw.api.v1.appointments.$get(args);
      return unwrap(res, appointmentWithAddonsSchema.array());
    },
    /** GET /api/v1/appointments/:id — single record; 404 when unknown. */
    async get(args: GetAppointmentArgs): Promise<AppointmentWithAddons> {
      const res = await raw.api.v1.appointments[':id'].$get(args);
      return unwrap(res, appointmentWithAddonsSchema);
    },
    /** POST /api/v1/appointments — 201 with the created record + add-ons. */
    async create(json: CreateAppointmentArgs): Promise<AppointmentWithAddons> {
      const res = await raw.api.v1.appointments.$post({ json });
      return unwrap(res, appointmentWithAddonsSchema);
    },
  };
}
