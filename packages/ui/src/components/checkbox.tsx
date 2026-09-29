// Indeterminate ruling (#155, ADR-0017): a partial selection renders the
// check in the UNFILLED box with a primary border — distinct from the
// filled full-check at a glance. Base UI 1.8.0 rides `data-indeterminate`
// alongside `data-unchecked` (the value stays false), and the Indicator
// renders for checked OR indeterminate — so the glyph needs no swap, only
// the deliberate border. `aria-checked="mixed"` is Base UI's own and stays.
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot='checkbox'
      className={cn(
        'peer relative flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-transparent bg-input/90 outline-none transition-shadow after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 group-has-[:focus-visible]/field-label:not-data-checked:border-transparent group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary data-checked:border-primary data-indeterminate:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot='checkbox-indicator'
        className='grid place-content-center text-current transition-none [&>svg]:size-3.5'
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
