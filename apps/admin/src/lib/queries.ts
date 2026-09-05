import { queryOptions } from '@tanstack/react-query';
import { getBranches } from './api.functions';

// Query key factory (one resource today; grows with the Dashboard/CMS).
export const branchQueries = {
  all: () =>
    queryOptions({
      queryKey: ['branches'],
      queryFn: () => getBranches(),
    }),
};
