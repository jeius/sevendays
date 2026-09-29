/**
 * `#155 seam: bulk-confirm naming`. The bulk DeactivateConfirm's name
 * argument, owner-ratified 2026-09-29: when every selected row is
 * eligible the plain count reads; otherwise the eligible-of-selected
 * split — the confirm states what the action will actually do (the
 * success toast has always counted eligible-only flips). Plural only,
 * matching the bar’s `{n} selected`; no singular branch by ruling.
 */
export function bulkConfirmName(selectedCount: number, eligibleCount: number): string {
  return eligibleCount === selectedCount
    ? `${selectedCount} items`
    : `${eligibleCount} of ${selectedCount} selected items`;
}
