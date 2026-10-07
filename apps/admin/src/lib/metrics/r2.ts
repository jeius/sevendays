// The R2 datasets client of the metrics seam (#187, ADR-0023): TWO
// documents whose field structure is verbatim from Cloudflare's R2
// metrics docs (r2OperationsAdaptiveGroups grouped by actionType;
// r2StorageAdaptiveGroups max-gauges newest-first), scoped to the media
// bucket, over the same GraphQL endpoint + envelope the workers client
// uses. The Class A/B classification is pinned from R2's pricing docs —
// deletes/aborts and unknown future names are the free class, counted in
// neither total. If the live probe (Task 7) rejects the `Time!` scalar,
// switch both documents to `string!` HERE and in the shape tests — that
// is the one documented fallback (the #186 note, still open).

import type { MetricsWindow } from './cf';
import { CF_GRAPHQL_URL, windowToRange } from './cf';
import type { MetricsResult, R2AnalyticsConfig } from './env';

export const R2_OPS_QUERY = `query R2Operations($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      r2OperationsAdaptiveGroups(
        limit: 10000
        filter: {datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName}
      ) {
        dimensions { actionType }
        sum { requests }
      }
    }
  }
}`;

export const R2_STORAGE_QUERY = `query R2Storage($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      r2StorageAdaptiveGroups(
        limit: 10000
        filter: {datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName}
        orderBy: [datetime_DESC]
      ) {
        dimensions { datetime }
        max { objectCount uploadCount payloadSize metadataSize }
      }
    }
  }
}`;

// The free-tier budget markers (spec-pinned): decimal GB — R2 bills
// decimal, formatBytes divides by 1000. A COST SIGNAL, not a quota.
export const R2_FREE_TIER = {
  storageBytes: 10_000_000_000,
  classAOps: 1_000_000,
  classBOps: 10_000_000,
} as const;

// Pinned from developers.cloudflare.com/r2/pricing (2026-10-07).
const CLASS_A_ACTIONS = new Set([
  'ListBuckets',
  'PutBucket',
  'ListObjects',
  'PutObject',
  'CopyObject',
  'CompleteMultipartUpload',
  'CreateMultipartUpload',
  'LifecycleStorageTierTransition',
  'ListMultipartUploads',
  'UploadPart',
  'UploadPartCopy',
  'ListParts',
  'PutBucketEncryption',
  'PutBucketCors',
  'PutBucketLifecycleConfiguration',
]);

const CLASS_B_ACTIONS = new Set([
  'HeadBucket',
  'HeadObject',
  'GetObject',
  'UsageSummary',
  'GetBucketEncryption',
  'GetBucketLocation',
  'GetBucketCors',
  'GetBucketLifecycleConfiguration',
]);

export function classifyActionType(actionType: string | null | undefined): 'A' | 'B' | null {
  if (typeof actionType !== 'string') return null;
  if (CLASS_A_ACTIONS.has(actionType)) return 'A';
  if (CLASS_B_ACTIONS.has(actionType)) return 'B';
  return null;
}

export type R2OpsRow = {
  dimensions: { actionType?: string | null };
  sum: { requests?: number };
};

export type R2OpsTotals = { classA: number; classB: number };

export function mungeR2Ops(rows: R2OpsRow[]): R2OpsTotals {
  const totals = { classA: 0, classB: 0 };
  for (const row of rows) {
    const r2Class = classifyActionType(row.dimensions?.actionType ?? null);
    if (r2Class === 'A') {
      totals.classA += row.sum?.requests ?? 0;
    } else if (r2Class === 'B') {
      totals.classB += row.sum?.requests ?? 0;
    }
  }
  return totals;
}

export type R2StorageRow = {
  dimensions: { datetime: string };
  max: {
    objectCount?: number;
    uploadCount?: number;
    payloadSize?: number;
    metadataSize?: number;
  };
};

export type R2StorageSample = {
  bucketStart: string;
  objectCount: number;
  payloadSizeBytes: number;
};

