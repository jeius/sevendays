/**
 * Admin wrappers (M5 #139, ADR-0006): the gated /api/v1/admin subtree's
 * client surface. Every response passes unwrap() — a shape drift from the
 * API fails loudly here. Grows with the CMS tickets (#140 matrices riders,
 * #141 gallery/testimonials/lookups).
 */
import type {
  AddonService,
  Attire,
  Branch,
  GalleryCategory,
  GalleryPhoto,
  MediaPresignResponse,
  PrintSize,
  ServicePackageRead,
  StudioServiceWithBranches,
  Testimonial,
} from '@sevendays/types';
import {
  addonServiceSchema,
  attireSchema,
  branchSchema,
  galleryCategorySchema,
  galleryPhotoSchema,
  mediaPresignResponseSchema,
  printSizeSchema,
  servicePackageReadSchema,
  studioServiceWithBranchesSchema,
  testimonialSchema,
} from '@sevendays/types';
import type { InferRequestType } from 'hono/client';
import type { RpcClient } from '../client.js';
import { unwrap, unwrapError } from '../unwrap.js';

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
type SetAddonMatrixEndpoint = AdminRpc['studio-services'][':id']['addons']['$put'];

type GetAdminStudioServiceArgs = InferRequestType<GetAdminStudioServiceEndpoint>;
type CreateAdminStudioServiceArgs = InferRequestType<CreateAdminStudioServiceEndpoint>['json'];
type UpdateAdminStudioServiceArgs = InferRequestType<UpdateAdminStudioServiceEndpoint>;

/** The studio-service branch-matrix PUT args: path id + the full-replace `{ branchIds }` body. */
export type SetBranchMatrixArgs = InferRequestType<SetBranchMatrixEndpoint>;
/** The studio-service addon-matrix PUT args: path id + the full-replace `{ addonServiceIds }` body. */
export type SetAddonMatrixArgs = InferRequestType<SetAddonMatrixEndpoint>;

// addon-services (CRUD rides along for #140).
type GetAdminAddonEndpoint = AdminRpc['addon-services'][':id']['$get'];
type CreateAdminAddonEndpoint = AdminRpc['addon-services']['$post'];
type UpdateAdminAddonEndpoint = AdminRpc['addon-services'][':id']['$put'];

type GetAdminAddonArgs = InferRequestType<GetAdminAddonEndpoint>;
/** The addon create body, as the RPC surface declares it. */
export type CreateAddonArgs = InferRequestType<CreateAdminAddonEndpoint>['json'];
/** The addon PUT args: path id + the full-object update payload. */
export type UpdateAddonArgs = InferRequestType<UpdateAdminAddonEndpoint>;

// gallery-categories (#141: CRUD + the display-order PUT).
type GetAdminGalleryCategoryEndpoint = AdminRpc['gallery-categories'][':id']['$get'];
type CreateAdminGalleryCategoryEndpoint = AdminRpc['gallery-categories']['$post'];
type UpdateAdminGalleryCategoryEndpoint = AdminRpc['gallery-categories'][':id']['$put'];
type SetGalleryCategoryOrderEndpoint = AdminRpc['gallery-categories']['order']['$put'];

type GetAdminGalleryCategoryArgs = InferRequestType<GetAdminGalleryCategoryEndpoint>;
/** The gallery-category create body, as the RPC surface declares it. */
export type CreateGalleryCategoryArgs =
  InferRequestType<CreateAdminGalleryCategoryEndpoint>['json'];
/** The gallery-category PUT args: path id + the full-object update payload. */
export type UpdateGalleryCategoryArgs = InferRequestType<UpdateAdminGalleryCategoryEndpoint>;
/** The gallery-category order PUT body: the full-replace `{ categoryIds }` list. */
export type GalleryCategoryOrderArgs = InferRequestType<SetGalleryCategoryOrderEndpoint>['json'];

// gallery-photos (#141: CRUD + order + the binary by-id thumb seam).
type GetAdminGalleryPhotoEndpoint = AdminRpc['gallery-photos'][':id']['$get'];
type CreateAdminGalleryPhotoEndpoint = AdminRpc['gallery-photos']['$post'];
type UpdateAdminGalleryPhotoEndpoint = AdminRpc['gallery-photos'][':id']['$put'];
type SetGalleryPhotoOrderEndpoint = AdminRpc['gallery-photos']['order']['$put'];
type GetGalleryPhotoThumbEndpoint = AdminRpc['gallery-photos'][':id']['thumb']['$get'];

