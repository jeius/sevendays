// Content (#186): entity counts (active rows) + last-updated (max
// updated_at over ALL rows — a deactivation is an update) per family.
// Point-in-time, windowless, staleTime 5m.
import { useQuery } from '@tanstack/react-query';

import type { ContentCensus } from '#/lib/metrics/db';
import { metricsQueries } from '#/lib/metrics-queries';
import { formatUtc } from './format';
import { resolveWidgetState, WidgetFrame } from './widget-frame';

const FAMILY_LABELS: Record<ContentCensus[number]['key'], string> = {
  packages: 'Packages',
  addons: 'Add-ons',
  photos: 'Gallery photos',
  testimonials: 'Testimonials',
};

export function ContentCensusSection() {
  const content = useQuery(metricsQueries.content());
  const state = resolveWidgetState(
    content.isPending,
    content.isError,
    content.data?.ok,
    content.data?.ok === false ? content.data.reason : undefined
  );
  return (
    <section className='space-y-4' aria-label='Content'>
      <h2 className='text-lg font-semibold tracking-tight'>Content</h2>
      <WidgetFrame title='Catalog + content census' state={state}>
        {content.data?.ok ? (
          <ul className='divide-y'>
            {content.data.data.map((family) => (
              <li key={family.key} className='flex items-center justify-between gap-4 py-2 text-sm'>
                <span>{FAMILY_LABELS[family.key]}</span>
                <span className='tabular-nums'>
                  {family.activeCount} active · updated {formatUtc(family.lastUpdated)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </WidgetFrame>
    </section>
  );
}
