// #187: the landing's provider alone captures pageviews and Core Web
// Vitals — 'history_change' catches the initial load AND TanStack
// Router's SPA navigations (they flow through the history API), and
// web_vitals autocapture emits $web_vitals with $web_vitals_<NAME>_value
// (LCP/CLS/FCP/INP). The admin's provider deliberately stays
// pageview/vitals-off: Traffic is landing-scoped by the host allowlist,
// and the admin's own events never join it. Options grep-proven against
// the installed posthog-js 1.422.5 / @posthog/types 1.407.1.
// #187 ledger note: the flip implicitly enables $pageleave too — the SDK
// default capture_pageleave 'if_capture_pageview' keys on pageviews being
// on. An event class beyond pageviews + web vitals, landing-scoped by the
// same host allowlist; mute explicitly with capture_pageleave: false if
// its volume ever matters.
import { PostHogProvider as BasePostHogProvider } from '@posthog/react';
import posthog from 'posthog-js';
import type { ReactNode } from 'react';

if (typeof window !== 'undefined' && import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_performance: { web_vitals: true },
    defaults: '2025-11-30',
  });
}

interface PostHogProviderProps {
  children: ReactNode;
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  return <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>;
}
