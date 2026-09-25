// PROTOTYPE (throwaway) — wayfinder #131: the studio-services screen.
// Round 2: the status column is gone (dot lives under the name), bookable
// branches render as outline badges in their own column (desktop) and only
// in the expanded reveal (mobile), row actions are icon-only, and rows
// expand to show the full description. Round 3: action icons get tooltips,
// the truncated description hides while expanded, and clicking the row
// toggles expansion. Round 4: the status dot moves beside the name and the
// chevron follows the icons. Round 5: the description indents by the dot's
// width so it aligns with the name text, and the name truncates with a
// full-text hover tooltip (identity column's min width drops). The branch
// matrix in the editor renders as selectable
// name-only toggle cards (V3 settled); toggles write straight into the
// row's local branchIds. Nothing persists. Never merges; delete with the route.

import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import { Field, FieldDescription, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sevendays/ui/components/table';
import { Textarea } from '@sevendays/ui/components/textarea';
import { TooltipProvider } from '@sevendays/ui/components/tooltip';
import { SquarePen } from 'lucide-react';
import { Fragment, useId, useState } from 'react';
import type { StudioServiceRow } from '../fixtures';
import { branches, studioServices } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
  ActionTooltip,
  Collapse,
  DeactivateConfirm,
  EmptyState,
  ExpandPanel,
  LightEntityEditor,
  PageHeader,
  peso,
  RowActionsCluster,
  RowIconActions,
  StatusBadge,
} from '../shared';

