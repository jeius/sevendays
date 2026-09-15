// The four primary nav links (M3 #97), shared by SiteHeader, MobileNav, and
// SiteFooter — one source so the chrome never disagrees with itself.
// `as const` keeps the `to` literals typed for TanStack Router's Link.
export const NAV_LINKS = [
  { to: '/packages', label: 'Packages' },
  { to: '/services', label: 'Services' },
  { to: '/branches', label: 'Branches' },
  { to: '/about', label: 'About' },
] as const;
