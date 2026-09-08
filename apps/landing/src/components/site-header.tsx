import { Link } from '@tanstack/react-router';

// Site-wide header: brand + primary nav. M2's bar is data-complete,
// visually-rough — plain flex, no design pass (spec non-goal).
export function SiteHeader() {
  return (
    <header className='flex items-center justify-between p-6'>
      <Link to='/' className='font-bold text-xl'>
        Sevendays Photography
      </Link>
      <nav className='flex items-center gap-6'>
        {/* Plain anchor: /visit arrives with ticket #45; convert to typed Links then. */}
        <a href='/packages' className='hover:underline'>
          Packages
        </a>
        <a href='/visit' className='rounded-md bg-neutral-900 px-4 py-2 text-white'>
          Book now
        </a>
      </nav>
    </header>
  );
}