export function StudioServicesScreen({ search }: ScreenProps) {
  const [rows, setRows] = useState(studioServices);
  // Deep-linkable states (frame pass): ?edit=<id> opens that row's editor on
  // mount; ?confirm=<id> opens its deactivate confirm. Close is client-only.
  const [editId, setEditId] = useState<string | null>(search.edit ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
  // T3: controlled disclosure — one expanded row at a time (id or null).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const editRow = rows.find((row) => row.id === editId);
  const confirmRow = rows.find((row) => row.id === confirmId);
  const nameId = useId();
  const descriptionId = useId();
  const priceId = useId();
  const activeId = useId();

  function updateRow(id: string, patch: Partial<StudioServiceRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function setActive(id: string, isActive: boolean) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, isActive } : row)));
  }

  function toggleBranch(id: string, branchId: string, checked: boolean) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              branchIds: checked
                ? [...row.branchIds, branchId]
                : row.branchIds.filter((candidate) => candidate !== branchId),
            }
          : row
      )
    );
  }

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function editButton(id: string) {
    return (
      <Button
        variant='ghost'
        size='icon-sm'
        type='button'
        aria-label='Edit'
        onClick={() => setEditId(id)}
      >
        <SquarePen aria-hidden='true' />
      </Button>
    );
  }

  return (
    <section data-prototype-screen='studio-services' className='space-y-4'>
      <PageHeader
        title='Studio services'
        subline='Standalone services bookable on their own, with per-branch availability.'
        actions={
          <Button onClick={() => {}} type='button'>
            New studio service
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState line='No studio services yet.'>
          <Button onClick={() => {}} type='button'>
            New studio service
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
                    <TableHead>Name</TableHead>
                    <TableHead className='text-right'>Price</TableHead>
                    <TableHead>Branches</TableHead>
                    {/* T2: the Actions header renders empty — the icons carry
                      their own labels. */}
                    <TableHead className='text-right' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const bookableAt = row.branchIds
                      .map((id) => branches.find((branch) => branch.id === id)?.name)
                      .filter((name): name is string => name !== undefined);
                    const expanded = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        {/* N3: whole-row click toggles expansion — the actions
                          cell stops propagation so icon clicks never toggle;
                          the chevron stays the keyboard/AT toggle. */}
                        <TableRow className='group' onClick={() => toggleExpanded(row.id)}>
                          <TableCell className='cursor-pointer'>
                            {/* T1: identity = name / dot + description. Round 4:
                              the dot sits BESIDE the name (the
                              lookups-attires reference pattern) so it never
                              strands on its own line when the description
                              hides. A3: the name truncates when the column is
                              squeezed and the tooltip carries the full text. */}
                            <div className='space-y-0.5'>
                              <div className='flex items-center gap-2'>
                                <StatusBadge isActive={row.isActive} />
                                <ActionTooltip
                                  label={row.name}
                                  button={
                                    <p className='min-w-0 truncate font-semibold'>{row.name}</p>
                                  }
                                />
                              </div>
                              {/* N2: the truncated line hides while expanded.
                                A1: the line indents by the dot (size-2.5) +
                                its gap-2 — 4.5 spacing steps — so the text
                                aligns with the name above it. */}
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
                          <TableCell className='cursor-pointer'>
                            {/* S2: branch names as outline badges. */}
                            {bookableAt.length > 0 ? (
                              <div className='flex flex-wrap gap-1'>
                                {bookableAt.map((name) => (
                                  <Badge key={name} variant='outline'>
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className='text-muted-foreground'>—</span>
                            )}
                          </TableCell>
                          <TableCell className='text-right' onClick={(e) => e.stopPropagation()}>
                            <RowActionsCluster
                              expanded={expanded}
                              onToggle={() => toggleExpanded(row.id)}
                              edit={editButton(row.id)}
                              isActive={row.isActive}
                              onDeactivate={() => setConfirmId(row.id)}
                              onReactivate={() => setActive(row.id, true)}
                            />
                          </TableCell>
                        </TableRow>
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
                two-line header toggles the animated reveal (M1); branch
                badges live ONLY in the reveal (S2). */}
            <div className='hidden flex-col @max-[700px]:flex'>
              {rows.map((row) => {
                const bookableAt = row.branchIds
                  .map((id) => branches.find((branch) => branch.id === id)?.name)
                  .filter((name): name is string => name !== undefined);
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
                    <Collapse open={expanded}>
                      <div className='mt-2 space-y-2'>
                        <p className='text-muted-foreground text-sm'>{row.description}</p>
                        {bookableAt.length > 0 ? (
                          <div className='flex flex-wrap gap-1'>
                            {bookableAt.map((name) => (
                              <Badge key={name} variant='outline'>
                                {name}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        <div className='flex gap-1'>
                          <RowIconActions
                            edit={editButton(row.id)}
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

      {editRow ? (
        <LightEntityEditor
          title={editRow.name}
          open={editId === editRow.id}
          onOpenChange={(open) => {
            if (!open) {
              setEditId(null);
            }
          }}
        >
          <Field>
            <FieldLabel htmlFor={nameId}>Name</FieldLabel>
            <Input
              id={nameId}
              value={editRow.name}
              onChange={(e) => updateRow(editRow.id, { name: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
            <Textarea
              id={descriptionId}
              rows={3}
              value={editRow.description}
              onChange={(e) => updateRow(editRow.id, { description: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={priceId}>Price</FieldLabel>
            <div className='relative'>
              <span className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm'>
                ₱
              </span>
              <Input
                id={priceId}
                type='number'
                className='pl-7 tabular-nums'
                value={editRow.priceCents / 100}
                onChange={(e) =>
                  updateRow(editRow.id, {
                    priceCents: Math.round(Number(e.target.value) * 100) || 0,
                  })
                }
              />
            </div>
            <FieldDescription>Stored as centavos.</FieldDescription>
          </Field>
          <label htmlFor={activeId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={activeId}
              checked={editRow.isActive}
              onCheckedChange={(checked) => updateRow(editRow.id, { isActive: checked === true })}
            />
            Active
          </label>

          <section className='space-y-2'>
            <h3 className='text-sm font-medium'>Bookable at branches</h3>
            {/* Ruled V3: selectable name-only cards in both variants — the
                variant table/card branch is deleted. Click toggles branchIds. */}
            <div className='grid gap-2 sm:grid-cols-3'>
              {branches.map((branch) => {
                const selected = editRow.branchIds.includes(branch.id);
                return (
                  <button
                    key={branch.id}
                    type='button'
                    aria-pressed={selected}
                    onClick={() => toggleBranch(editRow.id, branch.id, !selected)}
                    className={`rounded-lg border p-3 text-left text-sm font-medium transition-colors ${
                      selected ? 'border-primary ring-primary ring-1' : 'hover:bg-accent/50'
                    }`}
                  >
                    {branch.name}
                  </button>
                );
              })}
            </div>
          </section>
        </LightEntityEditor>
      ) : null}

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