export type R2StorageMunged = {
  trend: R2StorageSample[];
  latestObjectCount: number | null;
  latestPayloadSizeBytes: number | null;
};

// The audience-half bucketing rule: hourly for 24h (a daily bucket over
// 24 hours is one point), daily for 7d/30d.
export function storageBucketStart(iso: string, window: MetricsWindow): string {
  const date = new Date(iso);
  const hours = window === '24h' ? date.getUTCHours() : 0;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours)
  ).toISOString();
}

export function mungeR2Storage(rows: R2StorageRow[], window: MetricsWindow): R2StorageMunged {
  const buckets = new Map<string, R2StorageSample>();
  let latestAt = Number.NEGATIVE_INFINITY;
  let latestObjectCount: number | null = null;
  let latestPayloadSizeBytes: number | null = null;
  for (const row of rows) {
    const datetime = row.dimensions?.datetime ?? '';
    const at = new Date(datetime).getTime();
    if (Number.isNaN(at)) continue;
    if (at > latestAt) {
      latestAt = at;
      latestObjectCount = row.max?.objectCount ?? null;
      latestPayloadSizeBytes = row.max?.payloadSize ?? null;
    }
    const key = storageBucketStart(datetime, window);
    const bucket = buckets.get(key) ?? { bucketStart: key, objectCount: 0, payloadSizeBytes: 0 };
    bucket.objectCount = Math.max(bucket.objectCount, row.max?.objectCount ?? 0);
    bucket.payloadSizeBytes = Math.max(bucket.payloadSizeBytes, row.max?.payloadSize ?? 0);
    buckets.set(key, bucket);
  }
  return {
    trend: [...buckets.values()].sort((a, b) => a.bucketStart.localeCompare(b.bucketStart)),
    latestObjectCount,
    latestPayloadSizeBytes,
  };
}

export type StorageMetrics = R2StorageMunged & { ops: R2OpsTotals };

async function fetchR2Dataset<T>(
  r2: R2AnalyticsConfig,
  query: string,
  dataset: 'r2OperationsAdaptiveGroups' | 'r2StorageAdaptiveGroups',
  window: MetricsWindow,
  fetchImpl: typeof fetch
): Promise<T[]> {
  const { since, until } = windowToRange(window);
  const res = await fetchImpl(CF_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${r2.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { accountTag: r2.accountId, bucketName: r2.bucket, since, until },
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: {
      viewer?: { accounts?: Array<Record<string, unknown>> };
    };
    errors?: Array<{ message?: string }>;
  };
  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors[0]?.message ?? 'GraphQL error');
  }
  const rows = body.data?.viewer?.accounts?.[0]?.[dataset];
  return Array.isArray(rows) ? (rows as T[]) : [];
}

export async function fetchStorageMetrics(
  env: { r2: R2AnalyticsConfig | null },
  window: MetricsWindow,
  fetchImpl: typeof fetch = fetch
): Promise<MetricsResult<StorageMetrics>> {
  const r2 = env.r2;
  if (r2 === null) {
    return { ok: false, reason: 'not-configured' };
  }
  try {
    const [opsRows, storageRows] = await Promise.all([
      fetchR2Dataset<R2OpsRow>(r2, R2_OPS_QUERY, 'r2OperationsAdaptiveGroups', window, fetchImpl),
      fetchR2Dataset<R2StorageRow>(
        r2,
        R2_STORAGE_QUERY,
        'r2StorageAdaptiveGroups',
        window,
        fetchImpl
      ),
    ]);
    return {
      ok: true,
      data: {
        ...mungeR2Storage(storageRows, window),
        ops: mungeR2Ops(opsRows),
      },
    };
  } catch (error) {
    // The loud detail stays log-only (#155): one line naming the source.
    console.error(
      '[metrics] R2 source unavailable:',
      error instanceof Error ? error.message : error
    );
    return { ok: false, reason: 'unavailable' };
  }
}
