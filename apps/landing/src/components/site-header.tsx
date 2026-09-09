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
        {/* Plain anchors: /visit arrives with ticket #45; convert to typed Links then. */}
        <a href='/packages' className='hover:underline'>
          Packages
        </a>
        <a href='/services' className='hover:underline'>
          Services
        </a>
        <a href='/branches' className='hover:underline'>
          Branches
        </a>
        <a href='/about' className='hover:underline'>
          About
        </a>
        <Link to='/visit' className='rounded-md bg-neutral-900 px-4 py-2 text-white'>
          Book now
        </Link>
      </nav>
    </header>
  );
}
