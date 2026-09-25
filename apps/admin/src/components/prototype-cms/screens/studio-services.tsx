// PROTOTYPE (throwaway) — wayfinder #131: the studio-services screen.
// Post-verdict: the branch matrix renders as selectable name-only toggle
// cards in both variants (V3 settled); toggles write straight into the row's
// local branchIds (full-replace on save is the model; no per-cell save
// affordance). Nothing persists. Never merges; delete with the route.

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

export function StudioServicesScreen({ search }: ScreenProps) {
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
        <Card className='@container'>
          <CardContent>
            {/* @container: the table folds into stacked <details> rows below a
                700px CONTAINER width (Tailwind v4 native container queries). */}
            <Table className='@max-[700px]:hidden'>
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
                    <TableRow key={row.id} className='group'>
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
                        <div className='flex justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'>
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

            {/* Stacked posture (below 700px container width): two-line rows in
                native <details>; the reveal holds overflow fields + actions. */}
            <div className='hidden flex-col @max-[700px]:flex'>
              {rows.map((row) => {
                const bookableAt = row.branchIds
                  .map((id) => branches.find((branch) => branch.id === id)?.name)
                  .filter((name): name is string => name !== undefined);
                return (
                  <details key={row.id} className='border-border border-b py-2 last:border-b-0'>
                    <summary className='cursor-pointer list-none [&::-webkit-details-marker]:hidden'>
                      <div className='flex items-center justify-between gap-3'>
                        <p className='truncate font-medium'>{row.name}</p>
                        <p className='text-right tabular-nums'>{peso(row.priceCents)}</p>
                      </div>
                      <div className='mt-1 flex min-w-0 items-center gap-2'>
                        <StatusBadge isActive={row.isActive} />
                        <p className='text-muted-foreground truncate text-sm'>
                          {bookableAt.length > 0 ? bookableAt.join(', ') : '—'}
                        </p>
                      </div>
                    </summary>
                    <div className='mt-2 space-y-2'>
                      <p className='text-muted-foreground text-sm'>{row.description}</p>
                      <div className='flex gap-1'>
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
                    </div>
                  </details>
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
