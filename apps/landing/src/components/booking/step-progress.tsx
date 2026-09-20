import { Progress } from '@sevendays/ui/components/progress';

const TOTAL_STEPS = 5;

// The wizard's step indicator (#58: composed on the shared progress
// primitive — replaces the hand-rolled width div). Base UI's value scale is
// 0–100 (min 0 / max 100 defaults), so step N of 5 renders N/5 × 100.
export function StepProgress({ step, className }: { step: number; className?: string }) {
  return (
    <Progress
      value={(step / TOTAL_STEPS) * 100}
      aria-label={`Booking step ${step} of ${TOTAL_STEPS}`}
      className={className}
    />
  );
}
