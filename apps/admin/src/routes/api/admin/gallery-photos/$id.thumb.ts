// The gallery grid's thumbnail proxy (M5 #141, AR-1): the API's gated
// by-id thumb route needs the Bearer session, so a browser <img> cannot
// reach it directly — this admin server route forwards the INCOMING
// request's cookie through the session-scoped client and streams the
// binary response through untouched (content-type carried). Cache law
// (M8 #287 — supersedes the #136 no-cache ruling, dated in the ADR-0019
// amendments): 2xx answers `private, max-age=31536000, immutable` — the
// thumb URL carries the photo's updatedAt as ?v= (the gallery-thumbs
// seam builds it), so a cached entry can never outlive its content, and
// `private` keeps session-gated bytes out of every shared cache (this
// response never touches the Workers Cache API — the ADR-0025/#286
// public-container rule is about Cache API puts, a different mechanism).
// Every error arm answers `no-store` — a transient 401/502 is never
// cached under a thumb URL. The ?v= query param is browser cache-key
// shaping only: the upstream call passes the id alone, unchanged. The
// API's requireSession stays the only auth gate: an upstream error
// envelope → its status + body; no cookie → SessionMissingError → 401
// here; any other non-upstream throw → 502.
import { ApiClientError } from '@sevendays/api-client';
import { createFileRoute } from '@tanstack/react-router';

import { getSessionScopedApiClient, SessionMissingError } from '#/lib/api.server';
import { THUMB_CACHE_IMMUTABLE, THUMB_CACHE_NO_STORE } from '#/lib/gallery-thumbs';

export const Route = createFileRoute('/api/admin/gallery-photos/$id/thumb')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const cookie = request.headers.get('cookie');
          const client = getSessionScopedApiClient(cookie);
          const upstream = await client.admin.galleryPhotos.thumbResponse({
            param: { id: params.id },
          });
          return new Response(upstream.body, {
            status: upstream.status,
            headers: {
              'content-type': upstream.headers.get('content-type') ?? 'image/webp',
              'cache-control': THUMB_CACHE_IMMUTABLE,
            },
          });
        } catch (error) {
          if (error instanceof ApiClientError) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: error.status,
              headers: {
                'content-type': 'application/json',
                'cache-control': THUMB_CACHE_NO_STORE,
              },
            });
          }
          if (error instanceof SessionMissingError) {
            return new Response(JSON.stringify({ error: 'Authentication required.' }), {
              status: 401,
              headers: {
                'content-type': 'application/json',
                'cache-control': THUMB_CACHE_NO_STORE,
              },
            });
          }
          // Infra failure (binding hiccup, unexpected throw) — no longer
          // masked as a 401 (#143 sweep): name it a bad gateway.
          return new Response(JSON.stringify({ error: 'Internal server error.' }), {
            status: 502,
            headers: {
              'content-type': 'application/json',
              'cache-control': THUMB_CACHE_NO_STORE,
            },
          });
        }
      },
    },
  },
});
