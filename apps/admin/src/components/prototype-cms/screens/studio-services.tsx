// PROTOTYPE (throwaway) — wayfinder #131: the studio-services screen. The
// V3 axis lives INSIDE the editor: a = branch matrix as a compact table,
// b = branch matrix as one small card per branch. Matrix checkboxes write
// straight into the row's local branchIds (full-replace on save is the
// model; no per-cell save affordance). Nothing persists. Never merges;
// delete with the route.

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
import { useId, useState } from 'react';
import type { StudioServiceRow } from '../fixtures';
import { branches, studioServices } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
  DeactivateConfirm,
  EmptyState,
  LightEntityEditor,
  PageHeader,
  peso,
  StatusBadge,
} from '../shared';

export function StudioServicesScreen({ variant, search }: ScreenProps) {
  const [rows, setRows] = useState(studioServices);
  // Deep-linkable states (frame pass): ?edit=<id> opens that row's editor on
  // mount; ?confirm=<id> opens its deactivate confirm. Close is client-only.
  const [editId, setEditId] = useState<string | null>(search.edit ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
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
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className='text-right'>Price</TableHead>
                  <TableHead>Bookable at</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const bookableAt = row.branchIds
                    .map((id) => branches.find((branch) => branch.id === id)?.name)
                    .filter((name): name is string => name !== undefined);
                  return (
                    <TableRow key={row.id} className={row.isActive ? undefined : 'opacity-60'}>
                      <TableCell>
                        <div className='space-y-0.5'>
                          <p className='font-semibold'>{row.name}</p>
                          <p className='text-muted-foreground max-w-56 truncate text-xs'>
                            {row.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {peso(row.priceCents)}
                      </TableCell>
                      <TableCell>
                        {bookableAt.length > 0 ? (
                          <p className='text-muted-foreground text-sm'>{bookableAt.join(', ')}</p>
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
                  );
                })}
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
                className='pl-7'
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
            {variant === 'a' ? (
              // V3-a: the matrix as a compact table — columns headed by the
              // branch names, one checkbox row beneath.
              <Table>
                <TableHeader>
                  <TableRow>
                    {branches.map((branch) => (
                      <TableHead key={branch.id} className='text-center'>
                        {branch.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {branches.map((branch) => (
                      <TableCell key={branch.id} className='text-center'>
                        <Checkbox
                          aria-label={`Bookable at ${branch.name}`}
                          checked={editRow.branchIds.includes(branch.id)}
                          onCheckedChange={(checked) =>
                            toggleBranch(editRow.id, branch.id, checked === true)
                          }
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              // V3-b: one small card per branch — name semibold, address
              // muted, its checkbox + Bookable label beneath.
              <div className='grid gap-2 sm:grid-cols-3'>
                {branches.map((branch) => {
                  const checkId = `${editRow.id}-${branch.id}-bookable`;
                  return (
                    <div key={branch.id} className='space-y-2 rounded-lg border p-3'>
                      <p className='text-sm font-semibold'>{branch.name}</p>
                      <p className='text-muted-foreground text-xs'>{branch.address}</p>
                      <label
                        htmlFor={checkId}
                        className='flex items-center gap-2 text-sm font-medium'
                      >
                        <Checkbox
                          id={checkId}
                          checked={editRow.branchIds.includes(branch.id)}
                          onCheckedChange={(checked) =>
                            toggleBranch(editRow.id, branch.id, checked === true)
                          }
                        />
                        Bookable
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
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
