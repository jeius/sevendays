/// <reference types="vite/client" />

// The public-by-design Sentry vars (M6 #184): Vite bakes VITE_-prefixed
// process env into import.meta.env at build (highest priority — CI's deploy
// legs export them; locally they are absent, which is the no-op posture).
interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
}
