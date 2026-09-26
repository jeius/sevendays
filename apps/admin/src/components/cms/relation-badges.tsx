// The #131 bulk ruling + relations ruling (M5 #140): relations render as outline badges in the A2/S2 posture of record; a deactivated relation dims to opacity-60 (AQ-6, the dimmed-chip posture), and an empty relation list renders a muted em dash.
import { Badge } from '@sevendays/ui/components/badge';

/**
 * A relation cell: the related entities' names as outline badges. Names in
 * `mutedNames` (the deactivated relations, supplied by the screen from the
 * loaded relation list) render dimmed — AQ-6's "visible but visibly off"
 * posture, matching #139's dimmed status treatment.
 */
export function RelationBadges({
  names,
  mutedNames,
}: {
  names: string[];
  mutedNames?: ReadonlySet<string>;
}) {
  if (names.length === 0) {
    return <span className='text-muted-foreground'>—</span>;
  }
  return (
    <div className='flex flex-wrap gap-1'>
      {names.map((name) => (
        <Badge
          key={name}
          variant='outline'
          className={mutedNames?.has(name) ? 'opacity-60' : undefined}
        >
          {name}
        </Badge>
      ))}
    </div>
  );
}
