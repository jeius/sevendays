import { relations } from 'drizzle-orm';
import { attires } from './attires.js';
import { packageInclusions } from './package-inclusions.js';
import { printSizes } from './print-sizes.js';
import { servicePackages } from './service-packages.js';

export const servicePackagesRelations = relations(servicePackages, ({ many }) => ({
  inclusions: many(packageInclusions),
}));

export const packageInclusionsRelations = relations(packageInclusions, ({ one }) => ({
  servicePackage: one(servicePackages, {
    fields: [packageInclusions.servicePackageId],
    references: [servicePackages.id],
  }),
  printSize: one(printSizes, {
    fields: [packageInclusions.printSizeId],
    references: [printSizes.id],
  }),
  attire: one(attires, {
    fields: [packageInclusions.attireId],
    references: [attires.id],
  }),
}));
