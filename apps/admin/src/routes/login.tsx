// /login — the staff front door (M4 spec § Login UI + shell gate): public,
// outside the _shell layout, so the gate never runs for it. The composition
// is the owner-ruled hybrid (2026-09-22 variants pass, prototype branch
// prototype/120-login-variants): variant B's split ink band at lg+, variant
// C's ink canvas with petrol glow below lg — one component, the card
// identical in both. Credential failures render ONE generic line (no
// which-field signal); the redirect round-trip consumes the gate's preserved
// aimed URL through the open-redirect guard.
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader } from '@sevendays/ui/components/card';
import { Input } from '@sevendays/ui/components/input';
import { Label } from '@sevendays/ui/components/label';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { authClient } from '#/lib/auth-client';

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  head: () => ({ meta: [{ title: 'Sign in | Sevendays Admin' }] }),
  component: LoginPage,
});

// Open-redirect guard: the aimed URL only ever navigates same-origin — a
// relative path, never protocol-relative, never absolute.
function safeRedirect(target: string | undefined): string {
  if (target && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  return '/';
}

function AdminLockup() {
  return (
    <div className='flex items-center gap-3'>
      <span className='bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
        7d
      </span>
      <span className='flex items-baseline gap-2.5'>
        <span className='text-lg leading-tight font-semibold text-white'>Sevendays</span>
        <span className='font-mono text-[0.65rem] tracking-widest text-brand-300 uppercase'>
          Admin
        </span>
      </span>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFailure(false);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      // Generic by design (AC): one fixed line for ANY failure — wrong
      // credentials, throttling, network — never a which-field signal.
      setFailure(true);
      setSubmitting(false);
      return;
    }
    await navigate({ href: safeRedirect(redirectTo) });
  };

  return (
    // Below lg (variant C): the whole canvas is ink with the glow behind the
    // card. At lg+ (variant B): a two-column split — the ink band left, the
    // wash panel (lg:bg-background) centering the card right.
    <main className='bg-brand-ink relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden p-6 lg:grid lg:grid-cols-[1.1fr_1fr] lg:p-0'>
      <div
        aria-hidden='true'
        className='bg-brand-deep/60 absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full blur-3xl lg:left-[18%]'
      />
      {/* The band — variant B's left column, lg+ only */}
      <section className='relative hidden w-full flex-col justify-between gap-16 p-14 lg:flex'>
        <AdminLockup />
        <div className='max-w-md space-y-4 pb-8'>
          <p className='font-mono text-[0.65rem] tracking-[0.18em] text-brand-200 uppercase'>
            Internal tool
          </p>
          <p className='text-2xl leading-snug font-semibold text-white'>
            The studio's appointments, catalog, and branches — behind one door.
          </p>
          <p className='text-sm text-brand-200'>Staff sign-in only.</p>
        </div>
      </section>
      {/* The form column — centered on ink (C) / on wash (B) */}
      <section className='relative flex w-full flex-col items-center justify-center gap-8 p-6 lg:min-h-svh lg:bg-background'>
        <div className='lg:hidden'>
          <AdminLockup />
        </div>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <h1 className='text-lg font-semibold'>Welcome back</h1>
            <CardDescription>Sign in to the Sevendays studio console</CardDescription>
          </CardHeader>
          <CardContent>
            <form className='space-y-4' onSubmit={(event) => void onSubmit(event)}>
              <div className='space-y-2'>
                <Label htmlFor='login-email'>Email</Label>
                <Input
                  id='login-email'
                  type='email'
                  autoComplete='email'
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='login-password'>Password</Label>
                <Input
                  id='login-password'
                  type='password'
                  autoComplete='current-password'
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {failure && (
                <p role='alert' className='text-destructive text-sm'>
                  Invalid email or password.
                </p>
              )}
              <Button type='submit' className='w-full' disabled={submitting}>
                Sign in
              </Button>
              <p className='text-center text-xs text-muted-foreground'>
                Accounts are provisioned by the studio owner.
              </p>
            </form>
          </CardContent>
        </Card>
        <p className='font-mono text-[0.65rem] tracking-[0.18em] text-brand-300 uppercase lg:hidden'>
          Studio staff only
        </p>
      </section>
    </main>
  );
}
