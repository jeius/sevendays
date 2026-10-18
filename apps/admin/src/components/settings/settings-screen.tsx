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

export function SettingsScreen({ user }: { user: AccountUser }) {
  const [tab, setTab] = useState<'account' | 'site'>('account');
  const subline =
    tab === 'account'
      ? 'Your account and security.'
      : 'The site’s words and marks — editable without a deploy.';
  return (
    <div className='space-y-6'>
      <PageHeader title='Settings' subline={subline} />
      {/* The strip is the testimonials screen's SegmentedControl (local
          state, no routes); Task 5 widens the union + the options array. */}
      <SegmentedControl
        options={[
          { value: 'account', label: 'Account' },
          { value: 'site', label: 'Site' },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel='Settings sections'
      />
      {tab === 'account' ? <AccountTab user={user} /> : <SiteTab />}
    </div>
  );
}
