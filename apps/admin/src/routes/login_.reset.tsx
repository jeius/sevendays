// /login/reset (M7 #221): the far end of the emailed token link. BetterAuth's
// GET /api/auth/reset-password/:token 302s here with ?token=VALID_TOKEN (or
// ?error=INVALID_TOKEN) after validating; the form POSTs the new password
// through authClient.resetPassword — a success revokes every session
// (revokeSessionsOnPasswordReset) and bounces to /login?reset=1. A minimal
// standalone card on the wash canvas (both themes; the login band stays on
// /login — this page is one purpose, one form).
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader } from '@sevendays/ui/components/card';
import { Input } from '@sevendays/ui/components/input';
import { Label } from '@sevendays/ui/components/label';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { authClient } from '#/lib/auth-client';

const resetSearchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute('/login_/reset')({
  validateSearch: resetSearchSchema,
  head: () => ({ meta: [{ title: 'Reset password | Sevendays Admin' }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token, error } = Route.useSearch();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [failure, setFailure] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMismatch(false);
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token: token ?? '',
    });
    setSubmitting(false);
    if (resetError) {
      setFailure(true);
      return;
    }
    // Every session was just revoked (revokeSessionsOnPasswordReset) —
    // straight to the door with the success line.
    await navigate({ href: '/login?reset=1' });
  };

  return (
    <main className='bg-background flex min-h-svh items-center justify-center p-6'>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <h1 className='text-lg font-semibold'>Choose a new password</h1>
          <CardDescription>
            {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
            At least 12 characters. Every signed-in session is signed out when the password changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error || !token ? (
            <div className='space-y-3'>
              <p role='alert' className='text-destructive text-sm'>
                {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
                This reset link is invalid or has expired. Request a new one.
              </p>
              <Button
                variant='outline'
                className='w-full'
                type='button'
                onClick={() => void navigate({ href: '/login' })}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <form className='space-y-4' onSubmit={(event) => void onSubmit(event)}>
              <div className='space-y-2'>
                <Label htmlFor='reset-password'>New password</Label>
                <Input
                  id='reset-password'
                  type='password'
                  autoComplete='new-password'
                  required
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='reset-confirm'>Confirm password</Label>
                <Input
                  id='reset-confirm'
                  type='password'
                  autoComplete='new-password'
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </div>
              {mismatch && (
                <p role='alert' className='text-destructive text-sm'>
                  {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
                  The passwords don’t match.
                </p>
              )}
              {failure && (
                <p role='alert' className='text-destructive text-sm'>
                  {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
                  Could not reset the password — the link may have expired. Request a new one.
                </p>
              )}
              <Button type='submit' className='w-full' disabled={submitting}>
                {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
                Reset password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
