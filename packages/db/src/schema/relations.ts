import { relations } from 'drizzle-orm';
import { attires } from './attires.js';
import { frames } from './frames.js';
import { packageInclusionAttires } from './package-inclusion-attires.js';
import { packageInclusions } from './package-inclusions.js';
import { printSizes } from './print-sizes.js';
import { servicePackages } from './service-packages.js';

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
