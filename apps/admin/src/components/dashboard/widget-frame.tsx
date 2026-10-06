// The dashboard's widget chrome (#186): one Card per widget with a title,
// an optional window badge, and the CURATED failure states — the #155
// leak-safe pattern carried to the dashboard. A widget never throws, never
// bubbles: pending renders skeletons, a resolved not-ok result renders its
// pinned line, a thrown query error (the gate, or an SSR transport fault)
// folds to the unavailable line — the never-500 law, structurally.

import { Card, CardContent, CardHeader, CardTitle } from '@sevendays/ui/components/card';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import type { ReactNode } from 'react';

export const NOT_CONFIGURED_LINE = 'Analytics source not configured.';
export const UNAVAILABLE_LINE = 'Analytics source unavailable.';

export type WidgetState = 'loading' | 'ready' | 'not-configured' | 'unavailable';

// isPending/isError come straight from useQuery; the result is the seam's
// MetricsResult union. A thrown error is deliberately indistinguishable
// from a resolved unavailable in the UI (the loud detail is log-only).
export function resolveWidgetState(
  isPending: boolean,
  isError: boolean,
  ok: boolean | undefined,
  reason: 'not-configured' | 'unavailable' | undefined
): WidgetState {
  if (isPending) return 'loading';
  if (isError) return 'unavailable';
  if (ok === undefined) return 'unavailable';
  return ok ? 'ready' : reason === 'not-configured' ? 'not-configured' : 'unavailable';
}

export function WidgetFrame({
  title,
  badge,
  state,
  children,
}: {
  title: string;
  badge?: string;
  state: WidgetState;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between gap-2'>
          <CardTitle className='text-sm font-medium'>{title}</CardTitle>
          {badge ? <span className='text-muted-foreground text-xs'>{badge}</span> : null}
        </div>
      </CardHeader>
      <CardContent>
        {state === 'loading' ? (
          <div className='space-y-2'>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-16 w-full' />
          </div>
        ) : state === 'not-configured' ? (
          <p className='text-muted-foreground text-sm'>{NOT_CONFIGURED_LINE}</p>
        ) : state === 'unavailable' ? (
          <p className='text-muted-foreground text-sm'>{UNAVAILABLE_LINE}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
