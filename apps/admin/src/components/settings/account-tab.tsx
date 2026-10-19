// The Account tab (M7 #221): every staff member manages themselves —
// read-only identity, editable display name, change-password (verifies the
// current password server-side through BetterAuth's own endpoint),
// sign-out-of-all-sessions. All three actions ride the browser authClient
// (same-origin /api/auth, cookies ride themselves — the login form's
// posture); no server fns, no API surface.
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Input } from '@sevendays/ui/components/input';
import { Label } from '@sevendays/ui/components/label';
import { toast } from '@sevendays/ui/components/sonner';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { LoaderCircle, LogOut } from 'lucide-react';
import { useState } from 'react';
import { authClient } from '#/lib/auth-client';
import { roleLabel } from '#/lib/users-state';

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

export function AccountTab({ user }: { user: AccountUser }) {
  const navigate = useNavigate();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function saveName() {
    setSavingName(true);
    const { error } = await authClient.updateUser({ name: displayName });
    setSavingName(false);
    if (error) {
      toast.error('Could not save the display name.');
      return;
    }
    toast.success('Saved.');
    await router.invalidate(); // the shell's context (topbar user card) refreshes
  }

  async function changePassword() {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('The passwords don’t match.');
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError('The new password needs at least 12 characters.');
      return;
    }
    setSavingPassword(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    });
    setSavingPassword(false);
    if (error) {
      // BetterAuth answers a generic failure for a wrong current password —
      // one line, never which field.
      setPasswordError('Could not change the password. Check the current password and try again.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password changed.');
  }

  async function signOutEverywhere() {
    setSigningOut(true);
    const { error } = await authClient.revokeSessions();
    if (error) {
      setSigningOut(false);
      toast.error('Could not sign out.');
      return;
    }
    await navigate({ href: '/login' }); // every session — including this one — is gone
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Identity</h2>
          <p className='text-muted-foreground text-sm'>
            {user.email} · {roleLabel(user.role)}
          </p>
          <div className='flex items-end gap-2 pt-2'>
            <div className='flex-1 space-y-2'>
              <Label htmlFor='account-name'>Display name</Label>
              <Input
                id='account-name'
                className='h-8 text-sm'
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <Button
              type='button'
              size='sm'
              disabled={savingName || displayName.trim() === '' || displayName === user.name}
              onClick={() => void saveName()}
            >
              {savingName ? (
                <LoaderCircle aria-hidden='true' className='size-4 animate-spin' />
              ) : null}
              {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
              {savingName ? 'Saving…' : 'Save name'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Change password</h2>
          <div className='grid max-w-md gap-3 pt-2 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='account-current-password'>Current password</Label>
              <Input
                id='account-current-password'
                type='password'
                autoComplete='current-password'
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='account-new-password'>New password</Label>
              <Input
                id='account-new-password'
                type='password'
                autoComplete='new-password'
                minLength={12}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='account-confirm-password'>Confirm new password</Label>
              <Input
                id='account-confirm-password'
                type='password'
                autoComplete='new-password'
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
          {passwordError && (
            <p role='alert' className='text-destructive text-xs'>
              {passwordError}
            </p>
          )}
          <Button
            type='button'
            size='sm'
            className='mt-2'
            disabled={
              savingPassword ||
              currentPassword === '' ||
              newPassword === '' ||
              confirmPassword === ''
            }
            onClick={() => void changePassword()}
          >
            {savingPassword ? (
              <LoaderCircle aria-hidden='true' className='size-4 animate-spin' />
            ) : null}
            {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
            {savingPassword ? 'Changing…' : 'Change password'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Sessions</h2>
          <p className='text-muted-foreground text-sm'>
            {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
            Signs this account out of every session, on every device — including this one.
          </p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-2'
            disabled={signingOut}
            onClick={() => void signOutEverywhere()}
          >
            {signingOut ? (
              <LoaderCircle aria-hidden='true' className='size-4 animate-spin' />
            ) : (
              <LogOut aria-hidden='true' className='size-4' />
            )}
            {/* TODO(owner-copy): unplanned string awaiting the owner's ratification (#134 open items). */}
            {signingOut ? 'Signing out…' : 'Sign out of all sessions'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
