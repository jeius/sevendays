// The Global Search dropdown + its narrow form (M9 #315/#316, glossary:
// never "command palette" / "omnibar" / "quick find"): the topbar Input IS
// the typing surface; results drop from it in a non-modal anchored popover,
// the page visible around them, searching never blanks the working
// context. Below sm, where the Input is hidden by the house law, a
// magnifier-icon button in the topbar opens the SAME results as a top
// sheet with its own input inside (D6, #316), that input lives INSIDE the
// cmdk tree, so cmdk's native roving + selection need no bridge there (the
// structural mirror of the dropdown's outside-typing finding, D7), and
// Escape closes through the Sheet's Base UI dialog behavior. The engine is
// the hand-wired lib seam (#/lib/global-search, D7: fuse.js, identity >
// body, cmdk's built-in filter CANNOT serve the dropdown posture, it only
// filters items driven by its own Command.Input inside its tree, and the
// dropdown types into the topbar, outside it); cmdk runs here as the
// headless listbox core (shouldFilter={false} on BOTH trees), the sheet's
// keyboard roving + selection are cmdk's own; the dropdown's roving is
// component-owned (cmdk 1.1.1's selection store never initializes in the
// outside-input posture under React 19). The index builds over useQueries on the five
// unchanged #288 factories at topbar (= shell) scope: same keys as the
// screens, full arrays with deactivated rows included, freshness inherited
// from the seam's own contracts, zero new fetch machinery. useDeferredValue
// keeps typing responsive; selection navigates via the seam's ?focus= href
// (the landing, scroll + highlight, is #316's useFocusLanding on the four
// list screens). Posture + anatomy ported from prototype/search-ux-variants
// variant B (#303's ruled pick), values and rulings, never the branch. The
// kbd chip's GLYPH is platform-picked (⌘K on Apple, Ctrl K elsewhere,
// owner-ruled 2026-11-17); the shortcut BINDING never sniffs: ⌘K and Ctrl+K,
// one rule (D6), only the rule's SURFACE is posture-picked, by viewport.
import { Button } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@sevendays/ui/components/popover';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@sevendays/ui/components/sheet';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Command } from 'cmdk';
import type { LucideIcon } from 'lucide-react';
import { ImageIcon, MapPin, Package, Quote, Search, X } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  adminBranchQueries,
  adminGalleryQueries,
  adminPackageQueries,
  adminTestimonialQueries,
} from '#/lib/cms-queries';
import {
  buildSearchIndex,
  runSearch,
  SEARCH_COPY,
  type SearchDropdownState,
  type SearchGroup,
  type SearchHit,
  searchDropdownState,
} from '#/lib/global-search';

/** The Tailwind sm breakpoint (640px), the ⌘K rule's surface picker. */
const SM_QUERY = '(min-width: 640px)';

const GROUP_ICONS: Record<SearchHit['group'], LucideIcon> = {
  packages: Package,
  branches: MapPin,
  testimonials: Quote,
  gallery: ImageIcon,
};

const KBD_CHIP =
  'pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground';

const GROUP_CLASS =
  '[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium';

