import { queryOptions } from '@tanstack/react-query';
import {
  fetchAdminAddons,
  fetchAdminAttires,
  fetchAdminBranches,
  fetchAdminGalleryCategories,
  fetchAdminGalleryPhotos,
  fetchAdminPackage,
  fetchAdminPackages,
  fetchAdminPrintSizes,
  fetchAdminStudioServices,
  fetchAdminTestimonials,
} from './admin.functions';

// Query key factories for the admin CMS (M5 #139) — the branchQueries
// precedent, one factory per resource the ticket 05 screens consume.
export const adminPackageQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'service-packages'],
      queryFn: fetchAdminPackages,
    }),
  byId: (id: string) =>
    queryOptions({
      queryKey: ['admin', 'service-packages', id],
      queryFn: () => fetchAdminPackage({ data: { id } }),
    }),
};

export const adminBranchQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'branches'],
      queryFn: fetchAdminBranches,
    }),
};

export const adminStudioServiceQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'studio-services'],
      queryFn: fetchAdminStudioServices,
    }),
};

export const adminAddonQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'addon-services'],
      queryFn: fetchAdminAddons,
    }),
};

export const adminLookupQueries = {
  printSizes: () =>
    queryOptions({
      queryKey: ['admin', 'print-sizes'],
      queryFn: fetchAdminPrintSizes,
    }),
  attires: () =>
    queryOptions({
      queryKey: ['admin', 'attires'],
      queryFn: fetchAdminAttires,
    }),
};

export const adminGalleryQueries = {
  categories: () =>
    queryOptions({
      queryKey: ['admin', 'gallery-categories'],
      queryFn: fetchAdminGalleryCategories,
    }),
  photos: () =>
    queryOptions({
      queryKey: ['admin', 'gallery-photos'],
      queryFn: fetchAdminGalleryPhotos,
    }),
};

export const adminTestimonialQueries = {
  all: () =>
    queryOptions({
      queryKey: ['admin', 'testimonials'],
      queryFn: fetchAdminTestimonials,
    }),
};