type GetAdminGalleryPhotoArgs = InferRequestType<GetAdminGalleryPhotoEndpoint>;
/** The gallery-photo create body, as the RPC surface declares it. */
export type CreateGalleryPhotoArgs = InferRequestType<CreateAdminGalleryPhotoEndpoint>['json'];
/** The gallery-photo PUT args: path id + the full-object update payload. */
export type UpdateGalleryPhotoArgs = InferRequestType<UpdateAdminGalleryPhotoEndpoint>;
/** The gallery-photo order PUT body: the full-replace `{ photoIds }` list. */
export type GalleryPhotoOrderArgs = InferRequestType<SetGalleryPhotoOrderEndpoint>['json'];
/** The by-id thumb GET args: `{ param: { id } }`. */
export type GetGalleryPhotoThumbArgs = InferRequestType<GetGalleryPhotoThumbEndpoint>;

// testimonials (#141: CRUD + the display-order PUT).
type GetAdminTestimonialEndpoint = AdminRpc['testimonials'][':id']['$get'];
type CreateAdminTestimonialEndpoint = AdminRpc['testimonials']['$post'];
type UpdateAdminTestimonialEndpoint = AdminRpc['testimonials'][':id']['$put'];
type SetTestimonialOrderEndpoint = AdminRpc['testimonials']['order']['$put'];

type GetAdminTestimonialArgs = InferRequestType<GetAdminTestimonialEndpoint>;
/** The testimonial create body, as the RPC surface declares it. */
export type CreateTestimonialArgs = InferRequestType<CreateAdminTestimonialEndpoint>['json'];
/** The testimonial PUT args: path id + the full-object update payload. */
export type UpdateTestimonialArgs = InferRequestType<UpdateAdminTestimonialEndpoint>;
/** The testimonial order PUT body: the full-replace `{ testimonialIds }` list. */
export type TestimonialOrderArgs = InferRequestType<SetTestimonialOrderEndpoint>['json'];

// print-sizes (#141 CRUD growth from #139's GET-only lookup rider).
type GetAdminPrintSizeEndpoint = AdminRpc['print-sizes'][':id']['$get'];
type CreateAdminPrintSizeEndpoint = AdminRpc['print-sizes']['$post'];
type UpdateAdminPrintSizeEndpoint = AdminRpc['print-sizes'][':id']['$put'];

type GetAdminPrintSizeArgs = InferRequestType<GetAdminPrintSizeEndpoint>;
/** The print-size create body, as the RPC surface declares it. */
export type CreatePrintSizeArgs = InferRequestType<CreateAdminPrintSizeEndpoint>['json'];
/** The print-size PUT args: path id + the full-object update payload. */
export type UpdatePrintSizeArgs = InferRequestType<UpdateAdminPrintSizeEndpoint>;

// attires (#141 CRUD growth from #139's GET-only lookup rider).
type GetAdminAttireEndpoint = AdminRpc['attires'][':id']['$get'];
type CreateAdminAttireEndpoint = AdminRpc['attires']['$post'];
type UpdateAdminAttireEndpoint = AdminRpc['attires'][':id']['$put'];

type GetAdminAttireArgs = InferRequestType<GetAdminAttireEndpoint>;
/** The attire create body, as the RPC surface declares it. */
export type CreateAttireArgs = InferRequestType<CreateAdminAttireEndpoint>['json'];
/** The attire PUT args: path id + the full-object update payload. */
export type UpdateAttireArgs = InferRequestType<UpdateAdminAttireEndpoint>;

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
    /** PUT /api/v1/admin/studio-services/:id/addons — full-replace applicable-addons matrix; the refreshed read. */
    async setAddonMatrix(args: SetAddonMatrixArgs): Promise<StudioServiceWithBranches> {
      const res = await raw.api.v1.admin['studio-services'][':id']['addons'].$put(args);
      return unwrap(res, studioServiceWithBranchesSchema);
    },
  };
}

/** Add-on Service wrappers over /api/v1/admin/addon-services (CRUD rides along for #140). */
export function adminAddonServices(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/addon-services — ALL add-on services incl. deactivated. */
    async list(): Promise<AddonService[]> {
      const res = await raw.api.v1.admin['addon-services'].$get();
      return unwrap(res, addonServiceSchema.array());
    },
    /** GET /api/v1/admin/addon-services/:id — one add-on service; 404 when unknown. */
    async byId(args: GetAdminAddonArgs): Promise<AddonService> {
      const res = await raw.api.v1.admin['addon-services'][':id'].$get(args);
      return unwrap(res, addonServiceSchema);
    },
    /** POST /api/v1/admin/addon-services — 201 with the created add-on service. */
    async create(json: CreateAddonArgs): Promise<AddonService> {
      const res = await raw.api.v1.admin['addon-services'].$post({ json });
      return unwrap(res, addonServiceSchema);
    },
    /** PUT /api/v1/admin/addon-services/:id — full-object update; the refreshed add-on service. */
    async update(args: UpdateAddonArgs): Promise<AddonService> {
      const res = await raw.api.v1.admin['addon-services'][':id'].$put(args);
      return unwrap(res, addonServiceSchema);
    },
  };
}

