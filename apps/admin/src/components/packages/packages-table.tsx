// The packages table screen (M5 #139): the consolidated-format table over
// live ServicePackageRead rows — ruled by #131 and ported element-for-element
// from the composition of record (branch prototype/131-admin-cms-compositions,
// screens/packages.tsx, rounds 1–9). The prototype's local fixture state is
// replaced by the Task 2 seams: `adminPackageQueries.all()` for the list,
// Task 3's `buildRowFlipPayload` driving the optimistic activate/deactivate
// flips through the result-valued `saveAdminPackageUpdate` server fn (a flip
// re-PUTs the full read with ONLY `isActive` changed — media untouched).
// `durationMinutes`, `frames`, and resolved `inclusions` render nowhere —
// the editor's concern (Task 6).
import type { ServicePackageRead } from '@sevendays/types';
import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sevendays/ui/components/table';
import { TooltipProvider } from '@sevendays/ui/components/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Image, SquarePen } from 'lucide-react';
import { Fragment, useState } from 'react';
import {
  ActionTooltip,
  Collapse,
  DeactivateConfirm,
  EmptyState,
  ExpandPanel,
  ExpandRow,
  peso,
  RowActionsCluster,
  RowIconActions,
  StatusBadge,
} from '#/components/cms/shared';
import { saveAdminPackageUpdate } from '#/lib/admin.functions';
import { adminPackageQueries } from '#/lib/cms-queries';
import { buildRowFlipPayload } from '#/lib/package-editor-state';

/** One flip of the row switch: the source row (payload donor) + the target. */
interface FlipInput {
  row: ServicePackageRead;
  isActive: boolean;
}

/** The pending posture's fixed four rows — stable keys, never reordered. */
const PENDING_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4'];

