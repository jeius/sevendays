// The dashboard's stat card (#186): label + value + optional hint, on the
// shared Card primitive. App-local per the #93 reversal — data-viz has
// exactly one consumer (the admin dashboard) and no shared primitive is
// warranted for it.

import { Card, CardContent } from '@sevendays/ui/components/card';
import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className='p-4'>
        <p className='text-muted-foreground text-xs font-medium'>{label}</p>
        <p className='text-2xl font-semibold tabular-nums'>{value}</p>
        {hint ? <p className='text-muted-foreground text-xs'>{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
