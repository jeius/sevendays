// The gallery grid's thumbnail proxy (M5 #141, AR-1): the API's gated
// by-id thumb route needs the Bearer session, so a browser <img> cannot
// reach it directly — this admin server route forwards the INCOMING
// request's cookie through the session-scoped client and streams the
// binary response through untouched (content-type carried; NO cache
// headers added — #136's agent ruling carries to the proxy). The API's
// requireSession stays the only auth gate: no cookie → the client seam
// throws → 401 here; an upstream error envelope → its status + body.
import { ApiClientError } from '@sevendays/api-client';
import { createFileRoute } from '@tanstack/react-router';

import { getSessionScopedApiClient } from '#/lib/api.server';

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
            },
          });
        } catch (error) {
          if (error instanceof ApiClientError) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: error.status,
              headers: { 'content-type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ error: 'Authentication required.' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
});
