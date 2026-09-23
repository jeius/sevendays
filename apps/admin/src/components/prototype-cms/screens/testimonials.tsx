// PROTOTYPE (throwaway) — wayfinder #131: the testimonials screen (the shared
// table posture; the position column is the /about slot order, ruling 8 —
// no drag, position is edited in the dialog). Local state only:
// deactivate/reactivate flips isActive, nothing persists. Never merges;
// delete with the route.

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
import { useId, useState } from 'react';
import type { TestimonialRow } from '../fixtures';
import { testimonials } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
  DeactivateConfirm,
  EmptyState,
  LightEntityEditor,
  PageHeader,
  StatusBadge,
} from '../shared';

export function TestimonialsScreen({ search }: ScreenProps) {
  const [rows, setRows] = useState(testimonials);
  // Deep-linkable states (frame pass): ?edit=<id> opens that row's editor on
  // mount; ?confirm=<id> opens its deactivate confirm. Close is client-only.
  const [editId, setEditId] = useState<string | null>(search.edit ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
  const editRow = rows.find((row) => row.id === editId);
  const confirmRow = rows.find((row) => row.id === confirmId);
  const quoteId = useId();
  const personId = useId();
  const positionId = useId();
  const activeId = useId();

  function updateRow(id: string, patch: Partial<TestimonialRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function setActive(id: string, isActive: boolean) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, isActive } : row)));
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
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead className='text-right'>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className={row.isActive ? undefined : 'opacity-60'}>
                    <TableCell>
                      <p className='max-w-72 truncate'>{row.quote}</p>
                    </TableCell>
                    <TableCell>{row.person}</TableCell>
                    <TableCell className='text-right'>
                      <span className='font-mono text-xs tabular-nums'>#{row.position}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge isActive={row.isActive} />
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-1'>
                        <Button
                          variant='ghost'
                          size='sm'
                          type='button'
                          onClick={() => setEditId(row.id)}
                        >
                          Edit
                        </Button>
                        {row.isActive ? (
                          <Button
                            variant='ghost'
                            size='sm'
                            type='button'
                            className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                            onClick={() => setConfirmId(row.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant='ghost'
                            size='sm'
                            type='button'
                            onClick={() => setActive(row.id, true)}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className='text-muted-foreground text-xs'>Prototype: changes stay on this page.</p>

      {editRow ? (
        <LightEntityEditor
          title={editRow.person}
          chrome='dialog'
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
          <Field>
            <FieldLabel htmlFor={positionId}>Position</FieldLabel>
            <Input
              id={positionId}
              type='number'
              value={editRow.position}
              onChange={(e) => updateRow(editRow.id, { position: Number(e.target.value) || 0 })}
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
