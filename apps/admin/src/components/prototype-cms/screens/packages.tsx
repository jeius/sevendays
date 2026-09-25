// PROTOTYPE (throwaway) — wayfinder #131: the packages table screen (the
// table-first list posture every later catalog screen copies). Round 2: the
// status column is gone (dot lives under the name), Featured is a badge in
// the identity cell, row actions are icon-only, and rows expand (controlled
// disclosure) to show the full description. Round 3: action icons get
// tooltips, the truncated description hides while the row is expanded (the
// reveal shows the full text), and clicking the row toggles expansion.
// Round 4: the status dot moves beside the name (ahead of it — the
// lookups-attires reference pattern) and the chevron follows the icons.
// Round 5: the description indents by the dot's width so it aligns with the
// name text, the name truncates with a full-text hover tooltip, the identity
// column's min width drops (Edit anchor color normalized too — the global
// `a` rule was painting it brand), and the mobile reveal carries the full
// description (the dedup had left it nowhere).
// Local state only: deactivate/reactivate flips isActive, nothing persists.
// Never merges; delete with the route.

import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sevendays/ui/components/table';
import { TooltipProvider } from '@sevendays/ui/components/tooltip';
import { Link } from '@tanstack/react-router';
import { Image, SquarePen } from 'lucide-react';
import { Fragment, useState } from 'react';
import { packages } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
  ActionTooltip,
  Collapse,
  DeactivateConfirm,
  EmptyState,
  ExpandPanel,
  ExpandRow,
  PageHeader,
  peso,
  RowActionsCluster,
  RowIconActions,
  StatusBadge,
} from '../shared';

export function PackagesScreen({ variant, search }: ScreenProps) {
  const [rows, setRows] = useState(packages);
  // Deep-linkable confirm (frame pass): ?confirm=<id> opens that row's dialog.
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
  // T3: controlled disclosure — one expanded row at a time (id or null).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const confirmRow = rows.find((row) => row.id === confirmId);

  function setActive(id: string, isActive: boolean) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, isActive } : row)));
  }

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // T2: Edit stays a real router Link (deep-link to the editor screen).
  // A2: it is the only anchor-rendered action in the prototype, and the
  // app-level `a { color: var(--brand-700) }` rule (unlayered, so it beats
  // the layered utilities) painted it brand — the other five tables' Edit
  // buttons are real <button>s and inherit foreground. The important
  // foreground classes restore the ghost default here without touching the
  // global rule.
  function editButton() {
    return (
      <Button
        variant='ghost'
        size='icon-sm'
        className='text-foreground! hover:text-foreground!'
        render={<Link to='/prototype-cms' search={{ screen: 'package-editor', variant }} />}
        aria-label='Edit'
      >
        <SquarePen aria-hidden='true' />
      </Button>
    );
  }

  return (
    <section data-prototype-screen='packages' className='space-y-4'>
      <PageHeader
        title='Packages'
        subline='Everything on the landing site&apos;s /packages page, editable in place.'
        actions={
          <Button onClick={() => {}} type='button'>
            New package
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState line='No packages yet.'>
          <Button onClick={() => {}} type='button'>
            New package
          </Button>
        </EmptyState>
      ) : (
        <Card className='@container rounded-lg'>
          <CardContent>
            {/* @container: the table folds into stacked rows below a 700px
                CONTAINER width (Tailwind v4 native container queries). The
                TooltipProvider is the per-table one the name tooltips use
                (A3). */}
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
                  {rows.map((row) => {
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
                              {/* T1: description under the identity; the
                                slug is gone from the table entirely (P2). */}
                              {/* N2: while expanded the reveal carries the full
                                text — the truncated line hides. A1: the line
                                indents by the dot (size-2.5) + its gap-2 —
                                4.5 spacing steps — so the text aligns with
                                the name above it. */}
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
                              edit={editButton()}
                              isActive={row.isActive}
                              onDeactivate={() => setConfirmId(row.id)}
                              onReactivate={() => setActive(row.id, true)}
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
              {rows.map((row) => {
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
                        paragraph the description was nowhere on packages
                        mobile (the other five screens' reveals already had
                        it). */}
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
                            edit={editButton()}
                            isActive={row.isActive}
                            onDeactivate={() => setConfirmId(row.id)}
                            onReactivate={() => setActive(row.id, true)}
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
      )}

      <p className='text-muted-foreground text-xs'>Prototype: changes stay on this page.</p>

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
            setActive(confirmRow.id, false);
            setConfirmId(null);
          }}
        />
      ) : null}
    </section>
  );
}
