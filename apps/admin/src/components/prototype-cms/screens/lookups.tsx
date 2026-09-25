// PROTOTYPE (throwaway) — wayfinder #131: the lookups screen — print sizes
// and attires on ONE screen (the one-screen-vs-two-nav-items question rides
// the Task 6 reaction list; this composition is the proposal being reacted
// to). Each section is a Card with a card title + New button + Table.
// Nothing persists. Never merges; delete with the route.

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@sevendays/ui/components/tooltip';
import { useId, useState } from 'react';
import type { AttireRow, PrintSizeRow } from '../fixtures';
import { attires, printSizes } from '../fixtures';
import type { ScreenProps } from '../nav';
import { DeactivateConfirm, LightEntityEditor, PageHeader, StatusBadge } from '../shared';

export function LookupsScreen({ search }: ScreenProps) {
  const [sizes, setSizes] = useState(printSizes);
  const [attireRows, setAttireRows] = useState(attires);
  // Deep-linkable states (frame pass). One edit/confirm id spans both
  // sections — fixture ids never collide (ps-* vs at-*).
  const [editId, setEditId] = useState<string | null>(search.edit ?? null);
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
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

  return (
    <section data-prototype-screen='lookups' className='space-y-4'>
      <PageHeader
        title='Lookups'
        subline='Shared catalog vocabularies used by package inclusions.'
      />

      {/* @container: the table folds into stacked <details> rows below a
          700px CONTAINER width (Tailwind v4 native container queries). */}
      <Card className='@container'>
        <CardHeader>
          <CardTitle>Print sizes</CardTitle>
          <CardAction>
            <Button onClick={() => {}} size='sm' type='button' variant='outline'>
              New print size
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* One Provider wraps the table: Base UI's provider is optional but
              gives the row tooltips a shared open/close delay. */}
          <TooltipProvider>
            <Table className='@max-[700px]:hidden'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-24'>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sizes.map((row) => (
                  <TableRow key={row.id} className='group'>
                    <TableCell className='font-mono'>{row.code}</TableCell>
                    {/* Ruled 5R: one-line truncate + tooltip on hover/focus. */}
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger render={<p className='max-w-64 truncate text-sm' />}>
                          {row.description}
                        </TooltipTrigger>
                        <TooltipContent>{row.description}</TooltipContent>
                      </Tooltip>
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
                            onClick={() => setSizeActive(row.id, true)}
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
          </TooltipProvider>

          {/* Stacked posture (below 700px container width): two-line rows in
              native <details>; the reveal holds the full description + actions. */}
          <div className='hidden flex-col @max-[700px]:flex'>
            {sizes.map((row) => (
              <details key={row.id} className='border-border border-b py-2 last:border-b-0'>
                <summary className='cursor-pointer list-none [&::-webkit-details-marker]:hidden'>
                  <div className='flex items-center justify-between gap-3'>
                    <p className='truncate font-medium'>{row.code}</p>
                  </div>
                  <div className='mt-1 flex min-w-0 items-center gap-2'>
                    <StatusBadge isActive={row.isActive} />
                    <p className='text-muted-foreground truncate text-sm'>{row.description}</p>
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
                        onClick={() => setSizeActive(row.id, true)}
                        type='button'
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className='@container'>
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
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attireRows.map((row) => (
                <TableRow key={row.id} className='group'>
                  <TableCell>
                    <p className='font-semibold'>{row.name}</p>
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
                          onClick={() => setAttireActive(row.id, true)}
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

          {/* Stacked posture — attires carry no secondary field; line 2 is the dot alone. */}
          <div className='hidden flex-col @max-[700px]:flex'>
            {attireRows.map((row) => (
              <details key={row.id} className='border-border border-b py-2 last:border-b-0'>
                <summary className='cursor-pointer list-none [&::-webkit-details-marker]:hidden'>
                  <div className='flex items-center justify-between gap-3'>
                    <p className='truncate font-medium'>{row.name}</p>
                  </div>
                  <div className='mt-1 flex min-w-0 items-center gap-2'>
                    <StatusBadge isActive={row.isActive} />
                  </div>
                </summary>
                <div className='mt-2 flex gap-1'>
                  <Button variant='ghost' size='sm' onClick={() => setEditId(row.id)} type='button'>
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
                      onClick={() => setAttireActive(row.id, true)}
                      type='button'
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </details>
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
