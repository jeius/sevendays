// The Submissions tab (M7 #218 over #216's moderation endpoints): the
// pending queue on the Testimonials screen — a stop on an existing screen,
// not a new place to remember. Pending-guarded accept-with-edit (the
// accept sheet rides LightEntityEditor's async Save contract, saveLabel
// 'Accept' — busy 'Accepting…'), reject-retains (GuardedConfirm), and
// delete-any-status (DeleteGuardDialog — a submission references nothing,
// so blockers never arrive). The tab's own status segment defaults to
// Pending: the queue IS the work. The list renders newest-first as the API
// serves it; no reordering exists here.
import type { TestimonialSubmission } from '@sevendays/types';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Field, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import { Textarea } from '@sevendays/ui/components/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import {
  DeleteGuardDialog,
  EmptyState,
  GuardedConfirm,
  LightEntityEditor,
  QUERY_ERROR_LINE,
  QueryErrorState,
  SegmentedControl,
  SubmissionStatusBadge,
} from '#/components/cms/shared';
import {
  acceptAdminTestimonialSubmission,
  rejectAdminTestimonialSubmission,
  removeAdminTestimonialSubmission,
} from '#/lib/admin.functions';
import { adminTestimonialQueries, adminTestimonialSubmissionQueries } from '#/lib/cms-queries';
import { blockerLines, REJECTING_LABEL } from '#/lib/save-contract';
import type { AcceptEditState, SubmissionSegment } from '#/lib/submissions-state';
import {
  acceptEditStateFromSubmission,
  buildAcceptPayload,
  filterSubmissions,
  SUBMISSION_SEGMENTS,
  submittedOn,
  validateAcceptEdit,
} from '#/lib/submissions-state';

/** The pending posture's fixed four rows — stable keys, never reordered. */
const PENDING_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4'];

