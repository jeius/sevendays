// The Audit Log screen's route (#188, spec § The Audit Log — Viewer):
// owner-only, re-gated HERE even though the nav hides the entry and the
// server fns gate themselves — a staff arrival at the bare URL lands on
// their own dashboard, never on person-level history (the standing
// rule). Filters are shareable search params (the WindowToggle
// precedent), tolerant by construction (Task 1's catch-everything
// schema — a stale shared URL never fails a visit).
import { createFileRoute, redirect } from '@tanstack/react-router';

import { AuditLogScreen } from '#/components/audit/audit-log-screen';
import { auditLogSearchSchema } from '#/lib/audit/filters';

export const Route = createFileRoute('/_shell/audit-log')({
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  validateSearch: auditLogSearchSchema,
  head: () => ({ meta: [{ title: 'Audit Log | Sevendays Admin' }] }),
  component: AuditLogPage,
});

function AuditLogPage() {
  const search = Route.useSearch();
  return <AuditLogScreen search={search} />;
}
