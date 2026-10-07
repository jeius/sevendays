// The Analytics Dashboard (#186, ADR-0023): the admin's landing screen —
// the #93 Dashboard stub dies here (the appointments stub at
// /appointments stays; it is v2 payload). Any staff session sees it; every
// source failure renders its widget's curated state; the page never 500s.
// The window is a search param (shareable, SSR-stable); the four
// sections ride it in the spec's order: Traffic, System Health,
// Storage & Media, Content.
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { PageHeader } from '#/components/cms/shared';
import { ContentCensusSection } from '#/components/dashboard/content-census';
import { RefreshButton } from '#/components/dashboard/refresh-button';
import { StorageMediaSection } from '#/components/dashboard/storage-media';
import { SystemHealth } from '#/components/dashboard/system-health';
import { TrafficSection } from '#/components/dashboard/traffic-section';
import { WindowToggle } from '#/components/dashboard/window-toggle';
import { metricsWindowSchema } from '#/lib/metrics/cf';

const analyticsSearchSchema = z.object({
  window: metricsWindowSchema.default('7d'),
});

export const Route = createFileRoute('/_shell/')({
  validateSearch: analyticsSearchSchema,
  head: () => ({ meta: [{ title: 'Analytics | Sevendays Admin' }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { window } = Route.useSearch();
  return (
    <div className='space-y-8'>
      <PageHeader
        title='Analytics'
        subline='Traffic, system health, storage, and content at a glance.'
        actions={
          <>
            <WindowToggle window={window} />
            <RefreshButton />
          </>
        }
      />
      <TrafficSection window={window} />
      <SystemHealth window={window} />
      <StorageMediaSection window={window} />
      <ContentCensusSection />
    </div>
  );
}
