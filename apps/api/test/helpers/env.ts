// The full Worker binding for integration tests (issue #47 made
// NOTICE_API_KEY + SITE_ORIGIN required env — parseEnv fails without
// them, so every /api/v1 request must carry the complete set). The key is a
// placeholder: the Resend SDK is vi.mock'ed in the suites, so no real key
// (and no network) is ever needed here.
export function testEnv(databaseUrl: string) {
  return {
    DATABASE_URL: databaseUrl,
    NOTICE_API_KEY: 're_test_placeholder',
    SITE_ORIGIN: 'http://localhost:3000',
  };
}
