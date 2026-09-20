import { cn } from 'cn';
import { TIME_SLOTS } from '../../lib/booking';

// The placeholder hour grid (#58 inventory — deliberately not Slot-named;
// Slot is glossary domain language for real availability, which v1 doesn't
// have). v2-transient: the availability rebuild may replace the whole
// control — token-fit styling only, no structural investment.
export function HourChipGrid({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (time: string) => void;
}) {
  return (
    <div className='mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5'>
      {TIME_SLOTS.map((t) => (
        <HourChip key={t} time={t} selected={value === t} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function HourChip({
  time,
  selected,
  onSelect,
}: {
  time: string;
  selected: boolean;
  onSelect: (time: string) => void;
}) {
  return (
    <button
      type='button'
      aria-pressed={selected}
      onClick={() => onSelect(time)}
      className={cn(
        'focus-visible:ring-brand-focus-ring rounded-lg border px-2 py-2 font-mono text-sm transition-colors focus-visible:ring-3',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-brand-gray-cool bg-card hover:border-brand-400'
      )}
    >
      {time}
    </button>
  );
}
