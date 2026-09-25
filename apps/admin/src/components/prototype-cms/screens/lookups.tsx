// PROTOTYPE (throwaway) — wayfinder #131: the lookups screen — print sizes
// and attires on ONE screen (the one-screen-vs-two-nav-items question rides
// the Task 6 reaction list; this composition is the proposal being reacted
// to). Round 2: print sizes collapse to code + dot/description (the
// description and status columns are gone, full text on expand); attires
// lead with the status dot. Round 3: action icons get tooltips, the
// truncated description hides while expanded, and clicking the print-size
// row toggles expansion. Round 4: on print sizes the status dot moves beside
// the code and the chevron follows the icons (attires already lead with the
// dot). Each section is a Card with a card title + New
// button + Table. Nothing persists. Never merges; delete with the route.

import { Button } from '@sevendays/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@sevendays/ui/components/card';
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
import type { AttireRow, PrintSizeRow } from '../fixtures';
import { attires, printSizes } from '../fixtures';
import type { ScreenProps } from '../nav';
import {
  Collapse,
  DeactivateConfirm,
  ExpandPanel,
  LightEntityEditor,
  PageHeader,
  RowActionsCluster,
  RowIconActions,
  StatusBadge,
} from '../shared';

export function LookupsScreen({ search }: ScreenProps) {
  const [sizes, setSizes] = useState(printSizes);
  const [attireRows, setAttireRows] = useState(attires);
  // Deep-linkable states (frame pass). One edit/confirm id spans both
  // sections — fixture ids never collide (ps-* vs at-*).
  const [editId, setEditId] = useState<string | null>(search.edit ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
  // T3: controlled disclosure — one expanded row at a time across both
  // sections (id or null; fixture ids never collide).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const editSize = sizes.find((row) => row.id === editId);
  const editAttire = attireRows.find((row) => row.id === editId);
  const confirmSize = sizes.find((row) => row.id === confirmId);
  const confirmAttire = attireRows.find((row) => row.id === confirmId);
  const codeId = useId();
  const descriptionId = useId();
  const sizeActiveId = useId();
  const attireNameId = useId();
  const attireActiveId = useId();

  function setSizeActive(id: string, isActive: boolean) {
    setSizes((prev) => prev.map((row) => (row.id === id ? { ...row, isActive } : row)));
  }

  function setAttireActive(id: string, isActive: boolean) {
    setAttireRows((prev) => prev.map((row) => (row.id === id ? { ...row, isActive } : row)));
  }

  function updateSize(id: string, patch: Partial<PrintSizeRow>) {
    setSizes((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function updateAttire(id: string, patch: Partial<AttireRow>) {
    setAttireRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function closeEditor() {
    setEditId(null);
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
    <section data-prototype-screen='lookups' className='space-y-4'>
      <PageHeader
        title='Lookups'
        subline='Shared catalog vocabularies used by package inclusions.'
      />

      {/* @container: the table folds into stacked rows below a 700px CONTAINER
          width (Tailwind v4 native container queries). */}
      <Card className='@container rounded-lg'>
        <CardHeader>
          <CardTitle>Print sizes</CardTitle>
          <CardAction>
            <Button onClick={() => {}} size='sm' type='button' variant='outline'>
              New print size
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table className='@max-[700px]:hidden'>
            <TableHeader>
              <TableRow>
                <TableHead className='w-24'>Code</TableHead>
                {/* L1: the description and status columns died — the
                    description is the dot line, full text on expand. */}
                <TableHead className='text-right' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <Fragment key={row.id}>
                    {/* N3: whole-row click toggles expansion — the actions
                        cell stops propagation so icon clicks never toggle;
                        the chevron stays the keyboard/AT toggle. */}
                    <TableRow className='group' onClick={() => toggleExpanded(row.id)}>
                      <TableCell className='cursor-pointer'>
                        {/* L1: identity = code (mono, semibold) / dot +
                            description. No tooltip — the expand shows it all.
                            Round 4: the dot sits BESIDE the code (the attires
                            reference pattern) so it never strands on its own
                            line when the description hides. */}
                        <div className='space-y-0.5'>
                          <div className='flex items-center gap-2'>
                            <StatusBadge isActive={row.isActive} />
                            <p className='font-mono font-semibold'>{row.code}</p>
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
                      <TableCell className='text-right' onClick={(e) => e.stopPropagation()}>
                        <RowActionsCluster
                          expanded={expanded}
                          onToggle={() => toggleExpanded(row.id)}
                          edit={editButton(row.id)}
                          isActive={row.isActive}
                          onDeactivate={() => setConfirmId(row.id)}
                          onReactivate={() => setSizeActive(row.id, true)}
                        />
                      </TableCell>
                    </TableRow>
                    <ExpandPanel open={expanded} colSpan={2}>
                      {row.description}
                    </ExpandPanel>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>

          {/* Stacked posture (below 700px container width): the whole
              two-line header toggles the animated reveal (M1). */}
          <div className='hidden flex-col @max-[700px]:flex'>
            {sizes.map((row) => {
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
                        <p className='truncate font-mono font-medium'>{row.code}</p>
                      </div>
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
                      <div className='flex gap-1'>
                        <RowIconActions
                          edit={editButton(row.id)}
                          isActive={row.isActive}
                          onDeactivate={() => setConfirmId(row.id)}
                          onReactivate={() => setSizeActive(row.id, true)}
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

      <Card className='@container rounded-lg'>
        <CardHeader>
          <CardTitle>Attires</CardTitle>
          <CardAction>
            <Button onClick={() => {}} size='sm' type='button' variant='outline'>
              New attire
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Table className='@max-[700px]:hidden'>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className='text-right' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {attireRows.map((row) => (
                <TableRow key={row.id} className='group'>
                  <TableCell>
                    {/* L2: status dot FIRST, then the name (no description
                        line, so no expand affordance). */}
                    <div className='flex items-center gap-2'>
                      <StatusBadge isActive={row.isActive} />
                      <p className='font-semibold'>{row.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className='text-right'>
                    <RowActionsCluster
                      edit={editButton(row.id)}
                      isActive={row.isActive}
                      onDeactivate={() => setConfirmId(row.id)}
                      onReactivate={() => setAttireActive(row.id, true)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Stacked posture — attires carry no secondary field, so the dot
              leads and the icon actions sit inline (nothing to reveal). */}
          <div className='hidden flex-col @max-[700px]:flex'>
            {attireRows.map((row) => (
              <div
                key={row.id}
                className='border-border flex items-center gap-2 border-b py-2 last:border-b-0'
              >
                <StatusBadge isActive={row.isActive} />
                <p className='min-w-0 truncate font-medium'>{row.name}</p>
                <div className='ml-auto flex gap-1'>
                  <RowIconActions
                    edit={editButton(row.id)}
                    isActive={row.isActive}
                    onDeactivate={() => setConfirmId(row.id)}
                    onReactivate={() => setAttireActive(row.id, true)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className='text-muted-foreground text-xs'>Prototype: changes stay on this page.</p>

      {editSize ? (
        <LightEntityEditor
          title={editSize.code}
          open={editId === editSize.id}
          onOpenChange={(open) => {
            if (!open) {
              closeEditor();
            }
          }}
        >
          <Field>
            <FieldLabel htmlFor={codeId}>Code</FieldLabel>
            <Input
              id={codeId}
              className='font-mono'
              value={editSize.code}
              onChange={(e) => updateSize(editSize.id, { code: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
            <Textarea
              id={descriptionId}
              rows={3}
              value={editSize.description}
              onChange={(e) => updateSize(editSize.id, { description: e.target.value })}
            />
          </Field>
          <label htmlFor={sizeActiveId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={sizeActiveId}
              checked={editSize.isActive}
              onCheckedChange={(checked) => updateSize(editSize.id, { isActive: checked === true })}
            />
            Active
          </label>
          <p className='text-muted-foreground text-xs'>
            Deactivated sizes stay on existing packages but disappear from new pickers.
          </p>
        </LightEntityEditor>
      ) : null}

      {editAttire ? (
        <LightEntityEditor
          title={editAttire.name}
          open={editId === editAttire.id}
          onOpenChange={(open) => {
            if (!open) {
              closeEditor();
            }
          }}
        >
          <Field>
            <FieldLabel htmlFor={attireNameId}>Name</FieldLabel>
            <Input
              id={attireNameId}
              value={editAttire.name}
              onChange={(e) => updateAttire(editAttire.id, { name: e.target.value })}
            />
          </Field>
          <label htmlFor={attireActiveId} className='flex items-center gap-2 text-sm font-medium'>
            <Checkbox
              id={attireActiveId}
              checked={editAttire.isActive}
              onCheckedChange={(checked) =>
                updateAttire(editAttire.id, { isActive: checked === true })
              }
            />
            Active
          </label>
        </LightEntityEditor>
      ) : null}

      {confirmSize ? (
        <DeactivateConfirm
          name={confirmSize.code}
          open={confirmId === confirmSize.id}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmId(null);
            }
          }}
          onConfirm={() => {
            setSizeActive(confirmSize.id, false);
            setConfirmId(null);
          }}
        />
      ) : null}

      {confirmAttire ? (
        <DeactivateConfirm
          name={confirmAttire.name}
          open={confirmId === confirmAttire.id}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmId(null);
            }
          }}
          onConfirm={() => {
            setAttireActive(confirmAttire.id, false);
            setConfirmId(null);
          }}
        />
      ) : null}
    </section>
  );
}
