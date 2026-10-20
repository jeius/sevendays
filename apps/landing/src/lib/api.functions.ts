import { startSpan } from '@sentry/tanstackstart-react';
import type { CreateAppointmentArgs } from '@sevendays/api-client';
import {
  type AppointmentWithAddons,
  type CreateTestimonialSubmissionInput,
  resolveSiteSettings,
} from '@sevendays/types';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { getApiClient, getApiClientForwardingIp } from './api.server';

export const getBranches = createServerFn().handler(async () => {
  // .cursorrules: server functions get a Sentry span (no-op when Sentry is
  // uninitialized — dev without VITE_SENTRY_DSN). Named import per the repo
  // Biome rule (no namespace imports).
  return startSpan({ name: 'GET /api/v1/branches' }, async () => {
    return getApiClient().branches.list();
  });
});

export const getServicePackages = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/service-packages' }, async () => {
    return getApiClient().servicePackages.list();
  });
});

/**
 * Package detail by slug. Callers pass the start-fn payload ({ data: slug });
 * the api-client RPC shape ({ param: { slug } }) is wrapped here.
 * Unknown/inactive slugs reject with ApiClientError(404) — the loader maps
 * that to the router's notFound().
 */
export const getServicePackageBySlug = createServerFn()
  .validator((input: string) => input)
  .handler(async ({ data }) => {
    return startSpan({ name: 'GET /api/v1/service-packages/:slug' }, async () => {
      return getApiClient().servicePackages.bySlug({ param: { slug: data } });
    });
  });

export const getStudioServices = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/studio-services' }, async () => {
    return getApiClient().studioServices.list();
  });
});

export const getAddonServices = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/addon-services' }, async () => {
    return getApiClient().addonServices.list();
  });
});

export const getGallery = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/gallery' }, async () => {
    return getApiClient().gallery.list();
  });
});

export const getTestimonials = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/testimonials' }, async () => {
    return getApiClient().testimonials.list();
  });
});

/**
 * The resolved site-settings read (M7 #223 — the chrome + home copy
 * source). resolveSiteSettings applies at the boundary: consumers never
 * see the born-empty null mix — unset fields are today's defaults (#215's
 * one-fallback law, never per-app fallbacks).
 */
export const getSiteSettings = createServerFn().handler(async () => {
  return startSpan({ name: 'GET /api/v1/site-settings' }, async () => {
    return resolveSiteSettings(await getApiClient().siteSettings.get());
  });
});

/**
 * Guest booking POST. Callers pass the start-fn payload ({ data: input });
 * the api-client RPC shape ({ json }) is wrapped here. Rejections reject
 * with ApiClientError(400) whose details carry the API's module-owned
 * message — src/lib/booking.ts maps it to the typed rejection card.
 */
export const createAppointment = createServerFn()
  .validator((input: CreateAppointmentArgs) => input)
  .handler(async ({ data }): Promise<AppointmentWithAddons> => {
    return startSpan({ name: 'POST /api/v1/appointments' }, async () => {
      return getApiClient().appointments.create(data);
    });
  });

/**
 * Public testimonial submission (M7 #216) — v1's only public write surface.
 * The visitor's IP rides X-Client-IP for the API's rate limiter (see
 * api.server.ts). Rejections reject with ApiClientError — the ruled 429
 * line rides `details.error` (the client's `.message` is prefixed
 * `API <status>:`) and the form renders it verbatim.
 */
export const submitTestimonial = createServerFn()
  .validator((input: CreateTestimonialSubmissionInput) => input)
  .handler(async ({ data }) => {
    return startSpan({ name: 'POST /api/v1/testimonial-submissions' }, async () => {
      const clientIp = getRequestHeaders().get('CF-Connecting-IP');
      return getApiClientForwardingIp(clientIp).testimonialSubmissions.create(data);
    });
  });

/**
 * Confirmation read-back (ticket 08). Callers pass the start-fn payload
 * ({ data: id }); the api-client RPC shape ({ param: { id } }) is wrapped
 * here. Unknown ids reject with ApiClientError(404) — the loader maps that
 * to the router's not-found via lib/api-404.ts.
 */
export const getAppointment = createServerFn()
  .validator((input: string) => input)
  .handler(async ({ data }) => {
    return startSpan({ name: 'GET /api/v1/appointments/:id' }, async () => {
      return getApiClient().appointments.get({ param: { id: data } });
    });
  });
