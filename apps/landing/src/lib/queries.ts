import { queryOptions } from '@tanstack/react-query';
import {
  getAddonServices,
  getBranches,
  getServicePackageBySlug,
  getServicePackages,
  getStudioServices,
} from './api.functions';

// Query key factory — one group per resource read.
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
