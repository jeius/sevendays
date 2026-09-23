// PROTOTYPE (throwaway) — wayfinder #131: the add-ons screen. It carries the
// V1 axis: the editor chrome is a centered Dialog (variant a) vs a right-side
// Sheet (variant b) — identical content in both, so the owner rules on the
// chrome alone. The applies-to matrix is fixed presentation (the V3-b card
// style); checkboxes write straight into the row's local studioServiceIds.
// Nothing persists. Never merges; delete with the route.

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
import type { AddonRow } from '../fixtures';
import { addons, studioServices } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
  DeactivateConfirm,
  EmptyState,
  LightEntityEditor,
  PageHeader,
  peso,
  StatusBadge,
} from '../shared';

export function AddOnsScreen({ variant, search }: ScreenProps) {
  const [rows, setRows] = useState(addons);
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

  function updateRow(id: string, patch: Partial<AddonRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function setActive(id: string, isActive: boolean) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, isActive } : row)));
  }

  function toggleService(id: string, serviceId: string, checked: boolean) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              studioServiceIds: checked
                ? [...row.studioServiceIds, serviceId]
                : row.studioServiceIds.filter((candidate) => candidate !== serviceId),
            }
          : row
      )
    );
  }

  return (
    <section data-prototype-screen='add-ons' className='space-y-4'>
      <PageHeader
        title='Add-ons'
        subline='Extras attached at booking time, with the services they apply to.'
        actions={
          <Button onClick={() => {}} type='button'>
            New add-on
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState line='No add-ons yet.'>
          <Button onClick={() => {}} type='button'>
            New add-on
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
                  <TableHead>Applies to</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const appliesTo = row.studioServiceIds
                    .map((id) => studioServices.find((service) => service.id === id)?.name)
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
                        {appliesTo.length > 0 ? (
                          <p className='text-muted-foreground text-sm'>{appliesTo.join(', ')}</p>
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
        // V1 carrier: chrome flips with the variant — a = Dialog, b = Sheet.
        <LightEntityEditor
          title={editRow.name}
          chrome={variant === 'b' ? 'sheet' : 'dialog'}
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

          {/* Applies-to matrix — fixed presentation (the V3-b card style). */}
          <section className='space-y-2'>
            <h3 className='text-sm font-medium'>Applies to services</h3>
            <div className='grid gap-2'>
              {studioServices.map((service) => {
                const checkId = `${editRow.id}-${service.id}-applies`;
                return (
                  <div key={service.id} className='space-y-2 rounded-lg border p-3'>
                    <p className='text-sm font-semibold'>{service.name}</p>
                    <p className='text-muted-foreground text-xs'>{service.description}</p>
                    <label
                      htmlFor={checkId}
                      className='flex items-center gap-2 text-sm font-medium'
                    >
                      <Checkbox
                        id={checkId}
                        checked={editRow.studioServiceIds.includes(service.id)}
                        onCheckedChange={(checked) =>
                          toggleService(editRow.id, service.id, checked === true)
                        }
                      />
                      Applies
                    </label>
                  </div>
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