export function SubmissionsTab() {
  const {
    data: submissions,
    isPending,
    isError,
    refetch,
  } = useQuery(adminTestimonialSubmissionQueries.all());
  const queryClient = useQueryClient();
  // Pending leads — the moderation queue's default view.
  const [segment, setSegment] = useState<SubmissionSegment>('pending');
  // The three actions' targets (one dialog/sheet at a time — uuid ids never
  // collide).
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
  // The accept sheet's field state + inline errors (the async Save contract
  // holds the sheet open on a failed accept — state intact, retry safe).
  // The empty seed only holds between mounts — opening a row re-seeds.
  const [acceptState, setAcceptState] = useState<AcceptEditState>({ quote: '', person: '' });
  const [acceptErrors, setAcceptErrors] = useState<{ quote?: string; person?: string }>({});
  const quoteId = useId();
  const personId = useId();

  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: adminTestimonialSubmissionQueries.all().queryKey });
    queryClient.invalidateQueries({ queryKey: adminTestimonialQueries.all().queryKey });
  };

  // Accept-with-edit: pending-guarded via the sheet's own contract (Save is
  // 'Accept', busy 'Accepting…'); success appends the Testimonial at the
  // end of render order (the API's transaction) and closes.
  const accept = useMutation({
    mutationFn: async (input: { row: TestimonialSubmission; state: AcceptEditState }) => {
      return acceptAdminTestimonialSubmission({
        data: { id: input.row.id, payload: buildAcceptPayload(input.state) },
      });
    },
  });

  // Reject-retains: pending-guarded confirm; the row stays as rejected.
  const reject = useMutation({
    mutationFn: async (row: TestimonialSubmission) => {
      return rejectAdminTestimonialSubmission({ data: { id: row.id } });
    },
    onSuccess: (result) => {
      invalidateBoth();
      if (result.ok) {
        setRejectId(null);
        toast.success('Rejected.');
        return;
      }
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete-any-status: 204; a submission references nothing.
  const remove = useMutation({
    mutationFn: async (row: TestimonialSubmission) => {
      return removeAdminTestimonialSubmission({ data: { id: row.id } });
    },
    onSuccess: (result) => {
      invalidateBoth();
      if (result.ok) {
        setDeleteId(null);
        setDeleteBlockers([]);
        toast.success('Deleted.');
        return;
      }
      setDeleteBlockers(blockerLines(result.details));
      toast.error(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  async function handleAccept(): Promise<boolean> {
    const row = submissions?.find((candidate) => candidate.id === acceptingId);
    if (!row) {
      return false;
    }
    const errors = validateAcceptEdit(acceptState);
    if (errors.quote || errors.person) {
      setAcceptErrors(errors);
      toast.error('Fix the highlighted fields.');
      return false;
    }
    setAcceptErrors({});
    try {
      const result = await accept.mutateAsync({ row, state: acceptState });
      if (result.ok) {
        invalidateBoth();
        toast.success('Accepted.');
        return true;
      }
      toast.error(result.message);
      return false;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The save failed.');
      return false;
    }
  }

  const rows = filterSubmissions(submissions ?? [], segment);
  const acceptingRow = submissions?.find((candidate) => candidate.id === acceptingId);
  const rejectRow = submissions?.find((candidate) => candidate.id === rejectId);
  const deleteRow = submissions?.find((candidate) => candidate.id === deleteId);

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items) */}
        <p className='text-muted-foreground text-sm'>
          Stories customers sent from the site. Accepting publishes them as testimonials.
        </p>
        <SegmentedControl
          options={SUBMISSION_SEGMENTS}
          value={segment}
          onChange={setSegment}
          ariaLabel='Submission status'
        />
      </div>

      {isError ? (
        <QueryErrorState
          line={QUERY_ERROR_LINE}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : isPending || !submissions ? (
        // Pending posture: skeleton rows echoing the queue's anatomy (quote
        // + person, badge, actions) — first load only.
        <Card className='rounded-lg'>
          <CardContent className='space-y-4'>
            {PENDING_ROW_KEYS.map((key) => (
              <div key={key} className='flex items-center gap-4 py-1'>
                <div className='flex-1 space-y-1.5'>
                  <Skeleton className='h-4 w-2/3' />
                  <Skeleton className='h-3 w-1/3' />
                </div>
                <Skeleton className='h-5 w-20' />
                <Skeleton className='h-8 w-48' />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        // TODO(owner-copy): unplanned strings awaiting the owner's ratification (#134 open items)
        <EmptyState
          line={
            submissions.length === 0
              ? 'No submissions yet.'
              : segment === 'pending'
                ? 'No pending submissions.'
                : segment === 'accepted'
                  ? 'No accepted submissions.'
                  : 'No rejected submissions.'
          }
        />
      ) : (
        <Card className='rounded-lg'>
          <CardContent className='space-y-4'>
            {rows.map((row) => (
              <div
                key={row.id}
                className='border-border flex flex-wrap items-start justify-between gap-3 border-b py-3 first:pt-0 last:border-b-0 last:pb-0'
              >
                <div className='min-w-0 max-w-2xl space-y-1'>
                  <p className='line-clamp-2 text-sm'>{row.quote}</p>
                  <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                    <span className='font-medium'>{row.person}</span>
                    <span aria-hidden='true'>·</span>
                    <span>{submittedOn(row)}</span>
                  </div>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <SubmissionStatusBadge status={row.status} />
                  {row.status === 'pending' ? (
                    <>
                      <Button
                        variant='outline'
                        size='sm'
                        type='button'
                        onClick={() => {
                          setAcceptState(acceptEditStateFromSubmission(row));
                          setAcceptErrors({});
                          setAcceptingId(row.id);
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        type='button'
                        className='text-destructive'
                        onClick={() => setRejectId(row.id)}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    type='button'
                    aria-label='Delete'
                    className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                    onClick={() => setDeleteId(row.id)}
                  >
                    <Trash2 aria-hidden='true' />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {acceptingRow ? (
        <LightEntityEditor
          title='Accept submission'
          description='Fix or trim the words first if needed — accepting publishes it as a testimonial at the end of the list.'
          open={acceptingId === acceptingRow.id}
          onOpenChange={(next) => {
            if (!next) {
              setAcceptingId(null);
            }
          }}
          onSave={handleAccept}
          saveLabel='Accept'
        >
          <Field>
            <FieldLabel htmlFor={quoteId}>Quote</FieldLabel>
            <Textarea
              id={quoteId}
              rows={4}
              value={acceptState.quote}
              onChange={(e) => setAcceptState((prev) => ({ ...prev, quote: e.target.value }))}
            />
            {acceptErrors.quote ? (
              <p className='text-destructive text-xs'>{acceptErrors.quote}</p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={personId}>Person</FieldLabel>
            <Input
              id={personId}
              value={acceptState.person}
              onChange={(e) => setAcceptState((prev) => ({ ...prev, person: e.target.value }))}
            />
            {acceptErrors.person ? (
              <p className='text-destructive text-xs'>{acceptErrors.person}</p>
            ) : null}
          </Field>
        </LightEntityEditor>
      ) : null}

      {rejectRow ? (
        <GuardedConfirm
          title='Reject this submission?'
          description='The submission stays on record as rejected — nothing publishes, and the sender is never told.'
          confirmLabel='Reject'
          busyLabel={REJECTING_LABEL}
          pending={reject.isPending}
          blockers={[]}
          open={rejectId === rejectRow.id}
          onOpenChange={(open) => {
            if (!open) {
              setRejectId(null);
            }
          }}
          onConfirm={() => reject.mutate(rejectRow)}
        />
      ) : null}

      {deleteRow ? (
        <DeleteGuardDialog
          name={deleteRow.person}
          blockers={deleteBlockers}
          pending={remove.isPending}
          open={deleteId === deleteRow.id}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteId(null);
              setDeleteBlockers([]);
            }
          }}
          onDelete={() => remove.mutate(deleteRow)}
        />
      ) : null}
    </div>
  );
}
