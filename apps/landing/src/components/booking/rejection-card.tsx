import { REJECTION_COPY, type RejectionReason } from '../../lib/booking';

export function RejectionCard({
  reason,
  apiMessage,
}: {
  reason: RejectionReason;
  apiMessage: string;
}) {
  return (
    <div
      role='alert'
      data-rejection-card
      className='mt-4 rounded-lg border border-destructive bg-destructive/10 p-4'
    >
      <p className='font-semibold text-destructive'>We couldn't complete that booking</p>
      <p className='mt-1 text-sm'>{REJECTION_COPY[reason]}</p>
      {apiMessage && (
        <p className='mt-2 font-mono text-muted-foreground text-xs'>API reason: {apiMessage}</p>
      )}
    </div>
  );
}
