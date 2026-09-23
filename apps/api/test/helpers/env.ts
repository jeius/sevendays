// The full Worker binding for integration tests: parseEnv requires
// DATABASE_URL, so every /api/v1 request must carry it. BETTER_AUTH_SECRET
// (M4 ticket 04) is a fixed placeholder shared by the API's verification
// instance and the test-shaped auth issuer (helpers/auth.ts) — same value on
// both sides is what makes issued sessions verifiable (ADR-0004's
// shared-secret rule, mirrored at test scale).
export const TEST_AUTH_SECRET = 'integration-test-secret-0123456789-0123456789-0123456789';

export function testEnv(databaseUrl: string) {
  return {
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
  };
}
