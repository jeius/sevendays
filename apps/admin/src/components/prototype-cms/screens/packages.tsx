// PROTOTYPE (throwaway) — wayfinder #131: the packages table screen (the
// table-first list posture every later catalog screen copies). Local state
// only: deactivate/reactivate flips isActive, nothing persists. Never merges;
// delete with the route.

import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sevendays/ui/components/table';
import { Link } from '@tanstack/react-router';
import { Image } from 'lucide-react';
import { useState } from 'react';
import { packages } from '../fixtures';
import type { ScreenProps } from '../nav';
import { DeactivateConfirm, EmptyState, PageHeader, peso, StatusBadge } from '../shared';

export function PackagesScreen({ variant, search }: ScreenProps) {
  const [rows, setRows] = useState(packages);
  // Deep-linkable confirm (frame pass): ?confirm=<id> opens that row's dialog.
  const [confirmId, setConfirmId] = useState<string | null>(search.confirm ?? null);
  const confirmRow = rows.find((row) => row.id === confirmId);

  function setActive(id: string, isActive: boolean) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, isActive } : row)));
  }

  return (
    <section data-prototype-screen='packages' className='space-y-4'>
      <PageHeader
        title='Packages'
        subline='Everything on the landing site&apos;s /packages page, editable in place.'
        actions={
          <Button onClick={() => {}} type='button'>
            New package
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState line='No packages yet.'>
          <Button onClick={() => {}} type='button'>
            New package
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
                  <TableHead className='w-14'>Cover</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className='text-right'>Price</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className='group'>
                    <TableCell>
                      {row.coverImageUrl ? (
                        <img
                          src={row.coverImageUrl}
                          alt=''
                          className='h-[30px] w-10 rounded-md object-cover'
                        />
                      ) : (
                        <div className='bg-muted text-muted-foreground grid h-[30px] w-10 place-items-center rounded-md'>
                          <Image className='size-4' aria-hidden='true' />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='space-y-0.5'>
                        <p className='font-semibold'>{row.name}</p>
                        <p className='text-muted-foreground font-mono text-xs'>{row.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className='text-right tabular-nums'>
                      {peso(row.priceCents)}
                    </TableCell>
                    <TableCell>
                      {row.isFeatured ? (
                        <Badge variant='secondary'>Featured</Badge>
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
                          render={
                            <Link
                              to='/prototype-cms'
                              search={{ screen: 'package-editor', variant }}
                            />
                          }
                        >
                          Edit
                        </Button>
                        {row.isActive ? (
                          <Button
                            variant='ghost'
                            size='sm'
                            className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                            onClick={() => setConfirmId(row.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button variant='ghost' size='sm' onClick={() => setActive(row.id, true)}>
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Stacked posture (below 700px container width): two-line rows in
                native <details>; the reveal holds overflow fields + actions. */}
            <div className='hidden flex-col @max-[700px]:flex'>
              {rows.map((row) => (
                <details key={row.id} className='border-border border-b py-2 last:border-b-0'>
                  <summary className='cursor-pointer list-none [&::-webkit-details-marker]:hidden'>
                    <div className='flex items-center justify-between gap-3'>
                      <p className='truncate font-medium'>{row.name}</p>
                      <p className='text-right tabular-nums'>{peso(row.priceCents)}</p>
                    </div>
                    <div className='mt-1 flex min-w-0 items-center gap-2'>
                      <StatusBadge isActive={row.isActive} />
                      <p className='text-muted-foreground truncate font-mono text-xs'>{row.slug}</p>
                    </div>
                  </summary>
                  <div className='mt-2 space-y-2'>
                    {row.isFeatured ? <Badge variant='secondary'>Featured</Badge> : null}
                    <div className='flex gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        render={
                          <Link
                            to='/prototype-cms'
                            search={{ screen: 'package-editor', variant }}
                          />
                        }
                      >
                        Edit
                      </Button>
                      {row.isActive ? (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                          onClick={() => setConfirmId(row.id)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant='ghost' size='sm' onClick={() => setActive(row.id, true)}>
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
      )}

      <p className='text-muted-foreground text-xs'>Prototype: changes stay on this page.</p>

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
