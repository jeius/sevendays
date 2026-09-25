// PROTOTYPE (throwaway) — wayfinder #131: the branches screen. Round 2: the
// status and address columns are gone (the dot + address live under the
// name), phone keeps its mono column and walk-ins its badge column, row
// actions are icon-only, and rows expand to show the full address (phone on
// mobile). Round 3: action icons get tooltips, the truncated address hides
// while expanded, and clicking the row toggles expansion. Round 4: the
// status dot moves beside the name and the chevron follows the icons.
// Editor is the
// ruled Sheet (V1 settled). Deliberately NO hours/capacity fields anywhere —
// v2 scope; the header subline carries that note. Nothing persists. Never
// merges; delete with the route.

import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import { Field, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sevendays/ui/components/table';
import { SquarePen } from 'lucide-react';
import { Fragment, useId, useState } from 'react';
import type { BranchRow } from '../fixtures';
import { branches } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
  Collapse,
  DeactivateConfirm,
  EmptyState,
  ExpandPanel,
  LightEntityEditor,
  PageHeader,
  RowActionsCluster,
  RowIconActions,
  StatusBadge,
} from '../shared';

export function BranchesScreen({ search }: ScreenProps) {
  const [rows, setRows] = useState(branches);
  // Deep-linkable states (frame pass): ?edit=<id> opens that row's editor on
  // mount; ?confirm=<id> opens its deactivate confirm. Close is client-only.
  const [editId, setEditId] = useState<string | null>(search.edit ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
  // T3: controlled disclosure — one expanded row at a time (id or null).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const editRow = rows.find((row) => row.id === editId);
  const confirmRow = rows.find((row) => row.id === confirmId);
  const nameId = useId();
  const addressId = useId();
  const phoneId = useId();
  const walkInsId = useId();
  const activeId = useId();

  function updateRow(id: string, patch: Partial<BranchRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function setActive(id: string, isActive: boolean) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, isActive } : row)));
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
    <section data-prototype-screen='branches' className='space-y-4'>
      <PageHeader
        title='Branches'
        subline='The three studio locations. Hours and slot capacity arrive with v2.'
        actions={
          <Button onClick={() => {}} type='button'>
            New branch
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState line='No branches yet.'>
          <Button onClick={() => {}} type='button'>
            New branch
          </Button>
        </EmptyState>
      ) : (
        <Card className='@container rounded-lg'>
          <CardContent>
            {/* @container: the table folds into stacked rows below a 700px
                CONTAINER width (Tailwind v4 native container queries). */}
            <Table className='@max-[700px]:hidden'>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Walk-ins</TableHead>
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
                      <TableRow className='group' onClick={() => toggleExpanded(row.id)}>
                        <TableCell className='cursor-pointer'>
                          {/* B1: identity = name / dot + address (the address
                              column died — full text on expand). Round 4:
                              the dot sits BESIDE the name (the
                              lookups-attires reference pattern) so it never
                              strands on its own line when the address
                              hides. */}
                          <div className='space-y-0.5'>
                            <div className='flex items-center gap-2'>
                              <StatusBadge isActive={row.isActive} />
                              <p className='font-semibold'>{row.name}</p>
                            </div>
                            {/* N2: the truncated line hides while expanded. */}
                            {expanded ? null : (
                              <div className='flex min-w-0 items-center'>
                                <p className='text-muted-foreground truncate text-xs'>
                                  {row.address}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='font-mono text-sm cursor-pointer'>
                          {row.phone}
                        </TableCell>
                        <TableCell className='cursor-pointer'>
                          {row.acceptsWalkIns ? (
                            <Badge variant='secondary'>Walk-in friendly</Badge>
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
                      {/* T3 desktop reveal: the FULL address. */}
                      <ExpandPanel open={expanded} colSpan={4}>
                        {row.address}
                      </ExpandPanel>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>

            {/* Stacked posture (below 700px container width): the whole
                two-line header toggles the animated reveal (M1); line 1's
                right value is the Walk-in badge, phone moves to the reveal. */}
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
                        {row.acceptsWalkIns ? (
                          <Badge variant='secondary'>Walk-in friendly</Badge>
                        ) : null}
                      </div>
                      {/* N2: the address line hides while expanded. */}
                      {expanded ? null : (
                        <p className='text-muted-foreground mt-1 truncate text-xs'>{row.address}</p>
                      )}
                    </button>
                    <Collapse open={expanded}>
                      <div className='mt-2 space-y-2'>
                        <p className='text-muted-foreground text-sm'>{row.address}</p>
                        <p className='font-mono text-sm'>{row.phone}</p>
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
            <FieldLabel htmlFor={addressId}>Address</FieldLabel>
            <Input
              id={addressId}
              value={editRow.address}
              onChange={(e) => updateRow(editRow.id, { address: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={phoneId}>Phone</FieldLabel>
            <Input
              id={phoneId}
              type='tel'
              value={editRow.phone}
              onChange={(e) => updateRow(editRow.id, { phone: e.target.value })}
            />
          </Field>
          <div className='flex flex-wrap gap-6'>
            <label htmlFor={walkInsId} className='flex items-center gap-2 text-sm font-medium'>
              <Checkbox
                id={walkInsId}
                checked={editRow.acceptsWalkIns}
                onCheckedChange={(checked) =>
                  updateRow(editRow.id, { acceptsWalkIns: checked === true })
                }
              />
              Accepts walk-ins
            </label>
            <label htmlFor={activeId} className='flex items-center gap-2 text-sm font-medium'>
              <Checkbox
                id={activeId}
                checked={editRow.isActive}
                onCheckedChange={(checked) => updateRow(editRow.id, { isActive: checked === true })}
              />
              Active
            </label>
          </div>
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
