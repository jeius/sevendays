// The settings route (M7 #215): the gated shell's settings entry point —
// the Site tab today (all-staff content per ADR-0018). The Account/Users
// tabs + the three-tab strip are #221's restructuring of this screen.
import { createFileRoute } from '@tanstack/react-router';
import { SettingsScreen } from '#/components/settings/settings-screen';

export const Route = createFileRoute('/_shell/settings')({
  head: () => ({ meta: [{ title: 'Settings | Sevendays Admin' }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return <SettingsScreen />;
}
