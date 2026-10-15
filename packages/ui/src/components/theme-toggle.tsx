import { Button } from '@sevendays/ui/components/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

// The shared sun/moon toggle (#162's ruling): a plain ghost icon button
// flipping the class strategy's light/dark pair — no system option (the
// ruled offer is Light/Dark only, default light). The icons swap via the
// dark: variant, not mounted state — SSR and client markup are identical
// (no hydration mismatch), and the static aria-label keeps it true in
// both themes. Apps own placement and ground tint through className: the
// landing's ink band passes its own tint classes; surfaces on the
// token-bound background take the default ghost.
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant='ghost'
      size='icon'
      aria-label='Toggle theme'
      className={className}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className='dark:hidden' aria-hidden='true' />
      <Moon className='hidden dark:block' aria-hidden='true' />
    </Button>
  );
}
