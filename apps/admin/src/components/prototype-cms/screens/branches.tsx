// PROTOTYPE (throwaway) — wayfinder #131: the branches screen. Editor is a
// centered Dialog on both variants (the composition to react to is identical
// for create). Deliberately NO hours/capacity fields anywhere — v2 scope;
// the header subline carries that note. Nothing persists. Never merges;
// delete with the route.

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
import { useId, useState } from 'react';
import type { BranchRow } from '../fixtures';
import { branches } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
  DeactivateConfirm,
  EmptyState,
  LightEntityEditor,
  PageHeader,
  StatusBadge,
} from '../shared';

export function BranchesScreen({ search }: ScreenProps) {
  const [rows, setRows] = useState(branches);
  // Deep-linkable states (frame pass): ?edit=<id> opens that row's editor on
  // mount; ?confirm=<id> opens its deactivate confirm. Close is client-only.
  const [editId, setEditId] = useState<string | null>(search.edit ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
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
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Walk-ins</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className={row.isActive ? undefined : 'opacity-60'}>
                    <TableCell>
                      <p className='font-semibold'>{row.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className='text-muted-foreground text-sm'>{row.address}</p>
                    </TableCell>
                    <TableCell className='font-mono text-sm'>{row.phone}</TableCell>
                    <TableCell>
                      {row.acceptsWalkIns ? (
                        <Badge variant='secondary'>Walk-in friendly</Badge>
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge isActive={row.isActive} />
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-1'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => setEditId(row.id)}
                          type='button'
                        >
                          Edit
                        </Button>
                        {row.isActive ? (
                          <Button
                            variant='ghost'
                            size='sm'
                            className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                            onClick={() => setConfirmId(row.id)}
                            type='button'
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => setActive(row.id, true)}
                            type='button'
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
