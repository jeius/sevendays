// Read-only database-state probe. Prints record counts and table names only —
// never a connection string. Run: node --env-file=.env scripts/db-state.mjs
import postgres from 'postgres';
import dns from 'node:dns/promises';

const url = process.env.DATABASE_MIGRATE_URL;
if (!url) {
  console.error('DATABASE_MIGRATE_URL is not set (run scripts/check-env.mjs)');
  process.exit(1);
}

const host = new URL(url).hostname;
const v4 = await dns.resolve4(host).catch(() => []);
const v6 = await dns.resolve6(host).catch(() => []);
console.log(`migrate host DNS: A(ipv4)=${v4.length}, AAAA(ipv6)=${v6.length}`);
if (v4.length === 0 && v6.length === 0) {
  console.log('Host does not resolve.');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name
`;
console.log(
  'public tables:',
  tables.length === 0 ? '(none — database untouched)' : tables.map((r) => r.table_name).join(', ')
);
// drizzle-kit writes its journal to the dedicated `drizzle` schema (not public) —
// scan every schema (Task 5 execution finding).
const journal = await sql`
  select table_schema, table_name from information_schema.tables
  where table_name ilike '%drizzle%' order by table_schema, table_name
`;
console.log(
  'drizzle journal:',
  journal.length
    ? journal.map((r) => `${r.table_schema}.${r.table_name}`).join(', ')
    : 'absent — nothing applied yet'
);
await sql.end();
