import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { branches } from "./routes/branches";
import { appointments } from "./routes/appointments";

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());
app.use(
  "*",
  cors({
    // TODO: restrict to the landing/admin app origins once deployed.
    origin: "*",
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/branches", branches);
app.route("/api/appointments", appointments);

export default app;