export function PackagesTable() {
  const { data: packages, isPending } = useQuery(adminPackageQueries.all());
  const queryClient = useQueryClient();
  // T3: controlled disclosure — one expanded row at a time (id or null).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Deep-linkable in the prototype frame pass; here a plain selection —
  // ?confirm=<id> died with the prototype's search params.
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const flip = useMutation({
    // Result-valued fn (Task 2's seam): ok:false converts to a throw so the
    // optimistic handlers below own rollback + the error toast — the API's
    // 400 field details have no inline slot in the table (no fields here),
    // so a conflict surfaces as its message.
    mutationFn: async ({ row, isActive }: FlipInput) => {
      const result = await saveAdminPackageUpdate({
        data: { id: row.id, payload: buildRowFlipPayload(row, isActive) },
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onMutate: async ({ row, isActive }) => {
      await queryClient.cancelQueries({ queryKey: adminPackageQueries.all().queryKey });
      const previous = queryClient.getQueryData<ServicePackageRead[]>(
        adminPackageQueries.all().queryKey
      );
      queryClient.setQueryData<ServicePackageRead[]>(adminPackageQueries.all().queryKey, (old) =>
        old?.map((candidate) => (candidate.id === row.id ? { ...candidate, isActive } : candidate))
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminPackageQueries.all().queryKey, context.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminPackageQueries.all().queryKey });
    },
  });

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // A2 (prototype): the only anchor-rendered action in the table — the
  // app-level `a { color: var(--brand-700) }` rule (unlayered, so it beats
  // the layered utilities) paints anchor-rendered buttons brand. The
  // important foreground classes restore the ghost default here without
  // touching the global rule. Retargeted from the prototype's search-param
  // screen switch to the real editor route (Task 6's — link lands first).
  function editButton(row: ServicePackageRead) {
    return (
      <Button
        variant='ghost'
        size='icon-sm'
        className='text-foreground! hover:text-foreground!'
        render={<Link to='/packages/$packageId/edit' params={{ packageId: row.id }} />}
        aria-label='Edit'
      >
        <SquarePen aria-hidden='true' />
      </Button>
    );
  }

  if (isPending || !packages) {
    return (
      // Pending posture: skeleton rows echoing the two-line row anatomy
      // (cover block, name + description, price) at the table's rhythm.
      <Card className='@container rounded-lg'>
        <CardContent className='space-y-4'>
          {PENDING_ROW_KEYS.map((key) => (
            <div key={key} className='flex items-center gap-4 py-1'>
              <Skeleton className='h-[30px] w-10 rounded-md' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-4 w-1/3' />
                <Skeleton className='h-3 w-2/3' />
              </div>
              <Skeleton className='h-4 w-20' />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (packages.length === 0) {
    return (
      <EmptyState line='No packages yet.'>
        <Button render={<Link to='/packages/new' />}>New package</Button>
      </EmptyState>
    );
  }

  const confirmRow = packages.find((row) => row.id === confirmId);

  return (
    <>
      <Card className='@container rounded-lg'>
        <CardContent>
          {/* @container: the table folds into stacked rows below a 700px
              CONTAINER width (Tailwind v4 native container queries). The
              TooltipProvider is the per-table one the name tooltips use
              (A3). The TODO(token-ruling) radius step-down is flagged at
              its ruling site in the pattern library, not re-declared. */}
          <TooltipProvider>
            <Table className='@max-[700px]:hidden'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-14'>Cover</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className='text-right'>Price</TableHead>
                  {/* T2: the Actions header renders empty — the icons carry
                    their own labels. */}
                  <TableHead className='text-right' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((row) => {
                  const expanded = expandedId === row.id;
                  return (
                    <Fragment key={row.id}>
                      {/* N3: whole-row click toggles expansion — the actions
                        cell stops propagation so icon clicks never toggle;
                        the chevron stays the keyboard/AT toggle. */}
                      <ExpandRow
                        expanded={expanded}
                        className='group'
                        onClick={() => toggleExpanded(row.id)}
                      >
                        <TableCell className='cursor-pointer'>
                          {row.coverImageUrl ? (
                            <img
                              src={row.coverImageUrl}
                              alt=''
                              className='h-[30px] w-10 rounded-md object-cover'
                            />
                          ) : (
                            <div className='bg-muted text-muted-foreground grid h-[30px] w-10 place-items-center rounded-md'>
                              <Image className='size-4' aria-hidden='true' />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className='cursor-pointer'>
                          <div className='space-y-0.5'>
                            {/* P1: Featured is a primary badge beside the
                              name. Round 4: the dot LEADS the line — the
                              lookups-attires reference pattern (dot first,
                              then name) — so it never strands on its own
                              line when the description hides. A3: the name
                              truncates when the column is squeezed and the
                              tooltip carries the full text. */}
                            <div className='flex items-center gap-2'>
                              <StatusBadge isActive={row.isActive} />
                              <ActionTooltip
                                label={row.name}
                                button={
                                  <p className='min-w-0 truncate font-semibold'>{row.name}</p>
                                }
                              />
                              {row.isFeatured ? (
                                <Badge variant='default' className='text-xs'>
                                  Featured
                                </Badge>
                              ) : null}
                            </div>
                            {/* T1: description under the identity; the slug
                              is gone from the table entirely (P2). N2: while
                              expanded the reveal carries the full text — the
                              truncated line hides. A1: the line indents by
                              the dot (size-2.5) + its gap-2 — 4.5 spacing
                              steps — so the text aligns with the name above
                              it. */}
                            {expanded ? null : (
                              <div className='flex min-w-0 items-center pl-4.5'>
                                <p className='text-muted-foreground truncate text-xs'>
                                  {row.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='text-right tabular-nums cursor-pointer'>
                          {peso(row.priceCents)}
                        </TableCell>
                        <TableCell className='text-right' onClick={(e) => e.stopPropagation()}>
                          <RowActionsCluster
                            expanded={expanded}
                            onToggle={() => toggleExpanded(row.id)}
                            edit={editButton(row)}
                            isActive={row.isActive}
                            onDeactivate={() => setConfirmId(row.id)}
                            onReactivate={() => flip.mutate({ row, isActive: true })}
                          />
                        </TableCell>
                      </ExpandRow>
                      {/* T3 desktop reveal: the FULL description. */}
                      <ExpandPanel open={expanded} colSpan={4}>
                        {row.description}
                      </ExpandPanel>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>

          {/* Stacked posture (below 700px container width): the whole
              two-line header toggles the animated reveal (M1). */}
          <div className='hidden flex-col @max-[700px]:flex'>
            {packages.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <div key={row.id} className='border-border border-b py-2 last:border-b-0'>
                  <button
                    type='button'
                    aria-expanded={expanded}
                    className='w-full text-left'
                    onClick={() => toggleExpanded(row.id)}
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <div className='flex min-w-0 items-center gap-2'>
                        <StatusBadge isActive={row.isActive} />
                        <p className='truncate font-medium'>{row.name}</p>
                      </div>
                      <p className='text-right tabular-nums'>{peso(row.priceCents)}</p>
                    </div>
                    {/* N2: the description line hides while expanded. A1:
                        dot-width indent, same as the desktop line 2. */}
                    {expanded ? null : (
                      <p className='text-muted-foreground mt-1 truncate pl-4.5 text-xs'>
                        {row.description}
                      </p>
                    )}
                  </button>
                  {/* B1: the mobile reveal carries the FULL description —
                      the dedup hides line 2 while expanded, so without this
                      paragraph the description is nowhere on packages
                      mobile. */}
                  <Collapse open={expanded}>
                    <div className='mt-2 space-y-2'>
                      <p className='text-muted-foreground text-sm'>{row.description}</p>
                      {row.isFeatured ? (
                        <Badge variant='default' className='text-xs'>
                          Featured
                        </Badge>
                      ) : null}
                      <div className='flex gap-1'>
                        <RowIconActions
                          edit={editButton(row)}
                          isActive={row.isActive}
                          onDeactivate={() => setConfirmId(row.id)}
                          onReactivate={() => flip.mutate({ row, isActive: true })}
                        />
                      </div>
                    </div>
                  </Collapse>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {confirmRow ? (
        <DeactivateConfirm
          name={confirmRow.name}
          open={confirmId === confirmRow.id}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmId(null);
            }
          }}
          onConfirm={() => {
            flip.mutate({ row: confirmRow, isActive: false });
            setConfirmId(null);
          }}
        />
      ) : null}
    </>
  );
}
