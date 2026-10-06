// The Sentry capture seam (M6 #184, spec § Sentry): a function-pointer
// registry so the vitest graph never loads @sentry/cloudflare — the worker
// entry (src/worker.ts, the wrangler main) registers the SDK-backed capture
// inside withSentry's options callback; every runtime consumer (onError, the
// email waitUntil catch) and every test stays SDK-free, tests injecting a
// stub via setErrorCapture. The default is a no-op: a deploy without
// SENTRY_DSN — or any code before registration — captures nothing, the same
// no-op-without-DSN posture the frontends' scaffold codified.
export type ErrorCapture = (error: unknown) => void;

const noop: ErrorCapture = () => {};

let capture: ErrorCapture = noop;

export function setErrorCapture(fn: ErrorCapture): void {
  capture = fn;
}

export function resetErrorCapture(): void {
  capture = noop;
}

// Every thrown error IS a 5xx response (the curated media 503 or the uniform
// 500 — onError answers exactly those two); 4xx never reaches onError
// (validated* helpers and requireSession return, they do not throw), so this
// seam cannot over-capture.
export function captureError(error: unknown): void {
  capture(error);
}
