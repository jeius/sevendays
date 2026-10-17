// The packages expanded row's content (M7 #219, spec § the packages
// expanded row): the whole answer — the full description, a duration
// line (durationMinutes renders nowhere else in the table), frames as a
// chip row (frame numbers), and inclusions as bullet points (label +
// print size + attires). Pure rendering over the unchanged
// ServicePackageRead — zero API work. ONE composition serves both
// postures (the desktop ExpandPanel and the mobile stacked reveal), so
// the two never drift; every string comes from the lib seam
// (package-expanded-row.ts), pinned by its suite.
import type { ServicePackageRead } from '@sevendays/types';
import { Badge } from '@sevendays/ui/components/badge';
import { Clock } from 'lucide-react';
import { expandedRowModel } from '#/lib/package-expanded-row';

export function PackageExpandedContent({ row }: { row: ServicePackageRead }) {
  const { description, durationLine, frameChips, inclusionLines } = expandedRowModel(row);
  return (
    <div className='space-y-2.5'>
      {/* The description is the panel's primary content — foreground in
          both postures (the desktop panel's muted wrapper is overridden
          by the explicit class; the round may restore muted). */}
      <p className='text-foreground text-sm leading-relaxed'>{description}</p>
      {/* TODO(owner-copy): the duration line's form (Clock + "60 minutes")
          awaits the owner's ratification (#134 open items). */}
      {durationLine ? (
        <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
          <Clock className='size-3.5' aria-hidden='true' />
          {durationLine}
        </p>
      ) : null}
      {frameChips.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {frameChips.map((chip) => (
            <Badge key={chip} variant='outline' className='text-xs'>
              {chip}
            </Badge>
          ))}
        </div>
      ) : null}
      {inclusionLines.length > 0 ? (
        // Index keys are safe here: a row's inclusion lines are a static
        // per-render list (rows themselves key by row.id; the model
        // re-derives whole on every refetch) and duplicate lines are
        // lawful (two identical print rows), so the line text is not a
        // stable key.
        <ul className='text-muted-foreground list-disc space-y-0.5 pl-5 text-sm'>
          {inclusionLines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