export function GlobalSearch() {
  // The index source (D8): the #288 factories, UNCHANGED, useQueries reads
  // the five cached lists at topbar scope so a result can never disagree
  // with the screen it lands on; deactivated rows ride the same arrays the
  // lists render.
  const [packages, branches, testimonials, photos, categories] = useQueries({
    queries: [
      adminPackageQueries.all(),
      adminBranchQueries.all(),
      adminTestimonialQueries.all(),
      adminGalleryQueries.photos(),
      adminGalleryQueries.categories(),
    ],
  });

  const [open, setOpen] = useState(false);
  // The narrow form's surface (D6, #316): the top sheet below sm. It shares
  // the query state with the dropdown, one search, two postures.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Typing stays responsive: the Input tracks `query` immediately, the
  // deferred copy drives the (memoized) fuse pass (D7).
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const index = useMemo(
    () =>
      buildSearchIndex({
        packages: packages.data ?? [],
        branches: branches.data ?? [],
        testimonials: testimonials.data ?? [],
        photos: photos.data ?? [],
        categories: categories.data ?? [],
      }),
    [packages.data, branches.data, testimonials.data, photos.data, categories.data]
  );
  const groups = useMemo(() => runSearch(index, deferredQuery), [index, deferredQuery]);
  const state = searchDropdownState(deferredQuery, groups);

  // The DROPDOWN's roving is COMPONENT-OWNED (fix round 3, #316, cmdk
  // 1.1.1's selection store never initializes in this outside-input posture
  // under React 19, so `data-selected` painted on no item and the
  // re-dispatched keys moved nothing): this index roves over the flattened
  // visible hits via the keyboard bridge below. Reset to the first hit
  // whenever the result set changes identity (the deferred query or the
  // index rebuilt).
  const [rovingIndex, setRovingIndex] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the reset is keyed to `groups` IDENTITY (the deferred query or the index rebuilt), a deliberate reset-on-change effect; nothing in the body needs to read it
  useEffect(() => {
    setRovingIndex(0);
  }, [groups]);

  // The chip's GLYPH alone is platform-picked (owner-ruled 2026-11-17);
  // mounted-gated so SSR markup and the first client render agree, no
  // hydration mismatch, the chip fills after mount.
  const [kbdGlyph, setKbdGlyph] = useState('');
  useEffect(() => {
    setKbdGlyph(/mac|iphone|ipad|ipod/i.test(navigator.platform) ? '⌘K' : 'Ctrl K');
  }, []);

  // ⌘K and Ctrl+K, ONE rule, no platform sniffing on the binding (D6).
  // Only the rule's SURFACE is posture-picked at the current viewport: the
  // dropdown + topbar Input at sm+, the sheet (its own input, autofocused
  // on open) below sm, the expert gesture works from anywhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (window.matchMedia(SM_QUERY).matches) {
          inputRef.current?.focus();
          setOpen(true);
        } else {
          setSheetOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // The keyboard bridge (the DROPDOWN's, the sheet needs none, its input
  // lives inside its own cmdk tree and keeps cmdk's native roving +
  // selection): focus lives in the topbar Input, OUTSIDE the popover's
  // cmdk tree, so the roving keys move `rovingIndex` over the flattened
  // visible hits and Enter lands the row it points at. The overflow tail
  // is an indicator, never a hit, it is not part of the roving space.
  // Escape closes deterministically, in this posture focus never enters
  // the content, so the popover's own Escape arm cannot be relied on.
  const onTypingKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    const flat = groups.flatMap((group) => group.hits);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setRovingIndex((index) => Math.min(index + 1, flat.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setRovingIndex((index) => Math.max(index - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setRovingIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setRovingIndex(Math.max(flat.length - 1, 0));
        break;
      case 'Enter': {
        event.preventDefault();
        const hit = flat[rovingIndex];
        if (hit) land(hit);
        break;
      }
    }
  };

  // Selection lands on the entity's list screen via the seam's ?focus= href
  // (#316's useFocusLanding honors it on the four list screens). Whichever
  // posture selected, both close; the query persists, reopening resumes
  // where the eye was, nothing is cleared.
  const land = (hit: SearchHit) => {
    setOpen(false);
    setSheetOpen(false);
    void navigate({ href: hit.focusUrl, resetScroll: false });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        {/* The trigger is a passive anchor div wrapping the Input (Base UI has
            no Popover.Anchor part): the Input's clicks stop propagation so the
            typing surface never toggle-closes its own dropdown; focus and
            typing open it. nativeButton={false}, the anchor is a div, not a
            button (Base UI's own remedy for the non-button render prop).
            Below sm the Input stays hidden (the house law) and the magnifier
            (inside this same anchor) carries the narrow form instead. */}
        <PopoverTrigger
          nativeButton={false}
          render={<div className='flex min-w-0 items-center gap-1' />}
        >
          <div className='relative hidden min-w-0 sm:block'>
            <Input
              ref={inputRef}
              type='search'
              value={query}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onTypingKeyDown}
              placeholder='Search…'
              aria-label='Search'
              className='w-56 pr-10'
            />
            <kbd className={KBD_CHIP}>{kbdGlyph}</kbd>
          </div>
          {/* The narrow form's trigger (D6): below sm a magnifier-icon
              button opens the same results as a top sheet. Its click stops
              propagation, the button rides inside the popover's anchor
              div, and the anchor's own click must never toggle the
              (desktop) dropdown open below sm. */}
          <Button
            variant='ghost'
            size='icon'
            type='button'
            aria-label='Search'
            className='sm:hidden'
            onClick={(event) => {
              event.stopPropagation();
              setSheetOpen(true);
            }}
          >
            <Search aria-hidden='true' />
          </Button>
        </PopoverTrigger>
        {/* initialFocus={false}, the installed Base UI popover's sanctioned
            "do not move focus on open" control (@base-ui/react 1.8.0,
            Popover.Popup.Props.initialFocus: `false: Do not move focus`):
            without it the popup's open-focus steals the topbar Input's focus
            as it mounts (walk-probed on the deployed teaser, the INPUT at
            T+100, the content DIV at T+400), killing the D6 contract's
            "focuses" half. Focus stays on the Input for every open path
            (⌘K, click, onFocus), this posture never wants it inside. */}
        <PopoverContent
          initialFocus={false}
          align='start'
          sideOffset={8}
          className='w-[min(24rem,calc(100vw-1.5rem))] gap-0 p-0'
        >
          {/* cmdk as the headless listbox core ONLY (D7): shouldFilter={false}
              matching is the lib seam's; the dropdown's roving is the
              component-owned rovingIndex above, painted via data-roving. */}
          <Command shouldFilter={false} className='flex flex-col'>
            <GlobalSearchResults
              groups={groups}
              state={state}
              deferredQuery={deferredQuery}
              onSelect={land}
              rovingIndex={rovingIndex}
            />
          </Command>
        </PopoverContent>
      </Popover>

      {/* The narrow form (D6): the same results as a top sheet with its own
          input INSIDE the cmdk tree, focus starts there, so cmdk's native
          roving + selection need no bridge; Escape closes through the
          Sheet's Base UI dialog behavior. Same width law as the dropdown,
          centered (the top side is inset-x-0; mx-auto over the width
          resolves the overconstraint to a centered column). The overlay is
          the Sheet primitive's own (bg-black/30 + blur). */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side='top'
          showCloseButton={false}
          className='mx-auto w-[min(24rem,calc(100vw-1.5rem))] gap-0 rounded-b-3xl p-0'
        >
          <SheetTitle className='sr-only'>Search</SheetTitle>
          <Command shouldFilter={false} className='flex flex-col'>
            <div className='flex items-center border-b'>
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder='Search…'
                aria-label='Search'
                autoFocus
                className='placeholder:text-muted-foreground h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none'
              />
              <SheetClose
                render={<Button variant='ghost' size='icon-sm' className='mr-1 shrink-0' />}
              >
                <X aria-hidden='true' />
                <span className='sr-only'>Close</span>
              </SheetClose>
            </div>
            <GlobalSearchResults
              groups={groups}
              state={state}
              deferredQuery={deferredQuery}
              onSelect={land}
            />
          </Command>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * The ruled-contract result body (D9), shared by BOTH postures, the #302
 * contract (grouping, caps, states, item anatomy) is identical across
 * them; only the chrome differs (the prototype's search-results-body
 * shape, ported onto the production seams). Renders inside a cmdk
 * <Command> tree; does no matching, the lib seam already did.
 */
function GlobalSearchResults({
  groups,
  state,
  deferredQuery,
  onSelect,
  rovingIndex,
}: {
  groups: SearchGroup[];
  state: SearchDropdownState;
  deferredQuery: string;
  onSelect: (hit: SearchHit) => void;
  /** The DROPDOWN's component-owned roving cursor; absent in the sheet
   * posture, which keeps cmdk's native data-selected painting untouched. */
  rovingIndex?: number;
}) {
  // The flat index each item occupies across the groups (the dropdown's
  // roving space): the overflow tail contributes nothing, it is not a hit.
  const groupEntries: Array<{ group: SearchGroup; start: number }> = [];
  let running = 0;
  for (const group of groups) {
    groupEntries.push({ group, start: running });
    running += group.hits.length;
  }
  return (
    <Command.List className='max-h-[320px] overflow-y-auto p-2'>
      {state === 'hint' ? (
        <div className='px-4 py-10 text-center'>
          <p className='text-muted-foreground text-sm'>{SEARCH_COPY.hint}</p>
        </div>
      ) : state === 'empty' ? (
        <div className='px-4 py-10 text-center'>
          <p className='text-muted-foreground text-sm'>{SEARCH_COPY.noResults(deferredQuery)}</p>
        </div>
      ) : (
        groupEntries.map(({ group, start }) => (
          <Command.Group key={group.key} heading={group.label} className={GROUP_CLASS}>
            {group.hits.map((hit, hitIndex) => (
              <SearchResultItem
                key={hit.id}
                hit={hit}
                onSelect={onSelect}
                roving={rovingIndex === start + hitIndex ? true : undefined}
              />
            ))}
            {group.overflow > 0 ? (
              // An indicator, never a selectable item (D9).
              <div className='text-muted-foreground px-2 py-1.5 text-xs'>
                {SEARCH_COPY.overflow(group.overflow, group.label)}
              </div>
            ) : null}
          </Command.Group>
        ))
      )}
    </Command.List>
  );
}

function SearchResultItem({
  hit,
  onSelect,
  roving,
}: {
  hit: SearchHit;
  onSelect: (hit: SearchHit) => void;
  /** The dropdown's component-owned roving highlight (fix round 3, #316):
   * the same visuals keyed on data-roving instead of cmdk's data-selected. */
  roving?: boolean;
}) {
  const Icon = GROUP_ICONS[hit.group];
  return (
    <Command.Item
      value={hit.id}
      onSelect={() => onSelect(hit)}
      data-roving={roving || undefined}
      className='data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-ring data-[roving=true]:bg-accent data-[roving=true]:text-accent-foreground data-[roving=true]:ring-1 data-[roving=true]:ring-ring flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm'
    >
      <Icon aria-hidden='true' className='text-muted-foreground size-4 shrink-0' />
      <span className='min-w-0 flex-1'>
        <span className='flex items-baseline gap-1.5'>
          <span className='truncate'>{hit.primary}</span>
          {hit.deactivated ? (
            <span className='text-muted-foreground shrink-0 text-xs'>
              {SEARCH_COPY.deactivated}
            </span>
          ) : null}
        </span>
        {hit.secondary !== '' ? (
          <span className='text-muted-foreground block truncate text-xs'>{hit.secondary}</span>
        ) : null}
      </span>
      {hit.price !== '' ? (
        <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>{hit.price}</span>
      ) : null}
      {hit.group === 'gallery' && hit.thumbUrl !== null ? (
        // The muted thumb slot, the #287 versioned thumb renders into it
        // (D9). alt='': decorative, the identity line names the row.
        <img
          src={hit.thumbUrl}
          alt=''
          className='bg-muted size-7 shrink-0 rounded border object-cover'
        />
      ) : null}
    </Command.Item>
  );
}
