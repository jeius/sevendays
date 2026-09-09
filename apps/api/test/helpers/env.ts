// The full Worker binding for integration tests (issue #47 made
// RESEND_API_KEY + LANDING_ORIGIN required env — parseEnv fails without
// them, so every /api/v1 request must carry the complete set). The key is a
// placeholder: the Resend SDK is vi.mock'ed in the suites, so no real key
// (and no network) is ever needed here.
export function testEnv(databaseUrl: string) {
  return {
    DATABASE_URL: databaseUrl,
    RESEND_API_KEY: 're_test_placeholder',
    LANDING_ORIGIN: 'http://localhost:3000',
  };
}
