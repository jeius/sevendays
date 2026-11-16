// The Notification (M9 #314, ADR-0028): the admin chrome's derived view
// over the pending-submissions queue — the badge IS the pending count, the
// panel lists the submissions themselves with confirm-guarded Accept and
// Reject, and an item leaves only by moderation (no dismiss, no mark-read,
// no per-staff state — the derived ruling's absences ARE the model). The
// query is the #288 factory at topbar scope (the topbar renders on every
// shell screen): the same ['admin', 'testimonial-submissions'] key the
// Submissions tab reads — one shared cache entry, so badge and tab update
// together by construction; freshness rides the seam's own contracts
// (window focus, staleness-bound refetch, the moderation mutations) plus a
// refetch on panel-open (D4). Anatomy: Variant C per #304 (dense list +
// initials), ported from prototype/bell-panel-variants — values and
// rulings, never the branch; the accept dialog's confirm takes the primary
// fill (confirmVariant, the #304 owner reaction — accept publishes, it
// doesn't destroy).
import type { TestimonialSubmission } from '@sevendays/types';
import { Button } from '@sevendays/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@sevendays/ui/components/popover';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sevendays/ui/components/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Bell, Check, X } from 'lucide-react';
import { useState } from 'react';
import {
  GuardedConfirm,
  PendingSpinner,
  QUERY_ERROR_LINE,
  QueryErrorState,
  SUBMISSION_STATUS_META,
} from '#/components/cms/shared';
import {
  acceptAdminTestimonialSubmission,
  rejectAdminTestimonialSubmission,
} from '#/lib/admin.functions';
import { adminTestimonialQueries, adminTestimonialSubmissionQueries } from '#/lib/cms-queries';
import {
  bellStatus,
  confirmBusy,
  initialsFromPerson,
  PANEL_CONFIRM_META,
  type PanelConfirm,
  panelActingRowId,
  rowActionState,
} from '#/lib/notification-state';
import { filterSubmissions, submittedOn } from '#/lib/submissions-state';

/** The first-load skeleton's fixed rows — stable keys, the tab's posture. */
const PENDING_SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3'];

