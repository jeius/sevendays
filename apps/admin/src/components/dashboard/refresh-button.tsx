// The manual refresh (#186): one button invalidating the ['metrics']
// prefix — every widget refetches (revalidate-on-focus is the passive
// path; this is the active one; there is no polling).

import { Button } from '@sevendays/ui/components/button';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const queryClient = useQueryClient();
  return (
    <Button
      variant='outline'
      size='sm'
      onClick={() => {
        void queryClient.invalidateQueries({ queryKey: ['metrics'] });
      }}
    >
      <RefreshCw aria-hidden />
      Refresh
    </Button>
  );
}
