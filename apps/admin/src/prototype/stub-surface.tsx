// PROTOTYPE (throwaway) — wayfinder #59: placeholder screens behind nav
// items whose real surface belongs to a later milestone. They exist so the
// nav taxonomy is clickable and feels real — the ruling is shell + IA.
export const stubBlurbs = {
  appointments: {
    title: 'Appointments',
    blurb:
      'The full bookings worklist. List, branch/status filters, and status updates are stubbed on the dashboard screen here; the real surface is the appointments dashboard, now v2 payload.',
  },
  packages: {
    title: 'Packages',
    blurb:
      'Package catalog CRUD — create, edit, deactivate. Cover-photo uploads land here with M5 CMS and its R2 media bucket.',
  },
  addons: {
    title: 'Add-ons',
    blurb:
      'Add-on services catalog (Makeup, Hairstyle, …) and which studio services they apply to. M5 CMS surface.',
  },
  services: {
    title: 'Studio services',
    blurb:
      'Studio services catalog (Photo Recovery, Tarpaulin & Bulletin Printing, …) and per-branch bookability. M5 CMS surface.',
  },
  branches: {
    title: 'Branches',
    blurb:
      'Branch info editing — name, address, phone, walk-in flag, business hours, slot capacity. M5 CMS surface.',
  },
  settings: {
    title: 'Settings',
    blurb:
      'Admin settings — surfaces with M4 admin auth (staff accounts and sessions). Shape TBD by that milestone.',
  },
} as const;

export type StubScreen = keyof typeof stubBlurbs;

export function StubSurface({ title, blurb }: { title: string; blurb: string }) {
  return (
    <section className='bg-card/50 border-border flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center'>
      <h2 className='text-foreground text-lg font-semibold'>{title}</h2>
      <p className='text-muted-foreground mt-2 max-w-md text-sm'>{blurb}</p>
      <p className='text-muted-foreground/70 mt-4 font-mono text-xs'>
        stub — not built in this prototype
      </p>
    </section>
  );
}
