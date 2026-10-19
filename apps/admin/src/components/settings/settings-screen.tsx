// The Settings screen (M7 #215 + #221): the three-tab strip — Account
// (every staff member), Users (owner-only, #221's Task 5), Site (all
// staff, the #215 singleton editor moved verbatim). Tabs are local state,
// no routes (the testimonials precedent); the strip hides the Users entry
// for staff (role !== 'admin') the way nav.ts hides owner-only nav — the
// server fns gate themselves regardless (the plugin's role gate).
import { useState } from 'react';
import { PageHeader, SegmentedControl } from '#/components/cms/shared';
import { AccountTab, type AccountUser } from '#/components/settings/account-tab';
import { SiteTab } from '#/components/settings/site-tab';
import { UsersTab } from '#/components/settings/users-tab';

// TODO(owner-copy): the users subline is an unplanned string awaiting the
// owner's ratification (#134 open items).
const TAB_SUBLINES: Record<'account' | 'users' | 'site', string> = {
  account: 'Your account and security.',
  users: 'The studio’s staff accounts.',
  site: 'The site’s words and marks — editable without a deploy.',
};

export function SettingsScreen({ user }: { user: AccountUser }) {
  const [tab, setTab] = useState<'account' | 'users' | 'site'>('account');
  // Owners only (the 2026-10-18 amendment): the options array gains the Users
  // entry between Account and Site — SegmentedControl takes the whole array.
  const options: { value: 'account' | 'users' | 'site'; label: string }[] = [
    { value: 'account', label: 'Account' },
    ...(user.role === 'admin' ? [{ value: 'users' as const, label: 'Users' }] : []),
    { value: 'site', label: 'Site' },
  ];
  return (
    <div className='space-y-6'>
      <PageHeader title='Settings' subline={TAB_SUBLINES[tab]} />
      {/* The strip is the testimonials screen's SegmentedControl (local
          state, no routes). */}
      <SegmentedControl
        options={options}
        value={tab}
        onChange={setTab}
        ariaLabel='Settings sections'
      />
      {tab === 'account' ? (
        <AccountTab user={user} />
      ) : tab === 'users' ? (
        <UsersTab actorId={user.id} />
      ) : (
        <SiteTab />
      )}
    </div>
  );
}
