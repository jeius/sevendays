// The R2 datasets half of the metrics seam (#187): the two docs-verbatim
// GraphQL documents (field structure pinned from Cloudflare's R2 metrics
// docs), the actionType→class classifier (pinned from R2's pricing docs),
// the gauge munging (storage samples are MAXes within buckets, latest =
// the freshest sample), and the fetch contract with its failure mapping.
// Plain-node over stubbed fetch — no network, no browser.
import { describe, expect, it } from 'vitest';
import { CF_GRAPHQL_URL, windowToRange } from './cf';
import type { MetricsEnv } from './env';
import {
  classifyActionType,
  fetchStorageMetrics,
  mungeR2Ops,
  mungeR2Storage,
  R2_FREE_TIER,
  R2_OPS_QUERY,
  R2_STORAGE_QUERY,
  storageBucketStart,
} from './r2';

const ENV: MetricsEnv = {
  cf: null,
  r2: { token: 'cf-token', accountId: 'account-id', bucket: 'sevendays-media' },
  posthog: null,
  dbUrl: null,
};

describe('the pinned GraphQL documents (R2 metrics docs-verbatim field structure)', () => {
  it('the operations document groups requests by actionType over the bucket filter', () => {
    expect(R2_OPS_QUERY).toBe(
      [
        'query R2Operations($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) {',
        '  viewer {',
        '    accounts(filter: {accountTag: $accountTag}) {',
        '      r2OperationsAdaptiveGroups(',
        '        limit: 10000',
        '        filter: {datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName}',
        '      ) {',
        '        dimensions { actionType }',
        '        sum { requests }',
        '      }',
        '    }',
        '  }',
        '}',
      ].join('\n')
    );
  });

  it('the storage document reads the max gauges, newest first', () => {
    expect(R2_STORAGE_QUERY).toBe(
      [
        'query R2Storage($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) {',
        '  viewer {',
        '    accounts(filter: {accountTag: $accountTag}) {',
        '      r2StorageAdaptiveGroups(',
        '        limit: 10000',
        '        filter: {datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName}',
        '        orderBy: [datetime_DESC]',
        '      ) {',
        '        dimensions { datetime }',
        '        max { objectCount uploadCount payloadSize metadataSize }',
        '      }',
        '    }',
        '  }',
        '}',
      ].join('\n')
    );
  });

  it('the free-tier markers are the spec-pinned decimal values', () => {
    expect(R2_FREE_TIER).toEqual({
      storageBytes: 10_000_000_000,
      classAOps: 1_000_000,
      classBOps: 10_000_000,
    });
  });
});

describe('classifyActionType (the pricing-docs-pinned sets)', () => {
  it('maps writes and lists to A, reads to B, deletes/unknowns to the uncounted free class', () => {
    expect(classifyActionType('PutObject')).toBe('A');
    expect(classifyActionType('ListObjects')).toBe('A');
    expect(classifyActionType('GetObject')).toBe('B');
    expect(classifyActionType('HeadObject')).toBe('B');
    expect(classifyActionType('DeleteObject')).toBeNull();
    expect(classifyActionType('AbortMultipartUpload')).toBeNull();
    expect(classifyActionType('SomeFutureOperation')).toBeNull();
    expect(classifyActionType(null)).toBeNull();
  });
});

describe('mungeR2Ops', () => {
  it('sums requests per class across rows and ignores the free class', () => {
    expect(
      mungeR2Ops([
        { dimensions: { actionType: 'PutObject' }, sum: { requests: 40 } },
        { dimensions: { actionType: 'GetObject' }, sum: { requests: 900 } },
        { dimensions: { actionType: 'DeleteObject' }, sum: { requests: 7 } },
        { dimensions: { actionType: 'PutObject' }, sum: { requests: 10 } },
      ])
    ).toEqual({ classA: 50, classB: 900 });
  });
});

describe('storageBucketStart (the audience-half rule: hourly for 24h, daily otherwise)', () => {
  it('24h buckets by hour; 7d and 30d bucket by day', () => {
    expect(storageBucketStart('2026-10-06T11:41:00.000Z', '24h')).toBe('2026-10-06T11:00:00.000Z');
    expect(storageBucketStart('2026-10-06T11:41:00.000Z', '7d')).toBe('2026-10-06T00:00:00.000Z');
    expect(storageBucketStart('2026-10-06T11:41:00.000Z', '30d')).toBe('2026-10-06T00:00:00.000Z');
  });
});

