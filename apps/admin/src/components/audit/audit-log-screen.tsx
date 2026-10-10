// The Audit Log screen (#188, spec § The Audit Log — Viewer): the
// owner-only, filterable, newest-first, paginated table over the durable
// record — no joins anywhere (the snapshotted actorEmail + inline
// summary are the whole row, #185's design). Filters ride URL search
// params; every filter change resets to page 1; a stale page beyond the
// end self-heals via replace-navigation (the response carries the
// clamped truth — pageWindow, the one tested math). The row's title
// carries requestId — the Application Log correlation affordance without
// a column. UTC throughout (formatUtc) — SSR/hydration-stable. Curated
// failure states follow the never-500 law: any thrown query error
// (including a role-gate Unauthorized) renders the unavailable line.

import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sevendays/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sevendays/ui/components/table';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { PageHeader } from '#/components/cms/shared';
import { formatUtc } from '#/components/dashboard/format';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  type AuditLogSearch,
  hasActiveFilters,
  pageWindow,
} from '#/lib/audit/filters';
import { auditQueries } from '#/lib/audit/queries';

const ALL = 'all';

function FilterSelect({
  label,
  value,
  triggerClass,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  triggerClass: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className='flex flex-col gap-1 text-xs font-medium'>
      <span className='text-muted-foreground'>{label}</span>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL || next === null ? undefined : next)}
      >
        <SelectTrigger className={triggerClass}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className='flex flex-col gap-1 text-xs font-medium'>
      <span className='text-muted-foreground'>{label}</span>
      <Input
        type='date'
        className='w-40'
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
      />
    </div>
  );
}

export function AuditLogScreen({ search }: { search: AuditLogSearch }) {
  const navigate = useNavigate();
  const pageQuery = useQuery(auditQueries.page(search));
  const actorsQuery = useQuery(auditQueries.actors());

  const patchSearch = (patch: Partial<AuditLogSearch>) => {
    void navigate({
      to: '/audit-log',
      search: { ...search, ...patch, page: patch.page ?? 1 },
    });
  };

  const data = pageQuery.data?.ok === true ? pageQuery.data.data : null;
  const window = data === null ? null : pageWindow(data.total, search.page);

  // A stale ?page beyond the end (a shared URL whose filters narrowed
  // since) self-heals: replace to the clamped page so rows and footer
  // agree. Primitive deps only — the object identity of pageWindow's
  // result is not stable.
  const clampedPage = window?.page;
  useEffect(() => {
    if (clampedPage !== undefined && clampedPage !== search.page) {
      void navigate({
        to: '/audit-log',
        search: { ...search, page: clampedPage },
        replace: true,
      });
    }
  }, [clampedPage, search, navigate]);

  const actors = actorsQuery.data?.ok === true ? actorsQuery.data.data : [];
  const unavailable = pageQuery.isError || (pageQuery.data !== undefined && !pageQuery.data.ok);

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Audit Log'
        subline='Who changed what, when — every CMS write, newest first.'
      />

      <div className='flex flex-wrap items-end gap-3'>
        <FilterSelect
          label='Entity'
          value={search.entity}
          triggerClass='w-44'
          options={Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(entity) => patchSearch({ entity: entity as AuditLogSearch['entity'] })}
        />
        <FilterSelect
          label='Action'
          value={search.action}
          triggerClass='w-36'
          options={Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(action) => patchSearch({ action: action as AuditLogSearch['action'] })}
        />
        <FilterSelect
          label='Actor'
          value={search.actor}
          triggerClass='w-56'
          options={actors.map((actor) => ({ value: actor, label: actor }))}
          onChange={(actor) => patchSearch({ actor })}
        />
        <FilterDate label='From' value={search.from} onChange={(from) => patchSearch({ from })} />
        <FilterDate label='To' value={search.to} onChange={(to) => patchSearch({ to })} />
        {hasActiveFilters(search) ? (
          <Button variant='ghost' size='sm' className='self-end' onClick={() => patchSearch({})}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {pageQuery.isPending ? (
        <p className='text-muted-foreground text-sm'>Loading audit rows…</p>
      ) : unavailable ? (
        <p className='text-muted-foreground text-sm'>
          {pageQuery.data !== undefined &&
          !pageQuery.data.ok &&
          pageQuery.data.reason === 'not-configured'
            ? 'Audit Log source not configured.'
            : 'Audit Log source unavailable.'}
        </p>
      ) : data !== null && data.total === 0 ? (
        <p className='text-muted-foreground text-sm'>
          {hasActiveFilters(search)
            ? 'No audit rows match these filters.'
            : 'No audit rows yet — they start with the first CMS write.'}
        </p>
      ) : data !== null && data.rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-44'>When (UTC)</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead className='w-28'>Action</TableHead>
              <TableHead className='w-40'>Entity</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.id} title={row.requestId}>
                <TableCell className='tabular-nums'>
                  {formatUtc(row.occurredAt.toISOString())}
                </TableCell>
                <TableCell className='max-w-56 truncate'>{row.actorEmail}</TableCell>
                <TableCell>
                  <Badge variant='outline'>{AUDIT_ACTION_LABELS[row.action]}</Badge>
                </TableCell>
                <TableCell>{AUDIT_ENTITY_LABELS[row.entity]}</TableCell>
                <TableCell className='max-w-72 truncate'>
                  {row.summary ?? <span className='text-muted-foreground'>—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {data !== null && window !== null ? (
        <div className='flex items-center justify-between'>
          <p className='text-muted-foreground text-xs'>
            Page {window.page} of {window.totalPages} · {data.total}{' '}
            {data.total === 1 ? 'entry' : 'entries'}
          </p>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={!window.hasPrev}
              onClick={() => patchSearch({ page: window.page - 1 })}
            >
              <ChevronLeft aria-hidden='true' />
              Previous
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={!window.hasNext}
              onClick={() => patchSearch({ page: window.page + 1 })}
            >
              Next
              <ChevronRight aria-hidden='true' />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
