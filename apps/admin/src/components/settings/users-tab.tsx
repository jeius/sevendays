// The Users tab (M7 #221, Task 5): the owner-only staff surface. The table
// carries the own-row view-only law (no actions — an em-dash — plus the
// '(you)' suffix); the affordance annotations re-derive from the same pure
// seams the server fns guard with (deleteRefusal/banRefusal over the query
// list — affordance-only; the server's fresh-list refusal is authoritative
// and its blockers render in-body). The expanded sessions row follows the
// #219 pattern; the RAW plugin rows stay in memory solely as the per-session
// revoke mutation arg (better-auth 1.7.5 revokes BY TOKEN) while the render
// reads only shapeSessionRows' output — the session TOKEN never renders and
// never lands in UI copy. The create Sheet rides the #218 async-Save
// contract (close-only-on-success; field-level failures inline) and the
// three dialogs (reset password, ban/unban, guarded delete) resolve Task 3's
// result-value union. All data rides the server fns — the browser never
// calls BetterAuth's admin plugin (authClient.admin does not exist).
import { Badge } from '@sevendays/ui/components/badge';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@sevendays/ui/components/dialog';
import { Field, FieldLabel } from '@sevendays/ui/components/field';
import { Input } from '@sevendays/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sevendays/ui/components/select';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sevendays/ui/components/table';
import { TooltipProvider } from '@sevendays/ui/components/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, ChevronDown, KeyRound, Power, Trash2 } from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';
import {
  ActionTooltip,
  EmptyState,
  ExpandPanel,
  ExpandRow,
  GuardedConfirm,
  LightEntityEditor,
  PendingSpinner,
  QUERY_ERROR_LINE,
  QueryErrorState,
} from '#/components/cms/shared';
import { formatUtc } from '#/components/dashboard/format';
import { DELETING_LABEL, SAVING_LABEL } from '#/lib/save-contract';
import {
  banAdminUser,
  createAdminUser,
  fetchAdminUserSessions,
  fetchAdminUsers,
  removeAdminUser,
  resetAdminUserPassword,
  revokeAdminUserSession,
  revokeAdminUserSessions,
  unbanAdminUser,
} from '#/lib/users.functions';
import { banRefusal, deleteRefusal } from '#/lib/users-guards';
import { type AdminUserRow, shapeSessionRows, shapeUserRows } from '#/lib/users-state';

const TEMP_PASSWORD_MIN = 12; // matches emailAndPassword.minPasswordLength

/** The pending posture's fixed four skeleton rows — stable keys, never reordered. */
const PENDING_ROW_KEYS = ['row-1', 'row-2', 'row-3', 'row-4'];

/** UTC-stable session timestamps (the formatUtc law — SSR/hydration byte-identical). */
function sessionWhen(at: Date): string {
  return formatUtc(at.toISOString());
}

/** The UA string trims to 48 chars + ellipsis; a missing one renders the em-dash. */
function userAgentLine(userAgent: string | null): string {
  if (userAgent === null || userAgent === '') {
    return '—';
  }
  return userAgent.length > 48 ? `${userAgent.slice(0, 48)}…` : userAgent;
}

/**
 * One icon row action. A blocked action (non-empty refusal) renders DISABLED
 * with the refusal line as its tooltip — the affordance annotation; the
 * server's fresh-list refusal stays authoritative. A disabled button swallows
 * hover, so the tooltip trigger is a span wrapping it (the button's own
 * aria-label keeps the action named for assistive tech). Tones follow the
 * house families: neutral (reset), destructive (ban/delete), positive
 * (unban — the reactivate family from the pattern library).
 */
function GuardedRowAction({
  label,
  refusal,
  tone,
  onClick,
  children,
}: {
  label: string;
  refusal: string[];
  tone: 'neutral' | 'destructive' | 'positive';
  onClick: () => void;
  children: ReactNode;
}) {
  const toneClass =
    tone === 'destructive'
      ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
      : tone === 'positive'
        ? // Status palette (owner-reacted 2026-10-16, #218's variants round): the ruled families — never promote into packages/ui.
          'text-green-700 hover:bg-green-600/10 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-400/10 dark:hover:text-green-400'
        : undefined;
  const button = (
    <Button
      variant='ghost'
      size='icon-sm'
      type='button'
      aria-label={label}
      disabled={refusal.length > 0}
      className={toneClass}
      onClick={onClick}
    >
      {children}
    </Button>
  );
  if (refusal.length > 0) {
    return (
      <ActionTooltip
        label={refusal.join(' ')}
        button={<span className='inline-flex'>{button}</span>}
      />
    );
  }
  return <ActionTooltip label={label} button={button} />;
}

