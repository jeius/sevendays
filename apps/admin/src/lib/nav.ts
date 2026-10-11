// The shell's nav taxonomy (#59 ruling, extracted from admin-sidebar.tsx
// at #188 so the owner-visibility law is testable): navGroups is data,
// visibleNavGroups is the role filter. Owner-only entries — Audit Log
// (M6 #188: the who/what/when record is person-level by the standing
// rule "aggregates are shared; anything person-level is owner-scoped")
// — render for role === 'admin' alone (ADR-0018's BetterAuth mapping:
// the owner holds the admin plugin's 'admin' literal; 'staff' and null
// both fail; the role column is nullable).
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Images,
  MapPin,
  Package,
  PlusCircle,
  Quote,
  ScrollText,
  Settings,
  Tags,
  Wrench,
} from 'lucide-react';

export type NavTo =
  | '/'
  | '/audit-log'
  | '/packages'
  | '/add-ons'
  | '/studio-services'
  | '/gallery'
  | '/testimonials'
  | '/branches'
  | '/lookups'
  | '/settings';

export interface NavItem {
  to: NavTo;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

// The ruled taxonomy (#59), icons carried from the prototype unchanged.
// Overview carries the Analytics dashboard (#186) and — owner-only — the
// Audit Log (#188, beside Analytics); the appointments stub is absent here
// (the #169 ruling, recurring at the taxonomy's new home); Catalog and
// Studio carry the live CMS surfaces. #208: FROZEN read-only —
// visibleNavGroups('admin') hands this very array back by reference (and
// the filtered path's fresh arrays share the item objects), so a mutating
// caller would corrupt the module state every render reads; frozen data
// throws on mutation instead (modules run strict). No caller mutates
// today — the freeze makes that permanent and loud. The lucide icon
// values stay unfrozen: shared singletons, not ours to freeze.
const taxonomy: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Analytics', icon: Activity },
      { to: '/audit-log', label: 'Audit Log', icon: ScrollText, ownerOnly: true },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { to: '/packages', label: 'Packages', icon: Package },
      { to: '/add-ons', label: 'Add-ons', icon: PlusCircle },
      { to: '/studio-services', label: 'Studio services', icon: Wrench },
      { to: '/gallery', label: 'Gallery', icon: Images },
      { to: '/testimonials', label: 'Testimonials', icon: Quote },
    ],
  },
  {
    heading: 'Studio',
    items: [
      { to: '/branches', label: 'Branches', icon: MapPin },
      { to: '/lookups', label: 'Lookups', icon: Tags },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const navGroups: readonly NavGroup[] = Object.freeze(
  taxonomy.map((group) =>
    Object.freeze({
      ...group,
      items: Object.freeze(group.items.map((item) => Object.freeze({ ...item }))) as NavItem[],
    })
  )
);

export function visibleNavGroups(role: string | null | undefined): readonly NavGroup[] {
  if (role === 'admin') {
    return navGroups;
  }
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.ownerOnly !== true),
    }))
    .filter((group) => group.items.length > 0);
}
