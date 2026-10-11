// Ship-day media copy (M6 #191): lists every committed object in the
// source account's sevendays-media bucket and re-PUTs it into the
// destination account's same-named bucket (R2 has no bucket-move —
// ADR-0019 #4). The committed-object contract (src/services/media.ts):
// final objects are Content-Type image/jpeg with Cache-Control public,
// max-age=31536000, immutable; tmp/ staging never copies (its lifecycle
// rule expires it). aws4fetch here mirrors media.ts's own client
// construction (service s3, region auto — required by the signer, ignored
// by R2), riding the api's pinned dependency. Owner tooling, run from the
// runbook — never CI; every input is an exported env value (no .env file
// is read).
import { AwsClient } from 'aws4fetch';

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The ship runbook exports it before running this script — see docs/ship-provisioning-runbook.md.`
    );
  }
  return value;
}

const encodeKey = (key) => key.split('/').map(encodeURIComponent).join('/');

const source = new AwsClient({
  accessKeyId: required('SOURCE_R2_ACCESS_KEY_ID'),
  secretAccessKey: required('SOURCE_R2_SECRET_ACCESS_KEY'),
  service: 's3',
  region: 'auto',
});
const dest = new AwsClient({
  accessKeyId: required('DEST_R2_ACCESS_KEY_ID'),
  secretAccessKey: required('DEST_R2_SECRET_ACCESS_KEY'),
  service: 's3',
  region: 'auto',
});
const bucket = process.env.R2_BUCKET ?? 'sevendays-media';
const sourceBase = `https://${required('SOURCE_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${bucket}`;
const destBase = `https://${required('DEST_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${bucket}`;

// Minimal XML scrape (owner tooling — no XML dependency): S3 v2 list
// responses are flat <Contents><Key>..</Key><Size>..</Size></Contents>
// documents, paginated by continuation token.
async function listAll() {
  const objects = [];
  let token = '';
  for (;;) {
    const url = new URL(`${sourceBase}?list-type=2`);
    if (token) url.searchParams.set('continuation-token', token);
    const response = await source.fetch(url);
    if (!response.ok) {
      throw new Error(`list objects failed: ${response.status} ${await response.text()}`);
    }
    const xml = await response.text();
    for (const contents of xml.matchAll(/<Contents>(.*?)<\/Contents>/gs)) {
      const key = contents[1].match(/<Key>(.*?)<\/Key>/)?.[1];
      const size = Number(contents[1].match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0);
      if (key) objects.push({ key, size });
    }
    token = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/)?.[1] ?? '';
    if (!token || !/<IsTruncated>true<\/IsTruncated>/.test(xml)) break;
  }
  return objects;
}

const objects = (await listAll()).filter((object) => !object.key.startsWith('tmp/'));
console.log(`copying ${objects.length} committed object(s) (tmp/ skipped)`);
let copied = 0;
let bytes = 0;
for (const { key, size } of objects) {
  const get = await source.fetch(`${sourceBase}/${encodeKey(key)}`);
  if (!get.ok) {
    console.error(`GET ${key} → ${get.status}`);
    continue;
  }
  const contentType = get.headers.get('content-type') ?? 'image/jpeg';
  const cacheControl = get.headers.get('cache-control') ?? IMMUTABLE_CACHE_CONTROL;
  const body = await get.arrayBuffer();
  const put = await dest.fetch(`${destBase}/${encodeKey(key)}`, {
    method: 'PUT',
    headers: { 'content-type': contentType, 'cache-control': cacheControl },
    body,
  });
  if (!put.ok) {
    console.error(`PUT ${key} → ${put.status}`);
    continue;
  }
  copied += 1;
  bytes += size;
}
console.log(`${copied}/${objects.length} object(s), ${(bytes / 1e6).toFixed(1)} MB`);
process.exit(copied === objects.length ? 0 : 1);
