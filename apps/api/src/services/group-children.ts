/**
 * Row-assembly for stitched list reads: group already-fetched child rows by
 * their parent key, then attach them to parent rows in a final pass.
 *
 * The contract (tested in group-children.test.ts):
 * - Order: each key's children come back in the order they arrived. Queries
 *   deliver children pre-ordered — the ORDER BY pins the append-only
 *   created_at proxies per the ADR-0009 revision; assembly never re-sorts.
 * - Empty groups: a key with no children yields [] — never undefined — so a
 *   parent with no children keeps an empty list after spread-attach.
 * - Keys: extracted by the caller-supplied `childKey` function; this module
 *   never sees SQL or column names.
 *
 * Groups hold raw rows — per-read projection (shape-building) stays in the
 * service, applied at the attach pass:
 *   parents.map((p) => ({ ...p, children: lookup(p.id).map(toChild) }))
 * (identity when the rows already carry exactly the wire shape).
 */
export function groupChildren<Child, Key extends string>(
  children: readonly Child[],
  childKey: (child: Child) => Key
): (key: Key) => Child[] {
  const groups = new Map<Key, Child[]>();
  for (const child of children) {
    const key = childKey(child);
    const list = groups.get(key);
    if (list) {
      list.push(child);
    } else {
      groups.set(key, [child]);
    }
  }
  return (key) => groups.get(key) ?? [];
}
