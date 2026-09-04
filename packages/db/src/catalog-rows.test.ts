import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
  assertAllKnownAttires,
  buildFrameRowValues,
  buildInclusionRowValues,
  buildJunctionPairs,
} from './catalog-rows.js';

// Synthetic lookups — the builders are data-agnostic (spec: they shape real
// catalog entries and minimal test data identically).
const printSizeId = new Map([
  ['2R', 'ps-2r'],
  ['11x14', 'ps-11x14'],
]);
const attireId = new Map([
  ['Toga', 'att-toga'],
  ['Filipiniana', 'att-fil'],
  ['Executive', 'att-exec'],
]);

describe('buildInclusionRowValues', () => {
  it('shapes a framed_picture row: quantity 1, resolved printSizeId, frameId, null description', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeCode: '11x14',
          attireNames: ['Toga'],
          frameId: 'frame-1',
        },
      ],
      printSizeId,
    });
    expect(rows).toEqual([
      {
        servicePackageId: 'pkg-1',
        kind: 'framed_picture',
        quantity: 1,
        printSizeId: 'ps-11x14',
        frameId: 'frame-1',
        description: null,
      },
    ]);
  });

  it('shapes a print row: entry quantity, resolved printSizeId, null frameId, null description', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [{ kind: 'print', quantity: 4, printSizeCode: '2R', attireNames: ['Toga'] }],
      printSizeId,
    });
    expect(rows).toEqual([
      {
        servicePackageId: 'pkg-1',
        kind: 'print',
        quantity: 4,
        printSizeId: 'ps-2r',
        frameId: null,
        description: null,
      },
    ]);
  });

  it('shapes a privilege row: nulls everywhere, description carried', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [
        { kind: 'privilege', description: 'Usage of Toga and Hood', attireNames: ['Toga'] },
      ],
      printSizeId,
    });
    expect(rows).toEqual([
      {
        servicePackageId: 'pkg-1',
        kind: 'privilege',
        quantity: null,
        printSizeId: null,
        frameId: null,
        description: 'Usage of Toga and Hood',
      },
    ]);
  });

  it('preserves entry order across mixed kinds (the seeder cursor pairing depends on it)', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [
        { kind: 'print', quantity: 2, printSizeCode: '2R', attireNames: ['Toga'] },
        { kind: 'privilege', description: 'High Resolution soft copies', attireNames: [] },
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeCode: '11x14',
          attireNames: ['Toga'],
          frameId: 'frame-1',
        },
      ],
      printSizeId,
    });
    expect(rows.map((r) => r.kind)).toEqual(['print', 'privilege', 'framed_picture']);
  });

  it('sets only the six shape fields — id/createdAt/updatedAt stay DB defaults', () => {
    const rows = buildInclusionRowValues({
      servicePackageId: 'pkg-1',
      entries: [{ kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: [] }],
      printSizeId,
    });
    const first = rows[0];
    if (!first) throw new Error('expected one row');
    expect(Object.keys(first).sort()).toEqual([
      'description',
      'frameId',
      'kind',
      'printSizeId',
      'quantity',
      'servicePackageId',
    ]);
  });

  it('throws on an unknown print size code, naming it', () => {
    expect(() =>
      buildInclusionRowValues({
        servicePackageId: 'pkg-1',
        entries: [{ kind: 'print', quantity: 1, printSizeCode: '999', attireNames: [] }],
        printSizeId,
      })
    ).toThrow('Unknown print size code: 999');
  });

  it('throws on a framed_picture entry without a frameId', () => {
    expect(() =>
      buildInclusionRowValues({
        servicePackageId: 'pkg-1',
        entries: [
          {
            kind: 'framed_picture',
            quantity: 1,
            printSizeCode: '11x14',
            attireNames: ['Toga'],
            frameId: null,
          },
        ],
        printSizeId,
      })
    ).toThrow('framed_picture entry is missing frameId');
  });
});

describe('buildJunctionPairs', () => {
  it('decomposes combined contexts into one pair per attire, in the entry attire order', () => {
    const pairs = buildJunctionPairs({
      inclusionIds: ['inc-1'],
      entries: [
        {
          kind: 'print',
          quantity: 6,
          printSizeCode: '2x2',
          attireNames: ['Filipiniana', 'Executive'],
        },
      ],
      attireId,
    });
    expect(pairs).toEqual([
      { inclusionId: 'inc-1', attireId: 'att-fil' },
      { inclusionId: 'inc-1', attireId: 'att-exec' },
    ]);
  });

  it('walks entries in order and pairs each with its inclusionId (entries-then-names order)', () => {
    const pairs = buildJunctionPairs({
      inclusionIds: ['inc-a', 'inc-b', 'inc-c'],
      entries: [
        {
          kind: 'framed_picture',
          quantity: 1,
          printSizeCode: '8x10',
          attireNames: ['Toga'],
          frameId: 'f',
        },
        { kind: 'privilege', description: 'Usage of Barong', attireNames: [] },
        { kind: 'print', quantity: 4, printSizeCode: '2R', attireNames: ['Executive', 'Uniform'] },
      ],
      attireId: new Map([...attireId, ['Uniform', 'att-uniform']]),
    });
    expect(pairs).toEqual([
      { inclusionId: 'inc-a', attireId: 'att-toga' },
      { inclusionId: 'inc-c', attireId: 'att-exec' },
      { inclusionId: 'inc-c', attireId: 'att-uniform' },
    ]);
  });

  it('yields zero pairs for an empty attireNames list (privileges with no grant)', () => {
    const pairs = buildJunctionPairs({
      inclusionIds: ['inc-1'],
      entries: [{ kind: 'privilege', description: 'Usage of Ladies Accessories', attireNames: [] }],
      attireId,
    });
    expect(pairs).toEqual([]);
  });

  it('throws on an unknown attire name, naming it (pinned loud-fail behavior)', () => {
    expect(() =>
      buildJunctionPairs({
        inclusionIds: ['inc-1'],
        entries: [{ kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: ['Kimono'] }],
        attireId,
      })
    ).toThrow('Unknown attire name: Kimono');
  });
});