export function Notification() {
  const {
    data: submissions,
    isPending,
    isError,
    refetch,
  } = useQuery(adminTestimonialSubmissionQueries.all());
  const queryClient = useQueryClient();
  // Controlled open — the refetch-on-open law (D4) rides onOpenChange:
  // what is examined is fresh. 60-second polling is the written-down v2
  // fence, NOT built (ADR-0028).
  const [open, setOpen] = useState(false);
  // One dialog at a time (the confirm-state machine's law).
  const [confirming, setConfirming] = useState<PanelConfirm>(null);

  // The tab's invalidation pair verbatim: badge, panel, and tab all ride
  // the submissions key; the testimonials list read joins so an accepted
  // row's published testimonial lands in one refetch.
  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: adminTestimonialSubmissionQueries.all().queryKey });
    queryClient.invalidateQueries({ queryKey: adminTestimonialQueries.all().queryKey });
  };

  // Accept-as-is: the panel has no edit surface, so the payload carries
  // no keys — absent keys keep the submission's stored text (the accept
  // schema's own clause). Pending-guarded by construction (the panel
  // lists only pending rows); failure keeps the dialog + toasts (retry
  // safe, the #218 hold law).
  const accept = useMutation({
    mutationFn: (row: TestimonialSubmission) =>
      acceptAdminTestimonialSubmission({ data: { id: row.id, payload: {} } }),
    onSuccess: (result) => {
      invalidateBoth();
      if (result.ok) {
        setConfirming(null);
        toast.success('Accepted.');
        return;
      }
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Reject-retains: the tab's contract verbatim (strings, labels, toasts).
  const reject = useMutation({
    mutationFn: (row: TestimonialSubmission) =>
      rejectAdminTestimonialSubmission({ data: { id: row.id } }),
    onSuccess: (result) => {
      invalidateBoth();
      if (result.ok) {
        setConfirming(null);
        toast.success('Rejected.');
        return;
      }
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rows = filterSubmissions(submissions ?? [], 'pending');
  const count = rows.length;
  const status = bellStatus(count);
  const actingId = panelActingRowId(
    accept.isPending,
    accept.variables?.id ?? null,
    reject.isPending,
    reject.variables?.id ?? null
  );

  return (
    // One provider over the whole surface — the trigger's hint and the
    // rows' action hints (context flows through the popover's portal).
    <TooltipProvider>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            void refetch();
          }
        }}
      >
        <Tooltip>
          {/* The trigger composes both primitives on one element — the
              Base UI chain: TooltipTrigger → PopoverTrigger → Button
              (outermost first, the house render-prop idiom). The count
              rides the accessible name; the visual badge is aria-hidden —
              one atomic status, no competing live region (D2). */}
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon'
                    type='button'
                    className='relative ml-auto'
                    aria-label={status.ariaName}
                  />
                }
              >
                <Bell aria-hidden='true' />
                {status.badge !== null ? (
                  <span
                    aria-hidden='true'
                    className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border px-1 text-[10px] leading-none font-semibold ${SUBMISSION_STATUS_META.pending.className}`}
                  >
                    {status.badge}
                  </span>
                ) : null}
              </PopoverTrigger>
            }
          />
          {status.tooltip !== null ? (
            <TooltipContent side='bottom'>{status.tooltip}</TooltipContent>
          ) : null}
        </Tooltip>
        <PopoverContent align='end' className='w-[400px] p-0'>
          {/* The workbar header (D2): uppercase-muted title + the count.
              While the first read is in flight there is no number to show
              — the header renders without one rather than a lying 0. */}
          <div className='text-muted-foreground flex items-center justify-between border-b px-4 py-2.5'>
            <p className='text-[11px] font-medium tracking-wide uppercase'>Pending submissions</p>
            <p className='text-xs'>{submissions === undefined ? null : count}</p>
          </div>
          {isError ? (
            // The house failed-read posture (#155) — the panel never
            // fakes the empty line over a failed read; the footer
            // persists.
            <div className='px-4 py-6'>
              <QueryErrorState
                line={QUERY_ERROR_LINE}
                onRetry={() => {
                  void refetch();
                }}
              />
            </div>
          ) : isPending || !submissions ? (
            // First-load posture: skeleton rows echoing the dense row
            // anatomy — the tab's own posture, scaled to the panel.
            <div className='max-h-[380px] space-y-3.5 overflow-y-auto p-4'>
              {PENDING_SKELETON_KEYS.map((key) => (
                <div key={key} className='flex items-start gap-3'>
                  <Skeleton className='size-8 shrink-0 rounded-full' />
                  <div className='flex-1 space-y-1.5'>
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-3 w-1/3' />
                  </div>
                </div>
              ))}
            </div>
          ) : count === 0 ? (
            // On-disk copy: the tab's pending-segment empty line, verbatim
            // (#216).
            <p className='text-muted-foreground px-4 py-10 text-center text-sm'>
              No pending submissions.
            </p>
          ) : (
            <div className='max-h-[380px] overflow-y-auto'>
              {rows.map((row) => {
                const action = rowActionState(actingId, row.id);
                return (
                  <div
                    key={row.id}
                    className='flex items-start gap-3 border-b px-4 py-2.5 last:border-b-0'
                  >
                    <span className='bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium'>
                      {initialsFromPerson(row.person)}
                    </span>
                    <div className='min-w-0 flex-1 space-y-0.5'>
                      <p className='line-clamp-2 text-sm'>{row.quote}</p>
                      <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                        <span className='font-medium'>{row.person}</span>
                        <span aria-hidden='true'>·</span>
                        <span>{submittedOn(row)}</span>
                      </div>
                    </div>
                    <div className='flex shrink-0 gap-1'>
                      {/* Icon-only actions — the vocabulary law's icon
                          half: the spinner takes the icon's place,
                          aria-busy carries state; the hover hints name
                          them for sighted users, the aria-label stays the
                          accessible name. */}
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              type='button'
                              aria-label='Accept'
                              disabled={action.disabled}
                              aria-busy={action.busy}
                              onClick={() => setConfirming({ kind: 'accept', row })}
                            >
                              {action.busy ? <PendingSpinner /> : <Check aria-hidden='true' />}
                            </Button>
                          }
                        />
                        <TooltipContent side='top'>Accept</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              type='button'
                              aria-label='Reject'
                              className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                              disabled={action.disabled}
                              aria-busy={action.busy}
                              onClick={() => setConfirming({ kind: 'reject', row })}
                            >
                              {action.busy ? <PendingSpinner /> : <X aria-hidden='true' />}
                            </Button>
                          }
                        />
                        <TooltipContent side='top'>Reject</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* The footer rides EVERY state (D2): the full vocabulary —
              accept-with-edit, delete — stays one click away in the tab.
              The click closes the popover so the landing screen isn't
              overlaid. */}
          <div className='border-t p-2'>
            <Button
              variant='link'
              size='sm'
              type='button'
              className='w-full'
              render={
                <Link
                  to='/testimonials'
                  search={{ tab: 'submissions' }}
                  onClick={() => {
                    setOpen(false);
                  }}
                />
              }
            >
              Open Submissions
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {confirming ? (
        <GuardedConfirm
          title={PANEL_CONFIRM_META[confirming.kind].title}
          description={PANEL_CONFIRM_META[confirming.kind].description}
          confirmLabel={PANEL_CONFIRM_META[confirming.kind].confirmLabel}
          busyLabel={PANEL_CONFIRM_META[confirming.kind].busyLabel}
          confirmVariant={PANEL_CONFIRM_META[confirming.kind].confirmVariant}
          pending={confirmBusy(confirming, actingId)}
          blockers={[]}
          open={true}
          onOpenChange={(next) => {
            if (!next) {
              setConfirming(null);
            }
          }}
          onConfirm={() => {
            if (confirming.kind === 'accept') {
              accept.mutate(confirming.row);
            } else {
              reject.mutate(confirming.row);
            }
          }}
        />
      ) : null}
    </TooltipProvider>
  );
}
