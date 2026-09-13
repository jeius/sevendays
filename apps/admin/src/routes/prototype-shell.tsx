// PROTOTYPE (throwaway) — wayfinder #59: admin app shell + IA variants.
// Three structurally different shells over the same appointments content
// (list, branch/status filters, in-memory status update). Switch with
// ?variant=a|b|c or the floating bar. Never ships: delete with the rest of
// apps/admin/src/prototype/ when the milestone work lands.

import { createFileRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { z } from 'zod';
import { PrototypeSwitcher, type VariantOption } from '../prototype/switcher';
import { VariantASidebar } from '../prototype/variant-a-sidebar';
import { VariantBTopbar } from '../prototype/variant-b-topbar';
import { VariantCRail } from '../prototype/variant-c-rail';

const variantSchema = z.object({
  variant: z.enum(['a', 'b', 'c']).default('a'),
});

const variants: (VariantOption & { Component: () => ReactElement })[] = [
  { key: 'a', label: 'A — Sidebar shell', Component: VariantASidebar },
  { key: 'b', label: 'B — Top-bar shell', Component: VariantBTopbar },
  { key: 'c', label: 'C — Icon-rail shell', Component: VariantCRail },
];

export const Route = createFileRoute('/prototype-shell')({
  validateSearch: (search: Record<string, unknown>) => variantSchema.parse(search),
  component: PrototypeShellPage,
});

function PrototypeShellPage() {
  const { variant } = Route.useSearch();
  const current = variants.find((v) => v.key === variant);
  if (!current) return null;
  const Current = current.Component;
  return (
    <>
      <Current />
      {import.meta.env.DEV && (
        <PrototypeSwitcher
          options={variants.map(({ key, label }) => ({ key, label }))}
          current={current.key}
        />
      )}
    </>
  );
}