describe('buildFrameRowValues', () => {
  it('shapes one row per frame number, in the given order', () => {
    const rows = buildFrameRowValues({ servicePackageId: 'pkg-1', frameNumbers: [2, 1] });
    expect(rows).toEqual([
      { servicePackageId: 'pkg-1', frameNumber: 2 },
      { servicePackageId: 'pkg-1', frameNumber: 1 },
    ]);
  });

  it('yields no rows for a package with no frames', () => {
    expect(buildFrameRowValues({ servicePackageId: 'pkg-1', frameNumbers: [] })).toEqual([]);
  });
});

describe('assertAllKnownAttires', () => {
  it('passes silently when every attire name resolves', () => {
    expect(() =>
      assertAllKnownAttires({
        entries: [
          { kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: ['Toga', 'Executive'] },
        ],
        attireId,
      })
    ).not.toThrow();
  });

  it('throws naming the first unknown attire across entries', () => {
    expect(() =>
      assertAllKnownAttires({
        entries: [
          { kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: ['Toga'] },
          { kind: 'print', quantity: 1, printSizeCode: '2R', attireNames: ['Saya', 'Kimono'] },
        ],
        attireId,
      })
    ).toThrow('Unknown attire name: Saya');
  });
});

// Live probe (ADR-0008 pattern: skipped unless a reachable test db is
// configured) — proves the builders' values insert cleanly against the real
// schema, i.e. the shapes match the tables, not just the type signatures.
// package_inclusions.service_package_id is a NOT-NULL FK, so the probe
// inserts a real parent service package first. Drizzle's transaction COMMITs
// on success — there is no rollback-on-success primitive — so instead of a
// transaction the probe pre-cleans any rows a prior committed run left behind
// (FK-safe deletes on name LIKE 'BuilderProbe%'), then inserts plain. That
// keeps it re-runnable despite unique keys (attires.name,
// service_packages.name, frames natural key).
describe.runIf(process.env.TEST_DATABASE_URL)('live insert-compatibility', async () => {
  it('accepts builder output as drizzle insert values for all three tables', async () => {
    const {
      attires,
      createDbClient,
      frames,
      packageInclusionAttires,
      packageInclusions,
      servicePackages,
    } = await import('./index.js');
    const db = createDbClient(process.env.TEST_DATABASE_URL as string);
    try {
      await db.execute(
        sql`DELETE FROM package_inclusion_attires WHERE inclusion_id IN (SELECT i.id FROM package_inclusions i JOIN service_packages p ON p.id = i.service_package_id WHERE p.name LIKE 'BuilderProbe%')`
      );
      await db.execute(
        sql`DELETE FROM package_inclusions WHERE service_package_id IN (SELECT id FROM service_packages WHERE name LIKE 'BuilderProbe%')`
      );
      await db.execute(
        sql`DELETE FROM frames WHERE service_package_id IN (SELECT id FROM service_packages WHERE name LIKE 'BuilderProbe%')`
      );
      await db.execute(sql`DELETE FROM service_packages WHERE name LIKE 'BuilderProbe%'`);
      await db.execute(sql`DELETE FROM attires WHERE name LIKE 'BuilderProbe%'`);

      const [attireRow] = await db
        .insert(attires)
        .values({ name: 'BuilderProbe' })
        .returning({ id: attires.id });
      const probeAttireId = attireRow?.id;
      expect(probeAttireId).toBeDefined();
      if (!probeAttireId) throw new Error('probe: attire insert returned no id');

      const [pkgRow] = await db
        .insert(servicePackages)
        .values({
          name: 'BuilderProbe Package',
          description: 'probe',
          priceCents: 1,
          isActive: false,
        })
        .returning({ id: servicePackages.id });
      const probePkgId = pkgRow?.id;
      expect(probePkgId).toBeDefined();
      if (!probePkgId) throw new Error('probe: package insert returned no id');

      const [frameRow] = await db
        .insert(frames)
        .values(buildFrameRowValues({ servicePackageId: probePkgId, frameNumbers: [1] }))
        .returning({ id: frames.id });
      const probeFrameId = frameRow?.id;
      expect(probeFrameId).toBeDefined();
      if (!probeFrameId) throw new Error('probe: frame insert returned no id');

      const inclusionValues = buildInclusionRowValues({
        servicePackageId: probePkgId,
        entries: [
          { kind: 'print', quantity: 1, printSizeCode: null, attireNames: [] },
          {
            kind: 'framed_picture',
            quantity: 1,
            printSizeCode: null,
            attireNames: [],
            frameId: probeFrameId,
          },
        ],
        printSizeId: new Map(),
      });
      const inserted = await db
        .insert(packageInclusions)
        .values(inclusionValues)
        .returning({ id: packageInclusions.id, kind: packageInclusions.kind });
      expect(inserted).toHaveLength(2);

      const pairs = buildJunctionPairs({
        inclusionIds: inserted.map((r) => r.id),
        entries: [
          { kind: 'print', quantity: 1, printSizeCode: null, attireNames: ['BuilderProbe'] },
          { kind: 'privilege', description: 'probe', attireNames: [] },
        ],
        attireId: new Map([['BuilderProbe', probeAttireId]]),
      });
      expect(pairs).toHaveLength(1);
      await db.insert(packageInclusionAttires).values(pairs);
      // No assert needed on the insert: it either succeeds or throws the
      // test red.
    } finally {
      await db.$client.end();
    }
  });
});
