// pino 10.4.0 ships no exports map and no declarations beside browser.js, so
// `pino/browser` has no types under moduleResolution: nodenext. This shim
// declares the browser factory against the root pino types — the instance is
// runtime-compatible with everything @loglayer/transport-pino calls on it
// (the level methods only; spiking 2026-10-05, see the #183 plan). The
// options type is pino's real LoggerOptions (not Record<string, unknown>):
// strict mode needs the contextual type for the browser.write callback's
// object parameter.
declare module 'pino/browser' {
  import type { Logger } from 'pino';
  export function pino(options?: import('pino').LoggerOptions): Logger;
}
