import { relations } from 'drizzle-orm';
import { addonServices } from './addon-services.js';
import { attires } from './attires.js';
import { branchStudioServices } from './branch-studio-services.js';
import { branches } from './branches.js';
import { frames } from './frames.js';
import { packageInclusionAttires } from './package-inclusion-attires.js';
import { packageInclusions } from './package-inclusions.js';
import { printSizes } from './print-sizes.js';
import { servicePackages } from './service-packages.js';
import { studioServiceAddonServices } from './studio-service-addon-services.js';
import { studioServices } from './studio-services.js';

export const servicePackagesRelations = relations(servicePackages, ({ many }) => ({
  inclusions: many(packageInclusions),
  frames: many(frames),
}));

export const framesRelations = relations(frames, ({ one, many }) => ({
  servicePackage: one(servicePackages, {
    fields: [frames.servicePackageId],
    references: [servicePackages.id],
  }),
  inclusions: many(packageInclusions),
}));

export const packageInclusionsRelations = relations(packageInclusions, ({ one, many }) => ({
  servicePackage: one(servicePackages, {
    fields: [packageInclusions.servicePackageId],
    references: [servicePackages.id],
  }),
  printSize: one(printSizes, {
    fields: [packageInclusions.printSizeId],
    references: [printSizes.id],
  }),
  frame: one(frames, {
    fields: [packageInclusions.frameId],
    references: [frames.id],
  }),
  attireLinks: many(packageInclusionAttires),
}));

export const packageInclusionAttiresRelations = relations(packageInclusionAttires, ({ one }) => ({
  inclusion: one(packageInclusions, {
    fields: [packageInclusionAttires.inclusionId],
    references: [packageInclusions.id],
  }),
  attire: one(attires, {
    fields: [packageInclusionAttires.attireId],
    references: [attires.id],
  }),
}));

export const studioServicesRelations = relations(studioServices, ({ many }) => ({
  branchLinks: many(branchStudioServices),
  addonLinks: many(studioServiceAddonServices),
}));

export const branchStudioServicesRelations = relations(branchStudioServices, ({ one }) => ({
  branch: one(branches, {
    fields: [branchStudioServices.branchId],
    references: [branches.id],
  }),
  studioService: one(studioServices, {
    fields: [branchStudioServices.studioServiceId],
    references: [studioServices.id],
  }),
}));

export const studioServiceAddonServicesRelations = relations(
  studioServiceAddonServices,
  ({ one }) => ({
    studioService: one(studioServices, {
      fields: [studioServiceAddonServices.studioServiceId],
      references: [studioServices.id],
    }),
    addonService: one(addonServices, {
      fields: [studioServiceAddonServices.addonServiceId],
      references: [addonServices.id],
    }),
  })
);