/** Print Size wrappers over /api/v1/admin/print-sizes (#139's lookup list grew the full CRUD in #141 — the package editor's vocabulary incl. deactivated rows). */
export function adminPrintSizes(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/print-sizes — ALL print sizes incl. deactivated. */
    async list(): Promise<PrintSize[]> {
      const res = await raw.api.v1.admin['print-sizes'].$get();
      return unwrap(res, printSizeSchema.array());
    },
    /** GET /api/v1/admin/print-sizes/:id — one print size; 404 when unknown. */
    async byId(args: GetAdminPrintSizeArgs): Promise<PrintSize> {
      const res = await raw.api.v1.admin['print-sizes'][':id'].$get(args);
      return unwrap(res, printSizeSchema);
    },
    /** POST /api/v1/admin/print-sizes — 201 with the created print size. */
    async create(json: CreatePrintSizeArgs): Promise<PrintSize> {
      const res = await raw.api.v1.admin['print-sizes'].$post({ json });
      return unwrap(res, printSizeSchema);
    },
    /** PUT /api/v1/admin/print-sizes/:id — full-object update; the refreshed print size. */
    async update(args: UpdatePrintSizeArgs): Promise<PrintSize> {
      const res = await raw.api.v1.admin['print-sizes'][':id'].$put(args);
      return unwrap(res, printSizeSchema);
    },
  };
}

/** Attire wrappers over /api/v1/admin/attires (#139's lookup list grew the full CRUD in #141 — same growth as print sizes). */
export function adminAttires(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/attires — ALL attires incl. deactivated. */
    async list(): Promise<Attire[]> {
      const res = await raw.api.v1.admin.attires.$get();
      return unwrap(res, attireSchema.array());
    },
    /** GET /api/v1/admin/attires/:id — one attire; 404 when unknown. */
    async byId(args: GetAdminAttireArgs): Promise<Attire> {
      const res = await raw.api.v1.admin.attires[':id'].$get(args);
      return unwrap(res, attireSchema);
    },
    /** POST /api/v1/admin/attires — 201 with the created attire. */
    async create(json: CreateAttireArgs): Promise<Attire> {
      const res = await raw.api.v1.admin.attires.$post({ json });
      return unwrap(res, attireSchema);
    },
    /** PUT /api/v1/admin/attires/:id — full-object update; the refreshed attire. */
    async update(args: UpdateAttireArgs): Promise<Attire> {
      const res = await raw.api.v1.admin.attires[':id'].$put(args);
      return unwrap(res, attireSchema);
    },
  };
}

/** Gallery Category wrappers over /api/v1/admin/gallery-categories (CRUD + the display-order PUT, #141). */
export function adminGalleryCategories(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/gallery-categories — ALL categories incl. deactivated. */
    async list(): Promise<GalleryCategory[]> {
      const res = await raw.api.v1.admin['gallery-categories'].$get();
      return unwrap(res, galleryCategorySchema.array());
    },
    /** GET /api/v1/admin/gallery-categories/:id — one category; 404 when unknown. */
    async byId(args: GetAdminGalleryCategoryArgs): Promise<GalleryCategory> {
      const res = await raw.api.v1.admin['gallery-categories'][':id'].$get(args);
      return unwrap(res, galleryCategorySchema);
    },
    /** POST /api/v1/admin/gallery-categories — 201 with the created category (slug server-generated). */
    async create(json: CreateGalleryCategoryArgs): Promise<GalleryCategory> {
      const res = await raw.api.v1.admin['gallery-categories'].$post({ json });
      return unwrap(res, galleryCategorySchema);
    },
    /** PUT /api/v1/admin/gallery-categories/:id — full-object update; the refreshed category. */
    async update(args: UpdateGalleryCategoryArgs): Promise<GalleryCategory> {
      const res = await raw.api.v1.admin['gallery-categories'][':id'].$put(args);
      return unwrap(res, galleryCategorySchema);
    },
    /** PUT /api/v1/admin/gallery-categories/order — full-replace display order; the reordered list. */
    async setOrder(json: GalleryCategoryOrderArgs): Promise<GalleryCategory[]> {
      const res = await raw.api.v1.admin['gallery-categories']['order'].$put({ json });
      return unwrap(res, galleryCategorySchema.array());
    },
  };
}

