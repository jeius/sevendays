// The class-strategy provider seam (M7 #217, #162's ruling): next-themes
// stays a packages/ui-only dependency — one dep site, both apps mount the
// provider through the workspace export. Apps pass the ruled strategy:
// attribute="class", defaultTheme="light" (M3's accepted first impression
// preserved — dark is opt-in), enableSystem={false} (the offer is
// Light/Dark only, no system), disableTransitionOnChange (no color-flash
// on flip). next-themes 0.4.6's own defaults are system/defaultTheme=
// 'system' — the apps' explicit props are load-bearing.
// biome-ignore lint/performance/noBarrelFile: the next-themes provider seam re-exports the class-strategy provider for app consumers (#217; the sonner.tsx precedent)
export { ThemeProvider, type ThemeProviderProps } from 'next-themes';
