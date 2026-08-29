import { Hono } from "hono";

// STUB: returns fixture data until @sevendays/db is wired to a live
// DATABASE_URL. Replace with real Drizzle queries once the DB is provisioned
// (see docs/tech-stack.md).
export const branches = new Hono<{ Bindings: Env }>();

branches.get("/", (c) => {
  return c.json([
    {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Sevendays — Branch 1",
      address: "TBD",
      phone: "TBD",
      acceptsWalkIns: true,
    },
  ]);
});
