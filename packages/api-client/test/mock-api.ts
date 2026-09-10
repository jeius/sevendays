import { Hono } from 'hono';

// Fixture rows shaped to the shared schemas (valid v4 uuids — zod's z.uuid()
// enforces RFC 4122 version/variant bits, so all-ones constants fail parse).
const NOW = new Date('2026-09-04T00:00:00.000Z');

const BRANCHES = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Main Studio',
    address: '123 Main St',
    phone: '+63 917 000 0000',
    acceptsWalkIns: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'North Branch',
    address: '45 North Ave',
    phone: '+63 917 111 1111',
    acceptsWalkIns: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const ADDONS = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Makeup',
    description: 'Professional makeup',
    priceCents: 150000,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const PACKAGES = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Basic Package',
    description: 'The basic studio package',
    priceCents: 250000,
    durationMinutes: null,
    isActive: true,
    coverImageKey: null,
    slug: 'basic-package',
    isFeatured: true,
    createdAt: NOW,
    updatedAt: NOW,
    inclusions: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        kind: 'framed_picture',
        quantity: 1,
        printSize: {
          id: '66666666-6666-4666-8666-666666666666',
          code: '8R',
          description: '8R print',
        },
        attires: [{ id: '77777777-7777-4777-8777-777777777777', name: 'Toga' }],
        frameId: '88888888-8888-4888-8888-888888888888',
        description: 'One framed 8R',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    frames: [
      {
        id: '88888888-8888-4888-8888-888888888888',
        servicePackageId: '44444444-4444-4444-8444-444444444444',
        frameNumber: 1,
      },
    ],
  },
];

const BRANCH_LINKS = [
  {
    studioServiceId: '55555555-5555-4555-8555-555555555555',
    branchId: '11111111-1111-4111-8111-111111111111',
  },
  {
    studioServiceId: '55555555-5555-4555-8555-555555555555',
    branchId: '22222222-2222-4222-8222-222222222222',
  },
  {
    studioServiceId: 'e0000000-0000-4000-8000-000000000000',
    branchId: '11111111-1111-4111-8111-111111111111',
  },
];

const STUDIO_SERVICES = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Portraits & ID Photo',
    description: 'Studio portraits and ID photos.',
    priceCents: 50000,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    applicableAddonServiceIds: [],
  },
  {
    id: 'e0000000-0000-4000-8000-000000000000',
    name: 'Retired Studio Service',
    description: 'No longer offered.',
    priceCents: 60000,
    isActive: false,
    createdAt: NOW,
    updatedAt: NOW,
    applicableAddonServiceIds: [],
  },
];

// Chained registration, mirroring apps/api's registration style (the mock
// must answer exactly the surface AppType describes).
const makeApi = ({ brokenBranches = false }: { brokenBranches?: boolean } = {}) => {
  type MockEnv = { Bindings: Record<string, never> };

  const branches = new Hono<MockEnv>().get('/', (c) =>
    c.json(
      brokenBranches
        ? [{ unexpected: 'shape' }] // schema-mismatch fixture for the unwrap test
        : BRANCHES
    )
  );

  const servicePackages = new Hono<MockEnv>()
    .get('/', (c) => c.json(PACKAGES))
    .get('/:slug', (c) => {
      const slug = c.req.param('slug');
      const pkg = PACKAGES.find((p) => p.slug === slug);
      if (!pkg) {
        return c.json({ error: 'Package not found.' }, 404);
      }
      return c.json(pkg);
    });

  const addonServices = new Hono<MockEnv>().get('/', (c) => c.json(ADDONS));

  const studioServices = new Hono<MockEnv>().get('/', (c) =>
    c.json(
      STUDIO_SERVICES.filter((s) => s.isActive).map((s) => ({
        ...s,
        bookableBranchIds: BRANCH_LINKS.filter((l) => l.studioServiceId === s.id).map(
          (l) => l.branchId
        ),
      }))
    )
  );

  const v1 = new Hono<MockEnv>()
    .use('*', async (_c, next) => {
      await next();
    })
    .route('/branches', branches)
    .route('/service-packages', servicePackages)
    .route('/studio-services', studioServices)
    .route('/addon-services', addonServices);

  return new Hono<MockEnv>()
    .use('*', async (_c, next) => {
      await next();
    })
    .onError((error, c) => {
      console.error(`[mock] ${c.req.method} ${c.req.path} failed:`, error);
      return c.json({ error: 'Internal server error.' }, 500);
    })
    .notFound((c) => c.json({ error: 'Not found.' }, 404))
    .route('/api/v1', v1);
};

export type MockApi = ReturnType<typeof makeApi>;
export const mockApi = makeApi();
export const mockApiBrokenBranches = makeApi({ brokenBranches: true });
