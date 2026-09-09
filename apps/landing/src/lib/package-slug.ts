// biome-ignore lint/performance/noBarrelFile: deliberate compatibility re-export — the 404 seam was promoted to api-404.ts (ticket 08); keeps the historical import path stable.
export { toNotFoundError } from './api-404.js';