describe('mungeR2Storage', () => {
  const row = (datetime: string, objectCount: number, payloadSize: number) => ({
    dimensions: { datetime },
    max: { objectCount, uploadCount: 0, payloadSize, metadataSize: 1024 },
  });

  it('buckets samples by window, MAXes the gauges within a bucket, and sorts ascending', () => {
    expect(
      mungeR2Storage(
        [
          row('2026-10-06T11:04:00.000Z', 10, 1_000_000),
          row('2026-10-06T11:41:00.000Z', 12, 900_000),
          row('2026-10-06T09:20:00.000Z', 8, 700_000),
        ],
        '7d'
      ).trend
    ).toEqual([
      { bucketStart: '2026-10-06T00:00:00.000Z', objectCount: 12, payloadSizeBytes: 1_000_000 },
    ]);
  });

  it('latest is the freshest sample, not the first row', () => {
    const munged = mungeR2Storage(
      [
        row('2026-10-06T11:00:00.000Z', 10, 1_000_000),
        row('2026-10-07T09:00:00.000Z', 14, 2_000_000),
      ],
      '7d'
    );
    expect(munged.latestObjectCount).toBe(14);
    expect(munged.latestPayloadSizeBytes).toBe(2_000_000);
  });

  it('an empty dataset munges to an empty trend and null latest values, not an error', () => {
    expect(mungeR2Storage([], '7d')).toEqual({
      trend: [],
      latestObjectCount: null,
      latestPayloadSizeBytes: null,
    });
  });
});

describe('fetchStorageMetrics', () => {
  it('posts both documents with bearer auth and the bucket-scoped variables, then munges the union', async () => {
    const calls: Array<{ url: string; init: RequestInit; body: Record<string, unknown> }> = [];
    const fetchImpl = async (url: unknown, init: RequestInit) => {
      calls.push({ url: String(url), init, body: JSON.parse(String(init.body)) });
      const which = calls.length;
      return {
        ok: true,
        json: async () => ({
          data: {
            viewer: {
              accounts: [
                which === 1
                  ? {
                      r2OperationsAdaptiveGroups: [
                        { dimensions: { actionType: 'PutObject' }, sum: { requests: 40 } },
                        { dimensions: { actionType: 'GetObject' }, sum: { requests: 900 } },
                      ],
                    }
                  : {
                      r2StorageAdaptiveGroups: [
                        {
                          dimensions: { datetime: '2026-10-06T11:00:00.000Z' },
                          max: {
                            objectCount: 12,
                            uploadCount: 0,
                            payloadSize: 1_000_000,
                            metadataSize: 1024,
                          },
                        },
                      ],
                    },
              ],
            },
          },
        }),
      };
    };
    const result = await fetchStorageMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({
      ok: true,
      data: {
        trend: [
          { bucketStart: '2026-10-06T00:00:00.000Z', objectCount: 12, payloadSizeBytes: 1_000_000 },
        ],
        latestObjectCount: 12,
        latestPayloadSizeBytes: 1_000_000,
        ops: { classA: 40, classB: 900 },
      },
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe(CF_GRAPHQL_URL);
    expect(new Headers(calls[0]?.init.headers).get('authorization')).toBe('Bearer cf-token');
    expect(calls[0]?.body.variables).toEqual({
      accountTag: 'account-id',
      bucketName: 'sevendays-media',
      since: windowToRange('7d').since,
      until: windowToRange('7d').until,
    });
    expect(calls[1]?.body.query).toBe(R2_STORAGE_QUERY);
  });

  it('an unconfigured r2 group resolves not-configured (no fetch at all)', async () => {
    let fetched = 0;
    const fetchImpl = async () => {
      fetched += 1;
      throw new Error('must not be called');
    };
    const unconfigured: MetricsEnv = { cf: null, r2: null, posthog: null, dbUrl: null };
    const result = await fetchStorageMetrics(
      unconfigured,
      '7d',
      fetchImpl as unknown as typeof fetch
    );
    expect(result).toEqual({ ok: false, reason: 'not-configured' });
    expect(fetched).toBe(0);
  });

  it('a non-200 response maps to unavailable', async () => {
    const fetchImpl = async () => ({ ok: false, status: 403, json: async () => ({}) });
    const result = await fetchStorageMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a GraphQL errors array (HTTP 200) maps to unavailable — the loud detail is log-only', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ data: null, errors: [{ message: 'Unknown field' }] }),
    });
    const result = await fetchStorageMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('a thrown fetch (network) maps to unavailable', async () => {
    const fetchImpl = async () => {
      throw new Error('network down');
    };
    const result = await fetchStorageMetrics(ENV, '7d', fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});
