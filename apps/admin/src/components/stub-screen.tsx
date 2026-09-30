// Admin-local Tier 2 (spec #94): the placeholder surface behind every nav
// destination whose real screen belongs to a later milestone (#59: the stubs
// exist so the IA is clickable — "IA, not designs"). Copy adapted from the
// #59 prototype blurbs the owner reacted to; the appointments + dashboard
// lines carry #93's stub ruling. One h1 per screen lives here.
import { Badge } from '@sevendays/ui/components/badge';

interface StubScreenProps {
  title: string;
  blurb: string;
  milestone: 'M4' | 'M5' | 'v2';
}

export function StubScreen({ title, blurb, milestone }: StubScreenProps) {
  return (
    <section
      data-stub-screen={milestone}
      className='bg-card/50 border-border flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center'
    >
      <h1 className='text-foreground text-lg font-semibold'>{title}</h1>
      <p className='text-muted-foreground mt-2 max-w-md text-sm'>{blurb}</p>
      <Badge variant='outline' className='mt-4 font-mono text-xs'>
        arrives with {milestone}
      </Badge>
    </section>
  );
}
