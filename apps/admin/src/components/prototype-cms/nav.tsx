// PROTOTYPE (throwaway) — wayfinder #131: screen registry + nav taxonomy for
// the admin CMS composition route. The three NEW destinations (Gallery,
// Testimonials, Lookups) render inside the ruled #59 group taxonomy as the
// IA proposal the owner reacts to. Never merges; delete with the route.
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Images,
  LayoutDashboard,
  MapPin,
  Package,
  PlusCircle,
  Quote,
  Settings,
  Tags,
  Wrench,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { z } from 'zod';
import { PackageEditorScreen } from './screens/package-editor';
import { PackagesScreen } from './screens/packages';

export const SCREEN_KEYS = [
  'packages',
  'package-editor',
  'studio-services',
  'add-ons',
  'branches',
  'lookups',
  'gallery',
  'testimonials',
] as const;

export type ScreenKey = (typeof SCREEN_KEYS)[number];

export type ScreenProps = { variant: 'a' | 'b'; search: Search };

export const searchSchema = z.object({
  screen: z.enum(SCREEN_KEYS).default('packages'),
  variant: z.enum(['a', 'b']).default('a'),
  // Optional deep-link states so the headless screenshot pass can capture
  // open dialogs/sheets/confirms without interaction:
  edit: z.string().optional(), // entity id → open that row's editor
  confirm: z.string().optional(), // entity id → open its deactivate confirm
});

export type Search = z.infer<typeof searchSchema>;

// Sidebar taxonomy: the #59 groups with the M5 additions placed as the IA
// proposal (Gallery + Testimonials in Catalog; Lookups in Studio — the
// owner rules on these placements in the reaction pass). Items without a
// `key` are the real shell's inert destinations (Dashboard/Appointments/
// Settings), rendered for shell realism with no prototype screen behind them.
export interface NavItem {
  label: string;
  icon: LucideIcon;
  // Absent = inert destination of the real shell; no prototype screen.
  key?: ScreenKey;
  // Flags the M5 additions with a small "new" badge.
  isNew?: boolean;
}

export const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard },
      { label: 'Appointments', icon: CalendarDays },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { label: 'Packages', icon: Package, key: 'packages' },
      { label: 'Studio services', icon: Wrench, key: 'studio-services' },
      { label: 'Add-ons', icon: PlusCircle, key: 'add-ons' },
      { label: 'Gallery', icon: Images, key: 'gallery', isNew: true },
      { label: 'Testimonials', icon: Quote, key: 'testimonials', isNew: true },
    ],
  },
  {
    heading: 'Studio',
    items: [
      { label: 'Branches', icon: MapPin, key: 'branches' },
      { label: 'Lookups', icon: Tags, key: 'lookups', isNew: true },
      { label: 'Settings', icon: Settings },
    ],
  },
];

// Registry: every screen key maps to a component. Tasks 2–4 replace stubs.
export const SCREENS: Record<ScreenKey, ComponentType<ScreenProps>> = {
  packages: PackagesScreen,
  'package-editor': PackageEditorScreen,
  'studio-services': StubScreen,
  'add-ons': StubScreen,
  branches: StubScreen,
  lookups: StubScreen,
  gallery: StubScreen,
  testimonials: StubScreen,
};

function StubScreen({ variant: _variant }: ScreenProps) {
  return <p className='text-muted-foreground text-sm'>Composition lands in a later task.</p>;
}
