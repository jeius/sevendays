import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { v1 } from './routes/v1.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', cors({ origin: '*' })); // TODO(M6): restrict once domains exist.

// All body/query validation goes through the validated() helper so failures
// carry the uniform { error, details } shape — never raw zValidator.
// See services/validator.ts.

app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/api/v1', v1);

export default app;
