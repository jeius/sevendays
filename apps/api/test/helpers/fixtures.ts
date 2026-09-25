import {
  buildInclusionRowValues,
  buildJunctionPairs,
  type InclusionEntry,
} from '@sevendays/db/catalog-rows';
import type { TestDb } from './db.js';

export type FixtureIds = {
  branchA: string;
  branchB: string;
  packageCombined: string;
  packageSimple: string;
  packageRetired: string;
  printSize2R: string;
  printSize2x2: string;
  printSize11x14: string;
  attireToga: string;
  attireFilipiniana: string;
  attireExecutive: string;
  attireUniform: string;
  frameCombined: string;
  frameSimple: string;
  addonMakeup: string;
  addonHairstyle: string;
  addonRetired: string;
  servicePortrait: string;
  serviceRetired: string;
  serviceStudio: string;
  serviceBranchLinks: string[];
};

export async function loadFixtures(db: TestDb): Promise<FixtureIds> {
  // The generated uuids are nondeterministic; capture and return what was
  // inserted so tests assert against real row identities, not assumptions.
  const {
    branches,
    printSizes,
    attires,
    addonServices,
    branchStudioServices,
    servicePackages,
    studioServices,
    studioServiceAddonServices,
    frames,
    packageInclusions,
    packageInclusionAttires,
  } = await import('@sevendays/db');

  const [branchA] = await db
    .insert(branches)
    .values({
      name: 'Test Branch A',
      address: '1 Test St',
      phone: '+63 900 000 001',
      acceptsWalkIns: false,
    })
    .returning({ id: branches.id });
  const [branchB] = await db
    .insert(branches)
    .values({
      name: 'Test Branch B',
      address: '2 Test St',
      phone: '+63 900 000 002',
      acceptsWalkIns: true,
    })
    .returning({ id: branches.id });

  const [printSize2R] = await db
    .insert(printSizes)
    .values({ code: '2R', description: '2R print (3.5x5 in)' })
    .returning({ id: printSizes.id });
  const [printSize2x2] = await db
    .insert(printSizes)
    .values({ code: '2x2', description: '2x2 print' })
    .returning({ id: printSizes.id });
  const [printSize11x14] = await db
    .insert(printSizes)
    .values({ code: '11x14', description: '11x14 framed print' })
    .returning({ id: printSizes.id });

  const [attireToga] = await db
    .insert(attires)
    .values({ name: 'Toga' })
    .returning({ id: attires.id });
  const [attireFilipiniana] = await db
    .insert(attires)
    .values({ name: 'Filipiniana' })
    .returning({ id: attires.id });
  const [attireExecutive] = await db
    .insert(attires)
    .values({ name: 'Executive' })
    .returning({ id: attires.id });
  const [attireUniform] = await db
    .insert(attires)
    .values({ name: 'Uniform' })
    .returning({ id: attires.id });

  const [addonMakeup] = await db
    .insert(addonServices)
    .values({
      name: 'Makeup',
      description: 'On-site makeup service',
      priceCents: 12000,
      isActive: true,
    })
    .returning({ id: addonServices.id });
  const [addonHairstyle] = await db
    .insert(addonServices)
    .values({
      name: 'Hairstyle',
      description: 'On-site hairstyle service',
      priceCents: 6000,
      isActive: true,
    })
    .returning({ id: addonServices.id });
  const [addonRetired] = await db
    .insert(addonServices)
    .values({
      name: 'Retired Add-on',
      description: 'No longer offered',
      priceCents: 15000,
      isActive: false,
    })
    .returning({ id: addonServices.id });

  // M2 ticket 02: one active Studio Service — the db-level exactly-one CHECK
  // test needs a second offering to attempt a both-set insert. M2 ticket 03
  // adds the applicability-matrix fixtures its rejection tests need; the
  // inactive service is the existing serviceRetired (reused).
  const [servicePortrait] = await db
    .insert(studioServices)
    .values({
      name: 'Portraits & ID Photo',
      description: 'Studio portraits and ID photos.',
      priceCents: 50000,
      isActive: true,
    })
    .returning({ id: studioServices.id });
  const [serviceRetired] = await db
    .insert(studioServices)
    .values({
      name: 'Retired Studio Service',
      description: 'No longer offered.',
      priceCents: 60000,
      isActive: false,
    })
    .returning({ id: studioServices.id });

  // M2 ticket 03: a second ACTIVE service, linked to branchA ONLY — the
  // bookability rejection needs an active service that is NOT bookable
  // everywhere (portrait is linked to both branches).
  const [serviceStudio] = await db
    .insert(studioServices)
    .values({
      name: 'Studio Portraits',
      description: 'Module-level service fixture.',
      priceCents: 70000,
      isActive: true,
    })
    .returning({ id: studioServices.id });

  // Bookability rows (ticket 01's presence-row junction): portrait bookable
  // at BOTH branches; retired linked to branchA only (inactive — invisible
  // on reads even though its link exists); studio (ticket 03) linked to
  // branchA only — booking it at branchB is the service_not_bookable case.
  await db.insert(branchStudioServices).values([
    { studioServiceId: servicePortrait.id, branchId: branchA.id },
    { studioServiceId: servicePortrait.id, branchId: branchB.id },
    { studioServiceId: serviceRetired.id, branchId: branchA.id },
    { studioServiceId: serviceStudio.id, branchId: branchA.id },
  ]);

  const serviceBranchLinks = [
    { studioServiceId: servicePortrait.id, branchId: branchA.id },
    { studioServiceId: servicePortrait.id, branchId: branchB.id },
    { studioServiceId: serviceRetired.id, branchId: branchA.id },
  ];

  // Applicability matrix (ticket 03): Makeup applies to the portrait
  // service; the RETIRED add-on is linked to the studio service — a live
  // link on an inactive add-on proves activity-before-matrix (ticket 03).
  await db.insert(studioServiceAddonServices).values([
    { studioServiceId: servicePortrait.id, addonServiceId: addonMakeup.id },
    { studioServiceId: serviceStudio.id, addonServiceId: addonRetired.id },
  ]);

  const [packageCombined] = await db
    .insert(servicePackages)
    .values({
      name: 'Combined Package',
      description: 'Framed picture with prints and privileges',
      priceCents: 150000,
      slug: 'combined-package',
      isActive: true,
    })
    .returning({ id: servicePackages.id });
  const [packageSimple] = await db
    .insert(servicePackages)
    .values({
      name: 'Simple Package',
      description: 'Prints only',
      priceCents: 90000,
      slug: 'simple-package',
      isActive: true,
    })
    .returning({ id: servicePackages.id });
  const [packageRetired] = await db
    .insert(servicePackages)
    .values({
      name: 'Retired Package',
      description: 'No longer offered',
      priceCents: 100000,
      slug: 'retired-package',
      isActive: false,
    })
    .returning({ id: servicePackages.id });

  const [frameCombined] = await db
    .insert(frames)
    .values({ servicePackageId: packageCombined.id, frameNumber: 1 })
    .returning({ id: frames.id });
  const [frameSimple] = await db
    .insert(frames)
    .values({ servicePackageId: packageSimple.id, frameNumber: 1 })
    .returning({ id: frames.id });

  // Inclusion + junction shaping goes through the db builders (candidate C):
  // one source for per-Kind fields and attire decomposition. Ids are still
  // captured per row — the stitch read orders junction rows by created_at,
  // and autocommit gives each insert its own timestamp.
  const printSizeIdMap = new Map([
    ['2R', printSize2R.id],
    ['2x2', printSize2x2.id],
    ['11x14', printSize11x14.id],
  ]);
  const attireIdMap = new Map([
    ['Toga', attireToga.id],
    ['Filipiniana', attireFilipiniana.id],
    ['Executive', attireExecutive.id],
    ['Uniform', attireUniform.id],
  ]);

  const combinedEntries: InclusionEntry[] = [
    {
      kind: 'framed_picture',
      quantity: 1,
      printSizeCode: '11x14',
      attireNames: ['Filipiniana', 'Executive'],
      frameId: frameCombined.id,
    },
    { kind: 'print', quantity: 4, printSizeCode: '2R', attireNames: ['Toga'] },
    { kind: 'print', quantity: 5, printSizeCode: '2x2', attireNames: ['Toga'] },
    { kind: 'privilege', description: 'High Resolution soft copies', attireNames: [] },
  ];
  const combinedValues = buildInclusionRowValues({
    servicePackageId: packageCombined.id,
    entries: combinedEntries,
    printSizeId: printSizeIdMap,
  });

  // Guard the indexed reads (noUncheckedIndexedAccess); the per-row inserts
  // keep the original fixture sequence.
  const [framedRow, print2RRow, print2x2Row, privilegeRow] = combinedValues;
  if (!framedRow || !print2RRow || !print2x2Row || !privilegeRow) {
    throw new Error('fixtures: builder returned fewer rows than entries');
  }

  const [inclusionFramedPicture] = await db
    .insert(packageInclusions)
    .values(framedRow)
    .returning({ id: packageInclusions.id });
  const [inclusionPrint2R] = await db
    .insert(packageInclusions)
    .values(print2RRow)
    .returning({ id: packageInclusions.id });
  const [inclusionPrint2x2] = await db
    .insert(packageInclusions)
    .values(print2x2Row)
    .returning({ id: packageInclusions.id });
  await db.insert(packageInclusions).values(privilegeRow);

  const simpleEntries: InclusionEntry[] = [
    { kind: 'print', quantity: 2, printSizeCode: '2R', attireNames: ['Toga'] },
  ];
  const [simpleRow] = buildInclusionRowValues({
    servicePackageId: packageSimple.id,
    entries: simpleEntries,
    printSizeId: printSizeIdMap,
  });
  if (!simpleRow) throw new Error('fixtures: builder returned no simple-package row');
  const [simplePrintRow] = await db
    .insert(packageInclusions)
    .values(simpleRow)
    .returning({ id: packageInclusions.id });

  // One row per statement (kept from the pre-position era): the builder now
  // supplies junction position per inclusion (catalog attire order), and the
  // #138 read will order by (position, id) — until then the current read
  // still keys on created_at, and distinct statements keep each row's
  // created_at distinct so that ordering stays deterministic. The builder
  // owns the pair order; these statements preserve it.
  const [framedEntry, print2REntry, print2x2Entry] = combinedEntries;
  const combinedPairs = buildJunctionPairs({
    inclusionIds: [inclusionFramedPicture.id, inclusionPrint2R.id, inclusionPrint2x2.id],
    entries: [framedEntry, print2REntry, print2x2Entry],
    attireId: attireIdMap,
  });
  for (const pair of combinedPairs) {
    await db.insert(packageInclusionAttires).values(pair);
  }
  const simplePairs = buildJunctionPairs({
    inclusionIds: [simplePrintRow.id],
    entries: simpleEntries,
    attireId: attireIdMap,
  });
  for (const pair of simplePairs) {
    await db.insert(packageInclusionAttires).values(pair);
  }

  return {
    branchA: branchA.id,
    branchB: branchB.id,
    packageCombined: packageCombined.id,
    packageSimple: packageSimple.id,
    packageRetired: packageRetired.id,
    printSize2R: printSize2R.id,
    printSize2x2: printSize2x2.id,
    printSize11x14: printSize11x14.id,
    attireToga: attireToga.id,
    attireFilipiniana: attireFilipiniana.id,
    attireExecutive: attireExecutive.id,
    attireUniform: attireUniform.id,
    frameCombined: frameCombined.id,
    frameSimple: frameSimple.id,
    addonMakeup: addonMakeup.id,
    addonHairstyle: addonHairstyle.id,
    addonRetired: addonRetired.id,
    servicePortrait: servicePortrait.id,
    serviceRetired: serviceRetired.id,
    serviceStudio: serviceStudio.id,
    serviceBranchLinks: serviceBranchLinks.map((l) => l.branchId),
  };
}

