// The admin CMS server functions (M5 #139): every /api/v1/admin call rides
// the M4 session-scoped client seam (ADR-0004/0016) — the cookie is read
// from the INCOMING request server-side and forwarded as Bearer over the
// service binding; the browser never holds the token. Mutations return
// result values (never throw) so the API's field-level error details
// survive the server-fn serialization boundary — the editor maps them to
// per-field errors via lib/package-editor-state.ts.
import { startSpan } from '@sentry/tanstackstart-react';
import { ApiClientError } from '@sevendays/api-client';
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
  createAddonServiceSchema,
  createAttireSchema,
  createBranchSchema,
  createGalleryCategorySchema,
  createGalleryPhotoSchema,
  createPrintSizeSchema,
  createServicePackageSchema,
  createStudioServiceSchema,
  createTestimonialSchema,
  galleryCategoryOrderSchema,
  galleryPhotoOrderSchema,
  mediaPresignRequestSchema,
  studioServiceAddonMatrixSchema,
  studioServiceBranchMatrixSchema,
  testimonialOrderSchema,
  updateAddonServiceSchema,
  updateAttireSchema,
  updateBranchSchema,
  updateGalleryCategorySchema,
  updateGalleryPhotoSchema,
  updatePrintSizeSchema,
  updateServicePackageSchema,
  updateStudioServiceSchema,
  updateTestimonialSchema,
} from '@sevendays/types';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';
import { getSessionScopedApiClient } from './api.server';

// Mutations-as-results (the #139 plan ruling): a write server fn resolves to
// this union instead of throwing, so the API's 400 field details cross the
// serialization boundary intact. The package READ is result-valued too
// (#155 fix round: the RPC boundary erases the thrown ApiClientError class,
// so its status rides the result) — other reads stay throwing; query error
// state carries the message.
export type AdminMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; details?: unknown };

export const fetchAdminPackages = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/admin/service-packages' }, async () => {
    return getSessionScopedApiClient(
      getRequestHeaders().get('cookie')
    ).admin.servicePackages.list();
  });
});

export const fetchAdminPackage = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    return startSpan({ name: 'GET /api/v1/admin/service-packages/:id' }, async () => {
      try {
        const read = await getSessionScopedApiClient(
          getRequestHeaders().get('cookie')
        ).admin.servicePackages.byId({ param: { id: data.id } });
        return { ok: true as const, data: read };
      } catch (error) {
        // The RPC boundary erases the ApiClientError class — a client-side
        // instanceof can never match (#155 live-frame finding). Surface the
        // status through the RESULT instead.
        if (error instanceof ApiClientError) {
          return { ok: false as const, status: error.status, message: error.message };
        }
        throw error;
      }
    });
  });

export const fetchAdminBranches = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/admin/branches' }, async () => {
    return getSessionScopedApiClient(getRequestHeaders().get('cookie')).admin.branches.list();
  });
});

export const fetchAdminStudioServices = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/admin/studio-services' }, async () => {
    return getSessionScopedApiClient(getRequestHeaders().get('cookie')).admin.studioServices.list();
  });
});

export const fetchAdminPrintSizes = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/admin/print-sizes' }, async () => {
    return getSessionScopedApiClient(getRequestHeaders().get('cookie')).admin.printSizes.list();
  });
});

export const fetchAdminAttires = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/admin/attires' }, async () => {
    return getSessionScopedApiClient(getRequestHeaders().get('cookie')).admin.attires.list();
  });
});

export const fetchAdminAddons = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/admin/addon-services' }, async () => {
    return getSessionScopedApiClient(getRequestHeaders().get('cookie')).admin.addons.list();
  });
});

// GET /api/v1/admin/gallery-categories
export const fetchAdminGalleryCategories = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/admin/gallery-categories' }, async () => {
    return getSessionScopedApiClient(
      getRequestHeaders().get('cookie')
    ).admin.galleryCategories.list();
  });
});

// GET /api/v1/admin/gallery-photos
export const fetchAdminGalleryPhotos = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/admin/gallery-photos' }, async () => {
    return getSessionScopedApiClient(getRequestHeaders().get('cookie')).admin.galleryPhotos.list();
  });
});

// GET /api/v1/admin/testimonials
export const fetchAdminTestimonials = createServerFn({ method: 'GET' }).handler(async () => {
  return startSpan({ name: 'GET /api/v1/admin/testimonials' }, async () => {
    return getSessionScopedApiClient(getRequestHeaders().get('cookie')).admin.testimonials.list();
  });
});

