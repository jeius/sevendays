// PROTOTYPE (throwaway) — wayfinder #131: the testimonials screen. Round 2:
// the quote, position and status columns are gone — the person is the
// identity (dot + one-line quote under it, full quote on expand) and the
// order is the rows-array order (no position display anywhere). Row actions
// are icon-only. Local state only: deactivate/reactivate flips isActive,
// nothing persists. Never merges; delete with the route.

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
import { Textarea } from '@sevendays/ui/components/textarea';
import { SquarePen } from 'lucide-react';
import { Fragment, useId, useState } from 'react';
import type { TestimonialRow } from '../fixtures';
import { testimonials } from '../fixtures';
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

export function TestimonialsScreen({ search }: ScreenProps) {
  const [rows, setRows] = useState(testimonials);
  // Deep-linkable states (frame pass): ?edit=<id> opens that row's editor on
  // mount; ?confirm=<id> opens its deactivate confirm. Close is client-only.
  const [editId, setEditId] = useState<string | null>(search.edit ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
  // T3: controlled disclosure — one expanded row at a time (id or null).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const editRow = rows.find((row) => row.id === editId);
  const confirmRow = rows.find((row) => row.id === confirmId);
  const quoteId = useId();
  const personId = useId();
  const activeId = useId();

  function updateRow(id: string, patch: Partial<TestimonialRow>) {
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
        title='Edit'
        onClick={() => setEditId(id)}
      >
        <SquarePen aria-hidden='true' />
      </Button>
    );
  }

  return (
    <section data-prototype-screen='testimonials' className='space-y-4'>
      <PageHeader
        title='Testimonials'
        subline='Client quotes shown on the /about page, ordered.'
        actions={
          <Button onClick={() => {}} type='button'>
            New testimonial
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState line='No testimonials yet.'>
          <Button onClick={() => {}} type='button'>
            New testimonial
          </Button>
        </EmptyState>
      ) : (
        <Card className='@container'>
          <CardContent>
            {/* @container: the table folds into stacked rows below a 700px
                CONTAINER width (Tailwind v4 native container queries). */}
            <Table className='@max-[700px]:hidden'>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
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
                      <TableRow className='group'>
                        <TableCell>
                          {/* TM1: person is the identity; quote is the
                              one-line secondary (full quote on expand). */}
                          <div className='space-y-0.5'>
                            <p className='font-semibold'>{row.person}</p>
                            <div className='flex min-w-0 items-center gap-2'>
                              <StatusBadge isActive={row.isActive} />
                              <p className='text-muted-foreground truncate text-xs'>{row.quote}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='text-right'>
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
                      {/* T3 desktop reveal: the FULL quote. */}
                      <ExpandPanel open={expanded} colSpan={2}>
                        {row.quote}
                      </ExpandPanel>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>

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
                        <p className='truncate font-medium'>{row.person}</p>
                      </div>
                      <div className='mt-1 flex min-w-0 items-center gap-2'>
                        <StatusBadge isActive={row.isActive} />
                        <p className='text-muted-foreground truncate text-xs'>{row.quote}</p>
                      </div>
                    </button>
                    <Collapse open={expanded}>
                      <div className='mt-2 space-y-2'>
                        <p className='text-muted-foreground text-sm'>{row.quote}</p>
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
          title={editRow.person}
          open={editId === editRow.id}
          onOpenChange={(open) => {
            if (!open) {
              setEditId(null);
            }
          }}
        >
          <Field>
            <FieldLabel htmlFor={quoteId}>Quote</FieldLabel>
            <Textarea
              id={quoteId}
              rows={3}
              value={editRow.quote}
              onChange={(e) => updateRow(editRow.id, { quote: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={personId}>Person</FieldLabel>
            <Input
              id={personId}
              value={editRow.person}
              onChange={(e) => updateRow(editRow.id, { person: e.target.value })}
            />
          </Field>
          <label htmlFor={activeId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={activeId}
              checked={editRow.isActive}
              onCheckedChange={(checked) => updateRow(editRow.id, { isActive: checked === true })}
            />
            Active
          </label>
        </LightEntityEditor>
      ) : null}

      {confirmRow ? (
        <DeactivateConfirm
          name={confirmRow.person}
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
