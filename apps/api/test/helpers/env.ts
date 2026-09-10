// The full Worker binding for integration tests: parseEnv requires
// DATABASE_URL, so every /api/v1 request must carry it.
export function testEnv(databaseUrl: string) {
  return {
    DATABASE_URL: databaseUrl,
  };
}
