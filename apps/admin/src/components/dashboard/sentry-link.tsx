// The Sentry link-out (#186, ADR-0023's source discipline): Sentry is
// capture-only — its query API is Team-gated — so the dashboard shows the
// count CF's sum.errors already gave us and LINKS to the console for
// drill-down. Never a rebuild. The card lives inline in system-health
// (the ratified hierarchy composition); this module owns the URL. The
// link opens in a new tab (owner ruling, 2026-10-06). URL owner-ratified
// (same day, plan session): org slug sevendays-studio.
export const SENTRY_CONSOLE_URL = 'https://sevendays-studio.sentry.io/issues/';