export const presignAdminCoverUpload = createServerFn({
  method: 'POST',
  // Result-value fns carry the API's non-schematized error details
  // ({ ok: false; details?: unknown }) across the boundary by design —
  // the serializer's compile-time output gate rejects `unknown`, so the
  // output check is waived HERE ONLY (inputs stay strict; the runtime
  // payload is still JSON + Dates).
  strict: { output: false },
})
  .validator(mediaPresignRequestSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<MediaPresignResponse>> => {
    return startSpan({ name: 'POST /api/v1/admin/media/presign' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.media.presign(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

export const saveAdminPackageCreate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(createServicePackageSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<ServicePackageRead>> => {
    return startSpan({ name: 'POST /api/v1/admin/service-packages' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.servicePackages.create(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

export const saveAdminPackageUpdate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid(), payload: updateServicePackageSchema }))
  .handler(async ({ data }): Promise<AdminMutationResult<ServicePackageRead>> => {
    return startSpan({ name: 'PUT /api/v1/admin/service-packages/:id' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, payload } = data;
      try {
        return {
          ok: true,
          data: await client.admin.servicePackages.update({ param: { id }, json: payload }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

export const saveAdminBranchCreate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(createBranchSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<Branch>> => {
    return startSpan({ name: 'POST /api/v1/admin/branches' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.branches.create(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

export const saveAdminBranchUpdate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid(), payload: updateBranchSchema }))
  .handler(async ({ data }): Promise<AdminMutationResult<Branch>> => {
    return startSpan({ name: 'PUT /api/v1/admin/branches/:id' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, payload } = data;
      try {
        return {
          ok: true,
          data: await client.admin.branches.update({ param: { id }, json: payload }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

export const saveAdminStudioServiceCreate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(createStudioServiceSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<StudioServiceWithBranches>> => {
    return startSpan({ name: 'POST /api/v1/admin/studio-services' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.studioServices.create(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

export const saveAdminStudioServiceUpdate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid(), payload: updateStudioServiceSchema }))
  .handler(async ({ data }): Promise<AdminMutationResult<StudioServiceWithBranches>> => {
    return startSpan({ name: 'PUT /api/v1/admin/studio-services/:id' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, payload } = data;
      try {
        return {
          ok: true,
          data: await client.admin.studioServices.update({ param: { id }, json: payload }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

export const saveAdminAddonCreate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(createAddonServiceSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<AddonService>> => {
    return startSpan({ name: 'POST /api/v1/admin/addon-services' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.addons.create(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

export const saveAdminAddonUpdate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid(), payload: updateAddonServiceSchema }))
  .handler(async ({ data }): Promise<AdminMutationResult<AddonService>> => {
    return startSpan({ name: 'PUT /api/v1/admin/addon-services/:id' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, payload } = data;
      try {
        return {
          ok: true,
          data: await client.admin.addons.update({ param: { id }, json: payload }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

export const saveAdminStudioServiceBranchMatrix = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(studioServiceBranchMatrixSchema.extend({ id: z.uuid() }))
  .handler(async ({ data }): Promise<AdminMutationResult<StudioServiceWithBranches>> => {
    return startSpan({ name: 'PUT /api/v1/admin/studio-services/:id/branches' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, branchIds } = data;
      try {
        return {
          ok: true,
          data: await client.admin.studioServices.setBranchMatrix({
            param: { id },
            json: { branchIds },
          }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

export const saveAdminStudioServiceAddonMatrix = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(studioServiceAddonMatrixSchema.extend({ id: z.uuid() }))
  .handler(async ({ data }): Promise<AdminMutationResult<StudioServiceWithBranches>> => {
    return startSpan({ name: 'PUT /api/v1/admin/studio-services/:id/addons' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, addonServiceIds } = data;
      try {
        return {
          ok: true,
          data: await client.admin.studioServices.setAddonMatrix({
            param: { id },
            json: { addonServiceIds },
          }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// POST /api/v1/admin/gallery-categories
export const saveAdminGalleryCategoryCreate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(createGalleryCategorySchema)
  .handler(async ({ data }): Promise<AdminMutationResult<GalleryCategory>> => {
    return startSpan({ name: 'POST /api/v1/admin/gallery-categories' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.galleryCategories.create(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// PUT /api/v1/admin/gallery-categories/:id
export const saveAdminGalleryCategoryUpdate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid(), payload: updateGalleryCategorySchema }))
  .handler(async ({ data }): Promise<AdminMutationResult<GalleryCategory>> => {
    return startSpan({ name: 'PUT /api/v1/admin/gallery-categories/:id' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, payload } = data;
      try {
        return {
          ok: true,
          data: await client.admin.galleryCategories.update({ param: { id }, json: payload }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// PUT /api/v1/admin/gallery-categories/order
export const saveAdminGalleryCategoryOrder = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(galleryCategoryOrderSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<GalleryCategory[]>> => {
    return startSpan({ name: 'PUT /api/v1/admin/gallery-categories/order' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.galleryCategories.setOrder(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// POST /api/v1/admin/gallery-photos
export const saveAdminGalleryPhotoCreate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(createGalleryPhotoSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<GalleryPhoto>> => {
    return startSpan({ name: 'POST /api/v1/admin/gallery-photos' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.galleryPhotos.create(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// PUT /api/v1/admin/gallery-photos/:id
export const saveAdminGalleryPhotoUpdate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid(), payload: updateGalleryPhotoSchema }))
  .handler(async ({ data }): Promise<AdminMutationResult<GalleryPhoto>> => {
    return startSpan({ name: 'PUT /api/v1/admin/gallery-photos/:id' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, payload } = data;
      try {
        return {
          ok: true,
          data: await client.admin.galleryPhotos.update({ param: { id }, json: payload }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// PUT /api/v1/admin/gallery-photos/order
export const saveAdminGalleryPhotoOrder = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(galleryPhotoOrderSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<GalleryPhoto[]>> => {
    return startSpan({ name: 'PUT /api/v1/admin/gallery-photos/order' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.galleryPhotos.setOrder(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// POST /api/v1/admin/testimonials
export const saveAdminTestimonialCreate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(createTestimonialSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<Testimonial>> => {
    return startSpan({ name: 'POST /api/v1/admin/testimonials' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.testimonials.create(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// PUT /api/v1/admin/testimonials/:id
export const saveAdminTestimonialUpdate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid(), payload: updateTestimonialSchema }))
  .handler(async ({ data }): Promise<AdminMutationResult<Testimonial>> => {
    return startSpan({ name: 'PUT /api/v1/admin/testimonials/:id' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, payload } = data;
      try {
        return {
          ok: true,
          data: await client.admin.testimonials.update({ param: { id }, json: payload }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// PUT /api/v1/admin/testimonials/order
export const saveAdminTestimonialOrder = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(testimonialOrderSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<Testimonial[]>> => {
    return startSpan({ name: 'PUT /api/v1/admin/testimonials/order' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.testimonials.setOrder(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// POST /api/v1/admin/print-sizes
export const saveAdminPrintSizeCreate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(createPrintSizeSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<PrintSize>> => {
    return startSpan({ name: 'POST /api/v1/admin/print-sizes' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.printSizes.create(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// PUT /api/v1/admin/print-sizes/:id
export const saveAdminPrintSizeUpdate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid(), payload: updatePrintSizeSchema }))
  .handler(async ({ data }): Promise<AdminMutationResult<PrintSize>> => {
    return startSpan({ name: 'PUT /api/v1/admin/print-sizes/:id' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, payload } = data;
      try {
        return {
          ok: true,
          data: await client.admin.printSizes.update({ param: { id }, json: payload }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// POST /api/v1/admin/attires
export const saveAdminAttireCreate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(createAttireSchema)
  .handler(async ({ data }): Promise<AdminMutationResult<Attire>> => {
    return startSpan({ name: 'POST /api/v1/admin/attires' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      try {
        return { ok: true, data: await client.admin.attires.create(data) };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });

// PUT /api/v1/admin/attires/:id
export const saveAdminAttireUpdate = createServerFn({
  method: 'POST',
  // See presignAdminCoverUpload — output strictness waived for the result
  // value (details?: unknown rides through by design).
  strict: { output: false },
})
  .validator(z.object({ id: z.uuid(), payload: updateAttireSchema }))
  .handler(async ({ data }): Promise<AdminMutationResult<Attire>> => {
    return startSpan({ name: 'PUT /api/v1/admin/attires/:id' }, async () => {
      const client = getSessionScopedApiClient(getRequestHeaders().get('cookie'));
      const { id, payload } = data;
      try {
        return {
          ok: true,
          data: await client.admin.attires.update({ param: { id }, json: payload }),
        };
      } catch (error) {
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            details: error.details,
          };
        }
        throw error; // not an API failure (serialization, session loss) — loud
      }
    });
  });