export function UsersTab({ actorId }: { actorId: string }) {
  const queryClient = useQueryClient();
  const {
    data: users,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => fetchAdminUsers(),
  });
  const rows = shapeUserRows(users ?? [], actorId);

  // One expanded row at a time (the #219 pattern); expanding fetches the
  // sessions. The RAW rows (token included) stay in memory only — the
  // per-session Revoke needs `session.token` (revokes go by token), while
  // the render reads the shaped rows the token was stripped from.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sessionsQuery = useQuery({
    queryKey: ['admin', 'users', expandedId, 'sessions'],
    queryFn: () => fetchAdminUserSessions({ data: { userId: expandedId ?? '' } }),
    enabled: expandedId !== null,
  });
  // Plain-object copies: the plugin's SessionWithImpersonatedBy interface
  // carries no index signature, so the spread satisfies shapeSessionRows'
  // `& Record<string, unknown>` param (shallow copy, Date references kept).
  const rawSessions = (sessionsQuery.data ?? []).map((session) => ({ ...session }));
  const sessionRows = shapeSessionRows(rawSessions);
  const sessionItems = sessionRows.map((session) => ({
    ...session,
    token: rawSessions.find((raw) => raw.id === session.id)?.token,
  }));

  // Owner-ratified verbatim, 2026-10-19 (#221 round): the row-action labels,
  // the sheet's description line, the client-validation lines, the
  // success/failure toasts, and the sessions copy below.
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<'staff' | 'admin'>('staff');
  const [createPassword, setCreatePassword] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetConfirmValue, setResetConfirmValue] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [banBlockers, setBanBlockers] = useState<string[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);

  const resetPassword = useMutation({
    mutationFn: (input: { userId: string; newPassword: string }) =>
      resetAdminUserPassword({ data: input }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Password set. Hand it over in person.');
        setResetTarget(null);
      } else {
        setResetError(result.message);
      }
    },
    onError: (error) => {
      setResetError(error.message);
    },
  });

  const ban = useMutation({
    mutationFn: (input: { userId: string; banning: boolean }) =>
      input.banning
        ? banAdminUser({ data: { userId: input.userId } })
        : unbanAdminUser({ data: { userId: input.userId } }),
    onSuccess: async (result, input) => {
      if (result.ok) {
        toast.success(input.banning ? 'Banned.' : 'Unbanned.');
        await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        setBanTarget(null);
      } else {
        // The server's fresh-list refusal renders in-body (#218's law).
        setBanBlockers(result.blockers ?? [result.message]);
      }
    },
    onError: (error) => {
      setBanBlockers([error.message]);
    },
  });

  const removeUser = useMutation({
    mutationFn: (userId: string) => removeAdminUser({ data: { userId } }),
    onSuccess: async (result, userId) => {
      if (result.ok) {
        toast.success('User deleted.');
        await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        if (expandedId === userId) {
          setExpandedId(null); // the expanded row is gone — collapse with it
        }
        setDeleteTarget(null);
      } else {
        setDeleteBlockers(result.blockers ?? [result.message]);
      }
    },
    onError: (error) => {
      setDeleteBlockers([error.message]);
    },
  });

  const revokeSession = useMutation({
    mutationFn: (sessionToken: string) => revokeAdminUserSession({ data: { sessionToken } }),
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({
          queryKey: ['admin', 'users', expandedId, 'sessions'],
        });
      } else {
        toast.error('Could not revoke the session.');
      }
    },
    onError: () => {
      toast.error('Could not revoke the session.');
    },
  });

  const revokeAll = useMutation({
    mutationFn: (userId: string) => revokeAdminUserSessions({ data: { userId } }),
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({
          queryKey: ['admin', 'users', expandedId, 'sessions'],
        });
      } else {
        toast.error('Could not revoke the sessions.');
      }
    },
    onError: () => {
      toast.error('Could not revoke the sessions.');
    },
  });

  function openCreate() {
    setCreateName('');
    setCreateEmail('');
    setCreateRole('staff');
    setCreatePassword('');
    setCreateError(null);
    setCreateOpen(true);
  }

  // The #218 async-Save contract: resolve true closes the sheet; false (or a
  // transport throw) holds it open over the intact fields — the plugin's
  // refusal (a duplicate email answers its message) renders inline.
  async function handleCreateSave(): Promise<boolean> {
    const name = createName.trim();
    const email = createEmail.trim();
    if (name === '' || email === '' || createPassword.length < TEMP_PASSWORD_MIN) {
      setCreateError('Name, email, and a password of at least 12 characters are required.');
      return false;
    }
    const result = await createAdminUser({
      data: { name, email, password: createPassword, role: createRole },
    }).catch(() => null);
    if (result?.ok) {
      toast.success('User created. Hand over the temporary password in person.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      return true;
    }
    setCreateError(result !== null && !result.ok ? result.message : 'Could not create the user.');
    toast.error('Could not create the user.');
    return false;
  }

  function openReset(row: AdminUserRow) {
    setResetPasswordValue('');
    setResetConfirmValue('');
    setResetError(null);
    setResetTarget(row);
  }

  function confirmReset() {
    if (resetTarget === null) {
      return;
    }
    if (resetPasswordValue !== resetConfirmValue) {
      setResetError('The passwords don’t match.');
      return;
    }
    if (resetPasswordValue.length < TEMP_PASSWORD_MIN) {
      setResetError('At least 12 characters.');
      return;
    }
    resetPassword.mutate({ userId: resetTarget.id, newPassword: resetPasswordValue });
  }

  function openBan(row: AdminUserRow) {
    setBanBlockers([]);
    setBanTarget(row);
  }

  function openDelete(row: AdminUserRow) {
    setDeleteBlockers([]);
    setDeleteTarget(row);
  }

  if (isError) {
    return (
      <div className='space-y-4'>
        <QueryErrorState line={QUERY_ERROR_LINE} onRetry={() => void refetch()} />
      </div>
    );
  }

  // First-load only — a background refetch renders the stale table.
  if (isPending) {
    return (
      <div className='space-y-3'>
        {PENDING_ROW_KEYS.map((key) => (
          <Skeleton key={key} className='h-12 w-full' />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState line='No user accounts yet.'>
        <Button type='button' onClick={openCreate}>
          Create user
        </Button>
      </EmptyState>
    );
  }

  const sessionsBusy = revokeSession.isPending || revokeAll.isPending;

  return (
    <div className='space-y-4'>
      <div className='flex justify-end'>
        <Button type='button' size='sm' onClick={openCreate}>
          Create user
        </Button>
      </div>

      <Card className='rounded-lg'>
        <CardContent>
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  {/* The icons carry their own labels (aria-label + tooltip). */}
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const expanded = expandedId === row.id;
                  // The affordance annotations re-derive from the same pure
                  // seams the server fns guard with — affordance-only.
                  const rowDeleteBlockers = deleteRefusal(actorId, row, rows);
                  const rowBanBlockers = banRefusal(actorId, row, rows);
                  return (
                    <Fragment key={row.id}>
                      <ExpandRow expanded={expanded}>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              type='button'
                              aria-expanded={expanded}
                              aria-label={expanded ? 'Collapse row' : 'Expand row'}
                              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                              onClick={() => setExpandedId(expanded ? null : row.id)}
                            >
                              <ChevronDown aria-hidden='true' />
                            </Button>
                            {/* The own-row law: view-only, marked '(you)'. */}
                            <span>
                              {row.name}
                              {row.isSelf ? ' (you)' : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.roleLabel}</TableCell>
                        <TableCell>
                          <Badge variant={row.statusLabel === 'Active' ? 'default' : 'destructive'}>
                            {row.statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right'>
                          {row.isSelf ? (
                            <span className='text-muted-foreground'>—</span>
                          ) : (
                            <div className='flex items-center justify-end gap-1'>
                              <GuardedRowAction
                                label='Reset password'
                                refusal={[]}
                                tone='neutral'
                                onClick={() => openReset(row)}
                              >
                                <KeyRound aria-hidden='true' />
                              </GuardedRowAction>
                              {row.statusLabel === 'Banned' ? (
                                <GuardedRowAction
                                  label='Unban'
                                  refusal={[]}
                                  tone='positive'
                                  onClick={() => openBan(row)}
                                >
                                  <Power aria-hidden='true' />
                                </GuardedRowAction>
                              ) : (
                                <GuardedRowAction
                                  label='Ban'
                                  refusal={rowBanBlockers}
                                  tone='destructive'
                                  onClick={() => openBan(row)}
                                >
                                  <Ban aria-hidden='true' />
                                </GuardedRowAction>
                              )}
                              <GuardedRowAction
                                label='Delete'
                                refusal={rowDeleteBlockers}
                                tone='destructive'
                                onClick={() => openDelete(row)}
                              >
                                <Trash2 aria-hidden='true' />
                              </GuardedRowAction>
                            </div>
                          )}
                        </TableCell>
                      </ExpandRow>
                      <ExpandPanel open={expanded} colSpan={5}>
                        {expanded ? (
                          <div className='space-y-3'>
                            <div className='flex items-center justify-between gap-2'>
                              <p className='font-medium text-foreground text-xs'>Sessions</p>
                              <Button
                                variant='outline'
                                size='sm'
                                type='button'
                                disabled={sessionsBusy}
                                aria-busy={revokeAll.isPending}
                                onClick={() => {
                                  if (expandedId !== null) {
                                    revokeAll.mutate(expandedId);
                                  }
                                }}
                              >
                                {revokeAll.isPending ? <PendingSpinner /> : null}
                                {revokeAll.isPending ? 'Revoking…' : 'Revoke all sessions'}
                              </Button>
                            </div>
                            {sessionsQuery.isPending ? (
                              <p className='text-muted-foreground text-xs'>Loading sessions…</p>
                            ) : sessionsQuery.isError ? (
                              <div className='flex items-center gap-2'>
                                <p className='text-destructive text-xs'>
                                  Couldn’t load the sessions.
                                </p>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  type='button'
                                  onClick={() => void sessionsQuery.refetch()}
                                >
                                  Retry
                                </Button>
                              </div>
                            ) : sessionItems.length === 0 ? (
                              <p className='text-muted-foreground text-xs'>No active sessions.</p>
                            ) : (
                              <ul className='space-y-1.5'>
                                {sessionItems.map((session) => {
                                  const thisPending =
                                    revokeSession.isPending &&
                                    revokeSession.variables === session.token;
                                  return (
                                    <li
                                      key={session.id}
                                      className='flex flex-wrap items-center gap-x-3 gap-y-1'
                                    >
                                      <span className='text-foreground text-xs'>
                                        {sessionWhen(session.createdAt)}
                                      </span>
                                      <span className='text-muted-foreground text-xs'>
                                        expires {sessionWhen(session.expiresAt)}
                                      </span>
                                      <span className='text-muted-foreground text-xs'>
                                        {session.ipAddress ?? '—'}
                                      </span>
                                      <span className='text-muted-foreground text-xs'>
                                        {userAgentLine(session.userAgent)}
                                      </span>
                                      <Button
                                        variant='outline'
                                        size='sm'
                                        type='button'
                                        disabled={sessionsBusy}
                                        aria-busy={thisPending}
                                        onClick={() => {
                                          // The token rides as the mutation arg only —
                                          // better-auth 1.7.5 revokes BY TOKEN; a session
                                          // id would silently no-op the delete.
                                          if (session.token !== undefined) {
                                            revokeSession.mutate(session.token);
                                          }
                                        }}
                                      >
                                        {thisPending ? <PendingSpinner /> : null}
                                        Revoke
                                      </Button>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        ) : null}
                      </ExpandPanel>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      {createOpen ? (
        <LightEntityEditor
          title='Create user'
          description='Name, email, role, and a temporary password for the new account.'
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSave={handleCreateSave}
          saveLabel='Create user'
        >
          <Field>
            <FieldLabel htmlFor='users-create-name'>Name</FieldLabel>
            <Input
              id='users-create-name'
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor='users-create-email'>Email</FieldLabel>
            <Input
              id='users-create-email'
              type='email'
              value={createEmail}
              onChange={(event) => setCreateEmail(event.target.value)}
            />
          </Field>
          {/* The role picker lives at CREATE only — no role editing post-create. */}
          <Field>
            <FieldLabel htmlFor='users-create-role'>Role</FieldLabel>
            <Select
              value={createRole}
              onValueChange={(next) => setCreateRole(next === 'admin' ? 'admin' : 'staff')}
            >
              <SelectTrigger id='users-create-role' className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='staff'>Staff</SelectItem>
                <SelectItem value='admin'>Owner</SelectItem>
              </SelectContent>
            </Select>
            {createRole === 'admin' ? (
              <p className='text-muted-foreground text-xs'>
                Owners hold user management and the Audit Log — grant only when the account should
                manage the team.
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor='users-create-password'>Temporary password</FieldLabel>
            <Input
              id='users-create-password'
              type='password'
              minLength={12}
              value={createPassword}
              onChange={(event) => setCreatePassword(event.target.value)}
            />
            <p className='text-muted-foreground text-xs'>
              At least 12 characters. Hand the password over in person — it is not emailed.
            </p>
          </Field>
          {createError ? (
            <p role='alert' className='text-destructive text-xs'>
              {createError}
            </p>
          ) : null}
        </LightEntityEditor>
      ) : null}

      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set a new temporary password</DialogTitle>
            <DialogDescription>
              At least 12 characters. Hand the password over in person — it is not emailed.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <Field>
              <FieldLabel htmlFor='users-reset-password'>New temporary password</FieldLabel>
              <Input
                id='users-reset-password'
                type='password'
                autoComplete='new-password'
                minLength={12}
                value={resetPasswordValue}
                onChange={(event) => setResetPasswordValue(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='users-reset-confirm'>Confirm new password</FieldLabel>
              <Input
                id='users-reset-confirm'
                type='password'
                autoComplete='new-password'
                value={resetConfirmValue}
                onChange={(event) => setResetConfirmValue(event.target.value)}
              />
            </Field>
            {/* Failure stays open with the line — the result-value law. */}
            {resetError ? (
              <p role='alert' className='text-destructive text-xs'>
                {resetError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              type='button'
              disabled={resetPassword.isPending}
              onClick={() => setResetTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type='button'
              disabled={resetPassword.isPending}
              aria-busy={resetPassword.isPending}
              onClick={() => confirmReset()}
            >
              {resetPassword.isPending ? <PendingSpinner /> : null}
              {resetPassword.isPending ? SAVING_LABEL : 'Set password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {banTarget ? (
        <GuardedConfirm
          title={`${banTarget.statusLabel === 'Banned' ? 'Unban' : 'Ban'} ${banTarget.name}?`}
          description={
            banTarget.statusLabel === 'Banned'
              ? 'Unban restores sign-in access.'
              : 'Banning signs them out everywhere and locks sign-in until unbanned.'
          }
          confirmLabel={banTarget.statusLabel === 'Banned' ? 'Unban' : 'Ban'}
          busyLabel={banTarget.statusLabel === 'Banned' ? 'Unbanning…' : 'Banning…'}
          pending={ban.isPending}
          blockers={banBlockers}
          open
          onOpenChange={(open) => {
            if (!open) {
              setBanTarget(null);
            }
          }}
          onConfirm={() => {
            ban.mutate({
              userId: banTarget.id,
              banning: banTarget.statusLabel !== 'Banned',
            });
          }}
        />
      ) : null}

      {deleteTarget ? (
        <GuardedConfirm
          title={`Delete ${deleteTarget.name}?`}
          description='This removes the account and every session. This cannot be undone.'
          confirmLabel='Delete user'
          busyLabel={DELETING_LABEL}
          pending={removeUser.isPending}
          blockers={deleteBlockers}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={() => {
            removeUser.mutate(deleteTarget.id);
          }}
        />
      ) : null}
    </div>
  );
}
