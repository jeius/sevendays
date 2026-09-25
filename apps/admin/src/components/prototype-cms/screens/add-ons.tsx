// PROTOTYPE (throwaway) — wayfinder #131: the add-ons screen. Round 2: the
// status column is gone (dot lives under the name), applied services render
// as outline badges in their own column (desktop) and only in the expanded
// reveal (mobile), row actions are icon-only, and rows expand to show the
// full description. Round 3: action icons get tooltips, the truncated
// description hides while expanded, and clicking the row toggles expansion.
// Round 4: the status dot moves beside the name and the chevron follows the
// icons. The editor chrome is the ruled Sheet everywhere (V1 settled); the
// applies-to matrix renders as selectable name-only toggle cards writing
// straight into the row's local studioServiceIds. Nothing persists. Never
// merges; delete with the route.

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
import { SquarePen } from 'lucide-react';
import { Fragment, useId, useState } from 'react';
import type { AddonRow } from '../fixtures';
import { addons, studioServices } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
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

export function AddOnsScreen({ search }: ScreenProps) {
  const [rows, setRows] = useState(addons);
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
        <Card className='@container rounded-lg'>
          <CardContent>
            {/* @container: the table folds into stacked rows below a 700px
                CONTAINER width (Tailwind v4 native container queries). */}
            <Table className='@max-[700px]:hidden'>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className='text-right'>Price</TableHead>
                  <TableHead>Services</TableHead>
                  {/* T2: the Actions header renders empty — the icons carry
                      their own labels. */}
                  <TableHead className='text-right' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const appliesTo = row.studioServiceIds
                    .map((id) => studioServices.find((service) => service.id === id)?.name)
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
                          {/* A2: service names as outline badges. */}
                          {appliesTo.length > 0 ? (
                            <div className='flex flex-wrap gap-1'>
                              {appliesTo.map((name) => (
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

            {/* Stacked posture (below 700px container width): the whole
                two-line header toggles the animated reveal (M1); service
                badges live ONLY in the reveal (A2). */}
            <div className='hidden flex-col @max-[700px]:flex'>
              {rows.map((row) => {
                const appliesTo = row.studioServiceIds
                  .map((id) => studioServices.find((service) => service.id === id)?.name)
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
                      {/* N2: the description line hides while expanded. */}
                      {expanded ? null : (
                        <p className='text-muted-foreground mt-1 truncate text-xs'>
                          {row.description}
                        </p>
                      )}
                    </button>
                    <Collapse open={expanded}>
                      <div className='mt-2 space-y-2'>
                        <p className='text-muted-foreground text-sm'>{row.description}</p>
                        {appliesTo.length > 0 ? (
                          <div className='flex flex-wrap gap-1'>
                            {appliesTo.map((name) => (
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

          {/* Applies-to matrix — ruled: selectable name-only toggle cards. */}
          <section className='space-y-2'>
            <h3 className='text-sm font-medium'>Applies to services</h3>
            <div className='grid gap-2'>
              {studioServices.map((service) => {
                const selected = editRow.studioServiceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type='button'
                    aria-pressed={selected}
                    onClick={() => toggleService(editRow.id, service.id, !selected)}
                    className={`rounded-lg border p-3 text-left text-sm font-medium transition-colors ${
                      selected ? 'border-primary ring-primary ring-1' : 'hover:bg-accent/50'
                    }`}
                  >
                    {service.name}
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
