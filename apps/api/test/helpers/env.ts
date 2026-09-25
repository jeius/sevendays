// The full Worker binding for integration tests (issue #47 made
// RESEND_API_KEY + LANDING_ORIGIN required env — parseEnv fails without
// them, so every /api/v1 request must carry the complete set). The key is a
// placeholder: the Resend SDK is vi.mock'ed in the suites, so no real key
// (and no network) is ever needed here. BETTER_AUTH_SECRET (M4 ticket 04)
// is a fixed placeholder shared by the API's verification instance and the
// test-shaped auth issuer (helpers/auth.ts) — same value on both sides is
// what makes issued sessions verifiable (ADR-0004's shared-secret rule,
// mirrored at test scale). MEDIA_BUCKET/IMAGES (M5 #136) are binding-shaped
// stubs: `{}` passes the env schema's object check, and suites that exercise
// media behavior spread their own purpose-built stubs over these.
export const TEST_AUTH_SECRET = 'integration-test-secret-0123456789-0123456789-0123456789';

export function testEnv(databaseUrl: string) {
  return {
    DATABASE_URL: databaseUrl,
    RESEND_API_KEY: 're_test_placeholder',
    LANDING_ORIGIN: 'http://localhost:3000',
    BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
    MEDIA_BUCKET: {},
    IMAGES: {},
    CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
    MEDIA_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
  };
}
