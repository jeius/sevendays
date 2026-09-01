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
};

export async function loadFixtures(db: TestDb): Promise<FixtureIds> {
  // The generated uuids are nondeterministic; capture and return what was
  // inserted so tests assert against real row identities, not assumptions.
  const {
    branches,
    printSizes,
    attires,
    addonServices,
    servicePackages,
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

  const [packageCombined] = await db
    .insert(servicePackages)
    .values({
      name: 'Combined Package',
      description: 'Framed picture with prints and privileges',
      priceCents: 150000,
      isActive: true,
    })
    .returning({ id: servicePackages.id });
  const [packageSimple] = await db
    .insert(servicePackages)
    .values({
      name: 'Simple Package',
      description: 'Prints only',
      priceCents: 90000,
      isActive: true,
    })
    .returning({ id: servicePackages.id });
  const [packageRetired] = await db
    .insert(servicePackages)
    .values({
      name: 'Retired Package',
      description: 'No longer offered',
      priceCents: 100000,
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

  const [inclusionFramedPicture] = await db
    .insert(packageInclusions)
    .values({
      servicePackageId: packageCombined.id,
      kind: 'framed_picture',
      quantity: 1,
      printSizeId: printSize11x14.id,
      frameId: frameCombined.id,
      description: 'Framed picture',
    })
    .returning({ id: packageInclusions.id });
  const [inclusionPrint2R] = await db
    .insert(packageInclusions)
    .values({
      servicePackageId: packageCombined.id,
      kind: 'print',
      quantity: 4,
      printSizeId: printSize2R.id,
      description: '2R print x4',
    })
    .returning({ id: packageInclusions.id });
  const [inclusionPrint2x2] = await db
    .insert(packageInclusions)
    .values({
      servicePackageId: packageCombined.id,
      kind: 'print',
      quantity: 5,
      printSizeId: printSize2x2.id,
      description: '2x2 print x5',
    })
    .returning({ id: packageInclusions.id });
  await db.insert(packageInclusions).values({
    servicePackageId: packageCombined.id,
    kind: 'privilege',
    description: 'High Resolution soft copies',
  });
  await db.insert(packageInclusions).values({
    servicePackageId: packageSimple.id,
    kind: 'print',
    quantity: 2,
    printSizeId: printSize2R.id,
    description: '2R print x2',
  });

  // Junction rows inserted after inclusions, resolving attire ids by name.
  await db.insert(packageInclusionAttires).values([
    { inclusionId: inclusionFramedPicture.id, attireId: attireFilipiniana.id },
    { inclusionId: inclusionFramedPicture.id, attireId: attireExecutive.id },
  ]);
  await db
    .insert(packageInclusionAttires)
    .values({ inclusionId: inclusionPrint2R.id, attireId: attireToga.id });
  await db
    .insert(packageInclusionAttires)
    .values({ inclusionId: inclusionPrint2x2.id, attireId: attireToga.id });

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
  };
}
