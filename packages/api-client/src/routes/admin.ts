/**
 * Admin wrappers (M5 #139, ADR-0006): the gated /api/v1/admin subtree's
 * client surface. Every response passes unwrap() — a shape drift from the
 * API fails loudly here. Grows with the CMS tickets (#140 matrices riders,
 * #141 gallery/testimonials/lookups).
 */
import type {
  Attire,
  Branch,
  MediaPresignResponse,
  PrintSize,
  ServicePackageRead,
  StudioServiceWithBranches,
} from '@sevendays/types';
import {
  attireSchema,
  branchSchema,
  mediaPresignResponseSchema,
  printSizeSchema,
  servicePackageReadSchema,
  studioServiceWithBranchesSchema,
} from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import type { RpcClient } from '../client.js';
import { unwrap } from '../unwrap.js';

// Type-flow law (pinned): every path rides the admin subtree of the built
// AppType — a route rename in the API breaks THIS file's compile (the
// drift-kill). Bracket notation for the hyphenated segment keys.
type AdminRpc = RpcClient['api']['v1']['admin'];

// service-packages (the atomic package save, M5 § Mutation shapes).
type GetAdminPackageEndpoint = AdminRpc['service-packages'][':id']['$get'];
type CreateAdminPackageEndpoint = AdminRpc['service-packages']['$post'];
type UpdateAdminPackageEndpoint = AdminRpc['service-packages'][':id']['$put'];

/**
 * The atomic save's POST body, as the RPC surface declares it — the zod
 * INPUT side of createServicePackageSchema (the CreateAppointmentArgs
 * precedent: defaulted fields optional, no hand-typing).
 */
export type CreateServicePackageArgs = InferRequestType<CreateAdminPackageEndpoint>['json'];

/** The PUT args: path id + the full-object update payload. */
export type UpdateServicePackageArgs = InferRequestType<UpdateAdminPackageEndpoint>;

/** One admin package read's args: `{ param: { id } }`. */
export type GetAdminPackageArgs = InferRequestType<GetAdminPackageEndpoint>;

// branches.
type GetAdminBranchEndpoint = AdminRpc['branches'][':id']['$get'];
type CreateAdminBranchEndpoint = AdminRpc['branches']['$post'];
type UpdateAdminBranchEndpoint = AdminRpc['branches'][':id']['$put'];

type GetAdminBranchArgs = InferRequestType<GetAdminBranchEndpoint>;
type CreateAdminBranchArgs = InferRequestType<CreateAdminBranchEndpoint>['json'];
type UpdateAdminBranchArgs = InferRequestType<UpdateAdminBranchEndpoint>;

// studio-services (incl. the full-replace branch matrix PUT).
type GetAdminStudioServiceEndpoint = AdminRpc['studio-services'][':id']['$get'];
type CreateAdminStudioServiceEndpoint = AdminRpc['studio-services']['$post'];
type UpdateAdminStudioServiceEndpoint = AdminRpc['studio-services'][':id']['$put'];
type SetBranchMatrixEndpoint = AdminRpc['studio-services'][':id']['branches']['$put'];

type GetAdminStudioServiceArgs = InferRequestType<GetAdminStudioServiceEndpoint>;
type CreateAdminStudioServiceArgs = InferRequestType<CreateAdminStudioServiceEndpoint>['json'];
type UpdateAdminStudioServiceArgs = InferRequestType<UpdateAdminStudioServiceEndpoint>;
type SetBranchMatrixArgs = InferRequestType<SetBranchMatrixEndpoint>;

// media (ticket 02's presign route).
type PresignEndpoint = AdminRpc['media']['presign']['$post'];

/** The presign request body, as the RPC surface declares it. */
export type PresignArgs = InferRequestType<PresignEndpoint>['json'];

/** Service Package wrappers over /api/v1/admin/service-packages (list+byId only for ticket 05's screens; create/update are the editor's atomic save). */
export function adminServicePackages(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/service-packages — ALL packages incl. deactivated, coverImageUrl-resolved. */
    async list(): Promise<ServicePackageRead[]> {
      const res = await raw.api.v1.admin['service-packages'].$get();
      return unwrap(res, servicePackageReadSchema.array());
    },
    /** GET /api/v1/admin/service-packages/:id — one package incl. deactivated; 404 when unknown. */
    async byId(args: GetAdminPackageArgs): Promise<ServicePackageRead> {
      const res = await raw.api.v1.admin['service-packages'][':id'].$get(args);
      return unwrap(res, servicePackageReadSchema);
    },
    /** POST /api/v1/admin/service-packages — the atomic save; 201 with the created read (slug server-generated). */
    async create(json: CreateServicePackageArgs): Promise<ServicePackageRead> {
      const res = await raw.api.v1.admin['service-packages'].$post({ json });
      return unwrap(res, servicePackageReadSchema);
    },
    /** PUT /api/v1/admin/service-packages/:id — the atomic save (full-object PUT); the refreshed read. */
    async update(args: UpdateServicePackageArgs): Promise<ServicePackageRead> {
      const res = await raw.api.v1.admin['service-packages'][':id'].$put(args);
      return unwrap(res, servicePackageReadSchema);
    },
  };
}