export type GalleryFixtureIds = {
  categoryA: string; // active, position 1
  categoryB: string; // active, position 2
  categoryRetired: string; // inactive, position 3
  photoA: string; // active, categoryA, position 1
  photoB: string; // active, categoryB, position 2
  photoRetired: string; // inactive, uncategorized, position 3
  testimonialA: string; // active, position 1
  testimonialB: string; // active, position 2
  testimonialRetired: string; // inactive, position 3
};

/**
 * The CMS-born-empty tables get their own fixture builder (the main
 * loadFixtures predates M5's gallery): 3 categories (one deactivated),
 * 3 photos (one deactivated, one uncategorized — the staff-only state),
 * 3 testimonials (one deactivated). Positions contiguous 1..3.
 */
export async function loadGalleryFixtures(db: TestDb): Promise<GalleryFixtureIds> {
  const { galleryCategories, galleryPhotos, testimonials } = await import('@sevendays/db');

  const [categoryA] = await db
    .insert(galleryCategories)
    .values({ name: 'Weddings', position: 1 })
    .returning({ id: galleryCategories.id });
  const [categoryB] = await db
    .insert(galleryCategories)
    .values({ name: 'Graduation', position: 2 })
    .returning({ id: galleryCategories.id });
  const [categoryRetired] = await db
    .insert(galleryCategories)
    .values({ name: 'Retired Tab', position: 3, isActive: false })
    .returning({ id: galleryCategories.id });
  if (!categoryA || !categoryB || !categoryRetired) {
    throw new Error('gallery fixtures: category insert returned no row');
  }

  const [photoA] = await db
    .insert(galleryPhotos)
    .values({
      r2Key: 'gallery/aaaaaaaa-0000-4000-8000-000000000001.jpg',
      categoryId: categoryA.id,
      position: 1,
    })
    .returning({ id: galleryPhotos.id });
  const [photoB] = await db
    .insert(galleryPhotos)
    .values({
      r2Key: 'gallery/aaaaaaaa-0000-4000-8000-000000000002.jpg',
      categoryId: categoryB.id,
      position: 2,
    })
    .returning({ id: galleryPhotos.id });
  const [photoRetired] = await db
    .insert(galleryPhotos)
    .values({
      r2Key: 'gallery/aaaaaaaa-0000-4000-8000-000000000003.jpg',
      position: 3,
      isActive: false,
    })
    .returning({ id: galleryPhotos.id });
  if (!photoA || !photoB || !photoRetired) {
    throw new Error('gallery fixtures: photo insert returned no row');
  }

  const [testimonialA] = await db
    .insert(testimonials)
    .values({
      quote: 'The photos came out better than we hoped.',
      person: 'Maria, batch 2026',
      position: 1,
    })
    .returning({ id: testimonials.id });
  const [testimonialB] = await db
    .insert(testimonials)
    .values({
      quote: 'Fast, friendly, and the prints are gorgeous.',
      person: 'Jon & Riza',
      position: 2,
    })
    .returning({ id: testimonials.id });
  const [testimonialRetired] = await db
    .insert(testimonials)
    .values({ quote: 'Retired quote.', person: 'Former Client', position: 3, isActive: false })
    .returning({ id: testimonials.id });
  if (!testimonialA || !testimonialB || !testimonialRetired) {
    throw new Error('gallery fixtures: testimonial insert returned no row');
  }

  return {
    categoryA: categoryA.id,
    categoryB: categoryB.id,
    categoryRetired: categoryRetired.id,
    photoA: photoA.id,
    photoB: photoB.id,
    photoRetired: photoRetired.id,
    testimonialA: testimonialA.id,
    testimonialB: testimonialB.id,
    testimonialRetired: testimonialRetired.id,
  };
}
