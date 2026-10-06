// The Sentry link-out (#186, ADR-0023's source discipline): Sentry is
// capture-only — its query API is Team-gated — so this widget shows the
// count CF's sum.errors already gave us and LINKS to the console for
// drill-down. Never a rebuild. The URL is owner-ratified (2026-10-06,
// plan session): org slug sevendays-studio.
import type { MetricsWindow } from '#/lib/metrics/cf';
import { formatCount } from './format';
import { WidgetFrame, type WidgetState } from './widget-frame';

export const SENTRY_CONSOLE_URL = 'https://sevendays-studio.sentry.io/issues/';

export function SentryLinkWidget({
  window,
  state,
  errors,
}: {
  window: MetricsWindow;
  state: WidgetState;
  errors: number | null;
}) {
  return (
    <WidgetFrame title='Sentry' badge={window} state={state}>
      <p className='text-2xl font-semibold tabular-nums'>
        {errors === null ? '—' : formatCount(errors)}
      </p>
      <p className='text-muted-foreground text-xs'>errors captured, all apps</p>
      <a
        href={SENTRY_CONSOLE_URL}
        target='_blank'
        rel='noreferrer noopener'
        className='text-primary text-sm underline-offset-4 hover:underline'
      >
        Open Sentry console
      </a>
    </WidgetFrame>
  );
}