/** Branch wrappers over /api/v1/admin/branches (list+byId are ticket 05's calls; create/update ride along for #140). */
export function adminBranches(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/branches — ALL branches incl. deactivated. */
    async list(): Promise<Branch[]> {
      const res = await raw.api.v1.admin.branches.$get();
      return unwrap(res, branchSchema.array());
    },
    /** GET /api/v1/admin/branches/:id — one branch; 404 when unknown. */
    async byId(args: GetAdminBranchArgs): Promise<Branch> {
      const res = await raw.api.v1.admin.branches[':id'].$get(args);
      return unwrap(res, branchSchema);
    },
    /** POST /api/v1/admin/branches — 201 with the created branch. */
    async create(json: CreateAdminBranchArgs): Promise<Branch> {
      const res = await raw.api.v1.admin.branches.$post({ json });
      return unwrap(res, branchSchema);
    },
    /** PUT /api/v1/admin/branches/:id — full-object update; the refreshed branch. */
    async update(args: UpdateAdminBranchArgs): Promise<Branch> {
      const res = await raw.api.v1.admin.branches[':id'].$put(args);
      return unwrap(res, branchSchema);
    },
  };
}

/** Studio Service wrappers over /api/v1/admin/studio-services (list+byId for ticket 05; create/update/matrix ride along for #140). */
export function adminStudioServices(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/studio-services — ALL studio services with embedded bookableBranchIds + applicableAddonServiceIds. */
    async list(): Promise<StudioServiceWithBranches[]> {
      const res = await raw.api.v1.admin['studio-services'].$get();
      return unwrap(res, studioServiceWithBranchesSchema.array());
    },
    /** GET /api/v1/admin/studio-services/:id — one studio service with the embeds; 404 when unknown. */
    async byId(args: GetAdminStudioServiceArgs): Promise<StudioServiceWithBranches> {
      const res = await raw.api.v1.admin['studio-services'][':id'].$get(args);
      return unwrap(res, studioServiceWithBranchesSchema);
    },
    /** POST /api/v1/admin/studio-services — 201 with the created read. */
    async create(json: CreateAdminStudioServiceArgs): Promise<StudioServiceWithBranches> {
      const res = await raw.api.v1.admin['studio-services'].$post({ json });
      return unwrap(res, studioServiceWithBranchesSchema);
    },
    /** PUT /api/v1/admin/studio-services/:id — full-object update; the refreshed read. */
    async update(args: UpdateAdminStudioServiceArgs): Promise<StudioServiceWithBranches> {
      const res = await raw.api.v1.admin['studio-services'][':id'].$put(args);
      return unwrap(res, studioServiceWithBranchesSchema);
    },
    /** PUT /api/v1/admin/studio-services/:id/branches — full-replace bookability matrix; the refreshed read. */
    async setBranchMatrix(args: SetBranchMatrixArgs): Promise<StudioServiceWithBranches> {
      const res = await raw.api.v1.admin['studio-services'][':id']['branches'].$put(args);
      return unwrap(res, studioServiceWithBranchesSchema);
    },
  };
}

/** Print Size wrappers over /api/v1/admin/print-sizes — GET-only (AQ-2: the package editor's lookup vocabulary incl. deactivated rows; CRUD is #141's). */
export function adminPrintSizes(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/print-sizes — ALL print sizes incl. deactivated. */
    async list(): Promise<PrintSize[]> {
      const res = await raw.api.v1.admin['print-sizes'].$get();
      return unwrap(res, printSizeSchema.array());
    },
  };
}

/** Attire wrappers over /api/v1/admin/attires — GET-only (AQ-2, same ruling as print sizes; CRUD is #141's). */
export function adminAttires(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/attires — ALL attires incl. deactivated. */
    async list(): Promise<Attire[]> {
      const res = await raw.api.v1.admin.attires.$get();
      return unwrap(res, attireSchema.array());
    },
  };
}

/** Media wrappers over /api/v1/admin/media (ticket 02's presign route). */
export function adminMedia(raw: RpcClient) {
  return {
    /** POST /api/v1/admin/media/presign — purpose+contentType in, staging key + type-enforced upload URL out (ADR-0019). */
    async presign(json: PresignArgs): Promise<MediaPresignResponse> {
      const res = await raw.api.v1.admin.media.presign.$post({ json });
      return unwrap(res, mediaPresignResponseSchema);
    },
  };
}

/** The gated admin subtree's client surface: one group per resource (ApiClient.admin). */
export function adminRoutes(raw: RpcClient) {
  return {
    servicePackages: adminServicePackages(raw),
    branches: adminBranches(raw),
    studioServices: adminStudioServices(raw),
    printSizes: adminPrintSizes(raw),
    attires: adminAttires(raw),
    media: adminMedia(raw),
  };
}