/** Gallery Photo wrappers over /api/v1/admin/gallery-photos (CRUD + order + the binary by-id thumb seam, #141). */
export function adminGalleryPhotos(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/gallery-photos — ALL photos incl. deactivated, photoUrl resolved. */
    async list(): Promise<GalleryPhoto[]> {
      const res = await raw.api.v1.admin['gallery-photos'].$get();
      return unwrap(res, galleryPhotoSchema.array());
    },
    /** GET /api/v1/admin/gallery-photos/:id — one photo; 404 when unknown. */
    async byId(args: GetAdminGalleryPhotoArgs): Promise<GalleryPhoto> {
      const res = await raw.api.v1.admin['gallery-photos'][':id'].$get(args);
      return unwrap(res, galleryPhotoSchema);
    },
    /** POST /api/v1/admin/gallery-photos — 201 with the created photo (the staging key is commit-verified and promoted at persist). */
    async create(json: CreateGalleryPhotoArgs): Promise<GalleryPhoto> {
      const res = await raw.api.v1.admin['gallery-photos'].$post({ json });
      return unwrap(res, galleryPhotoSchema);
    },
    /** PUT /api/v1/admin/gallery-photos/:id — full-object update; the refreshed photo. */
    async update(args: UpdateGalleryPhotoArgs): Promise<GalleryPhoto> {
      const res = await raw.api.v1.admin['gallery-photos'][':id'].$put(args);
      return unwrap(res, galleryPhotoSchema);
    },
    /** PUT /api/v1/admin/gallery-photos/order — full-replace display order; the reordered list. */
    async setOrder(json: GalleryPhotoOrderArgs): Promise<GalleryPhoto[]> {
      const res = await raw.api.v1.admin['gallery-photos']['order'].$put({ json });
      return unwrap(res, galleryPhotoSchema.array());
    },
    /** GET /api/v1/admin/gallery-photos/:id/thumb — BINARY seam: a 2xx returns the raw Response untouched (never unwrapped); non-2xx throws the envelope error via unwrapError. */
    async thumbResponse(args: GetGalleryPhotoThumbArgs): Promise<Response> {
      const res = await raw.api.v1.admin['gallery-photos'][':id']['thumb'].$get(args);
      if (!res.ok) {
        await unwrapError(res);
      }
      return res;
    },
  };
}

/** Testimonial wrappers over /api/v1/admin/testimonials (CRUD + the display-order PUT, #141). */
export function adminTestimonials(raw: RpcClient) {
  return {
    /** GET /api/v1/admin/testimonials — ALL testimonials incl. deactivated. */
    async list(): Promise<Testimonial[]> {
      const res = await raw.api.v1.admin.testimonials.$get();
      return unwrap(res, testimonialSchema.array());
    },
    /** GET /api/v1/admin/testimonials/:id — one testimonial; 404 when unknown. */
    async byId(args: GetAdminTestimonialArgs): Promise<Testimonial> {
      const res = await raw.api.v1.admin.testimonials[':id'].$get(args);
      return unwrap(res, testimonialSchema);
    },
    /** POST /api/v1/admin/testimonials — 201 with the created testimonial. */
    async create(json: CreateTestimonialArgs): Promise<Testimonial> {
      const res = await raw.api.v1.admin.testimonials.$post({ json });
      return unwrap(res, testimonialSchema);
    },
    /** PUT /api/v1/admin/testimonials/:id — full-object update; the refreshed testimonial. */
    async update(args: UpdateTestimonialArgs): Promise<Testimonial> {
      const res = await raw.api.v1.admin.testimonials[':id'].$put(args);
      return unwrap(res, testimonialSchema);
    },
    /** PUT /api/v1/admin/testimonials/order — full-replace display order; the reordered list. */
    async setOrder(json: TestimonialOrderArgs): Promise<Testimonial[]> {
      const res = await raw.api.v1.admin.testimonials['order'].$put({ json });
      return unwrap(res, testimonialSchema.array());
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
    addons: adminAddonServices(raw),
    printSizes: adminPrintSizes(raw),
    attires: adminAttires(raw),
    media: adminMedia(raw),
    galleryCategories: adminGalleryCategories(raw),
    galleryPhotos: adminGalleryPhotos(raw),
    testimonials: adminTestimonials(raw),
  };
}
