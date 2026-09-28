import { queryOptions } from '@tanstack/react-query';
import {
  getAddonServices,
  getAppointment,
  getBranches,
  getGallery,
  getServicePackageBySlug,
  getServicePackages,
  getStudioServices,
  getTestimonials,
} from './api.functions';

// Query key factory (one resource today; grows with the booking flow).
export const branchQueries = {
  all: () =>
    queryOptions({
      queryKey: ['branches'],
      queryFn: () => getBranches(),
    }),
};

export const servicePackageQueries = {
  all: () =>
    queryOptions({
      queryKey: ['service-packages'],
      queryFn: () => getServicePackages(),
    }),
  /**
   * Detail by slug. `retry: false` + `staleTime: Infinity` encode the 404
   * contract: an unknown slug must never be cached (revisit = re-fetch, the
   * 404 stays a 404), while a fetched package lives for the session.
   */
  bySlug: (slug: string) =>
    queryOptions({
      queryKey: ['service-packages', 'by-slug', slug],
      queryFn: () => getServicePackageBySlug({ data: slug }),
      retry: false,
      staleTime: Infinity,
    }),
};

export const studioServiceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['studio-services'],
      queryFn: () => getStudioServices(),
    }),
};

export const addonServiceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['addon-services'],
      queryFn: () => getAddonServices(),
    }),
};

export const galleryQueries = {
  /**
   * The assembled public gallery read (#138). Default staleTime — every
   * fresh page load re-reads through the loader's ensureQueryData (the M5
   * "immediately" rule: freshness is a fresh-page-load property; no cache
   * layer). Tab filtering is client state over this single payload.
   */
  all: () =>
    queryOptions({
      queryKey: ['gallery'],
      queryFn: () => getGallery(),
    }),
};

export const testimonialQueries = {
  /** Active testimonials, position-ordered (#138). Same default-staleTime
   * posture as galleryQueries. */
  all: () =>
    queryOptions({
      queryKey: ['testimonials'],
      queryFn: () => getTestimonials(),
    }),
};

export const appointmentQueries = {
  /**
   * Confirmation read-back (ticket 08). Posture per the spec residual —
   * no special cache posture: the default staleTime keeps every visit a
   * fresh server-function read; `retry: false` only stops the default
   * retry loop from re-firing the deterministic 404 an unknown id
   * produces (retry is not caching — nothing here outlives the visit).
   */
  byId: (id: string) =>
    queryOptions({
      queryKey: ['appointments', 'by-id', id],
      queryFn: () => getAppointment({ data: id }),
      retry: false,
    }),
};
