// The Site tab (M7 #215, moved verbatim at #221 when the Settings screen
// became the three-tab strip): the all-staff singleton editor — ONE
// full-object save, unset fields fall back to the defaults pinned in
// packages/types. The Save button moved from the screen header to this
// tab's footer when the header stopped being Site-only; its shape is
// otherwise the #215 build's.
import type {
  MediaPresignRequest,
  MediaPresignResponse,
  SaveSiteSettingsInput,
} from '@sevendays/types';
import { SITE_SETTINGS_DEFAULTS } from '@sevendays/types';
import { Button } from '@sevendays/ui/components/button';
import { Card, CardContent } from '@sevendays/ui/components/card';
import { Checkbox } from '@sevendays/ui/components/checkbox';
import { Input } from '@sevendays/ui/components/input';
import { Skeleton } from '@sevendays/ui/components/skeleton';
import { toast } from '@sevendays/ui/components/sonner';
import { Textarea } from '@sevendays/ui/components/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QUERY_ERROR_LINE, QueryErrorState } from '#/components/cms/shared';
import { presignAdminCoverUpload, saveAdminSiteSettings } from '#/lib/admin.functions';
import { siteSettingsQuery } from '#/lib/cms-queries';
import { type CoverUploadStatus, uploadCover } from '#/lib/cover-upload';
import {
  buildSiteSettingsSavePayload,
  fieldErrorsFromDetails,
  type SiteSettingsEditorState,
  type SiteSettingsFieldErrors,
  siteSettingsStateFromRead,
  validateSiteSettingsState,
} from '#/lib/site-settings-state';

// The keyed field lists the Cards walk (wire-order; keys are the seam's).
type TextKeys = {
  [K in keyof SiteSettingsEditorState]: SiteSettingsEditorState[K] extends string ? K : never;
}[keyof SiteSettingsEditorState];

const PAGE_SECTIONS: { title: string; fields: { key: TextKeys; label: string }[] }[] = [
  {
    title: 'Home',
    fields: [
      { key: 'homeTitle', label: 'Headline' },
      { key: 'homeDescription', label: 'Blurb' },
    ],
  },
  {
    title: 'Packages',
    fields: [
      { key: 'packagesTitle', label: 'Title' },
      { key: 'packagesDescription', label: 'Description' },
    ],
  },
  {
    title: 'Branches',
    fields: [
      { key: 'branchesTitle', label: 'Title' },
      { key: 'branchesDescription', label: 'Description' },
    ],
  },
  {
    title: 'Services',
    fields: [
      { key: 'servicesTitle', label: 'Title' },
      { key: 'servicesDescription', label: 'Description' },
    ],
  },
  {
    title: 'About',
    fields: [
      { key: 'aboutTitle', label: 'Title' },
      { key: 'aboutDescription', label: 'Description' },
    ],
  },
];

const KICKER_FIELDS: { key: TextKeys; label: string }[] = [
  { key: 'kickerGallery', label: 'Gallery kicker' },
  { key: 'kickerPackages', label: 'Featured packages kicker' },
  { key: 'kickerServices', label: 'Services kicker' },
  { key: 'kickerTestimonials', label: 'Testimonials kicker' },
];

const SOCIAL_FIELDS: { key: TextKeys; label: string }[] = [
  { key: 'socialInstagram', label: 'Instagram URL' },
  { key: 'socialFacebook', label: 'Facebook URL' },
  { key: 'socialTiktok', label: 'TikTok URL' },
];

// The compact row (the ruled variant C): the label right-aligned in a
// 10rem column, the control filling the rest — no per-field hints.
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='grid grid-cols-[10rem_1fr] items-center gap-x-3 gap-y-1'>
      <span className='text-muted-foreground text-right text-xs'>{label}</span>
      {children}
    </div>
  );
}

export function SiteTab() {
  const queryClient = useQueryClient();
  const { data: settings, isPending, isError, refetch } = useQuery(siteSettingsQuery.all());
  const [editorState, setEditorState] = useState<SiteSettingsEditorState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SiteSettingsFieldErrors>({});

  // The logo loop (M7 #215 — the #214 Cover card ported to the 'site-logo'
  // purpose): presign → XHR PUT → the staging key rides the NEXT save.
  const [logoStatus, setLogoStatus] = useState<CoverUploadStatus>({ phase: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const logoUploading = logoStatus.phase === 'presigning' || logoStatus.phase === 'uploading';

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // Seed the editor once the read lands; a later refetch never clobbers
  // in-progress edits (the editor is the source of truth once loaded).
  if (settings && editorState === null) {
    setEditorState(siteSettingsStateFromRead(settings));
  }

  async function presign(req: MediaPresignRequest): Promise<MediaPresignResponse> {
    const result = await presignAdminCoverUpload({ data: req });
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.data;
  }

  function handleLogoStatus(next: CoverUploadStatus) {
    setLogoStatus(next);
    if (next.phase === 'bound') {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = next.previewUrl;
      setEditorState((prev) => (prev ? { ...prev, logoImageKey: next.stagingKey } : prev));
    }
  }

  async function startLogoUpload(file: File) {
    try {
      await uploadCover(file, presign, handleLogoStatus, 'site-logo');
    } catch {
      // XHR error/abort already emitted `failed` through onStatus.
    }
  }

  function removeLogo() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setLogoStatus({ phase: 'idle' });
    // Three-state encoding: null = explicit clear on the next save.
    setEditorState((prev) => (prev ? { ...prev, logoImageKey: null } : prev));
  }

  const save = useMutation({
    mutationFn: (payload: SaveSiteSettingsInput) => saveAdminSiteSettings({ data: payload }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Saved.');
        queryClient.setQueryData(siteSettingsQuery.all().queryKey, result.data);
        // Re-seed from the saved read: the tri-state resets to unchanged
        // and a just-bound logo previews from its stored URL.
        setEditorState(siteSettingsStateFromRead(result.data));
        setLogoStatus({ phase: 'idle' });
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
      } else {
        setFieldErrors(fieldErrorsFromDetails(result.details));
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isError) {
    return (
      <div className='space-y-6'>
        <QueryErrorState line={QUERY_ERROR_LINE} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isPending || editorState === null) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-40 w-full' />
        <Skeleton className='h-64 w-full' />
        <Skeleton className='h-40 w-full' />
      </div>
    );
  }

  function setField(key: TextKeys, value: string) {
    setEditorState((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  // Arrow consts (not hoisted fn declarations): created after the early
  // returns, so `editorState`'s non-null narrowing holds inside them.
  const textField = (key: TextKeys, label: string, placeholder?: string) => (
    <Row key={key} label={label}>
      <Input
        aria-label={label}
        className='h-8 text-sm'
        value={editorState[key]}
        placeholder={placeholder}
        onChange={(e) => setField(key, e.target.value)}
      />
      {fieldErrors[key] ? (
        <p className='col-start-2 text-destructive text-xs'>{fieldErrors[key]}</p>
      ) : null}
    </Row>
  );

  const handleSave = () => {
    const errors = validateSiteSettingsState(editorState);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Fix the highlighted fields.');
      return;
    }
    save.mutate(buildSiteSettingsSavePayload(editorState));
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Brand</h2>
          {textField('brandName', 'Brand name', SITE_SETTINGS_DEFAULTS.brandName ?? undefined)}
          {textField('brandTagline', 'Tagline', SITE_SETTINGS_DEFAULTS.brandTagline ?? undefined)}
          <Row label='Logo'>
            <div className='flex items-center gap-2'>
              {/* Preview precedence (the packages editor's law): a fresh bound
                  upload shows the local object URL; a pending removal shows the
                  placeholder; else the read's logoImageUrl; else the placeholder. */}
              {logoStatus.phase === 'bound' ? (
                <img
                  src={logoStatus.previewUrl}
                  alt={`${editorState.brandName || 'Studio'} logo`}
                  className='bg-muted grid size-10 place-items-center rounded-md object-contain p-1'
                />
              ) : editorState.logoImageKey === null ? (
                <div className='bg-muted text-muted-foreground grid size-10 place-items-center rounded-md'>
                  <Image aria-hidden='true' className='size-4' />
                </div>
              ) : editorState.logoImageUrl ? (
                <img
                  src={editorState.logoImageUrl}
                  alt={`${editorState.brandName || 'Studio'} logo`}
                  className='bg-muted size-10 rounded-md object-contain p-1'
                />
              ) : (
                <div className='bg-muted text-muted-foreground grid size-10 place-items-center rounded-md'>
                  <Image aria-hidden='true' className='size-4' />
                </div>
              )}
              <input
                ref={fileInputRef}
                type='file'
                accept='image/jpeg'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) {
                    void startLogoUpload(file);
                  }
                }}
              />
              <Button
                variant='outline'
                size='sm'
                type='button'
                disabled={logoUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
              <Button
                variant='ghost'
                size='sm'
                type='button'
                disabled={logoUploading}
                onClick={removeLogo}
              >
                Remove
              </Button>
            </div>
          </Row>
          {logoStatus.phase === 'presigning' ? (
            <p className='text-muted-foreground text-xs'>Presigning…</p>
          ) : null}
          {logoStatus.phase === 'uploading' ? (
            <p className='text-muted-foreground text-xs'>
              Uploading…{' '}
              {logoStatus.total > 0 ? Math.round((logoStatus.sent / logoStatus.total) * 100) : 0}%
            </p>
          ) : null}
          {logoStatus.phase === 'bound' ? (
            <p className='text-muted-foreground text-xs'>Logo ready — save to bind it.</p>
          ) : null}
          {logoStatus.phase === 'failed' ? (
            <p className='text-destructive text-xs'>Upload failed: {logoStatus.message}</p>
          ) : null}
          <p className='text-muted-foreground text-xs'>JPG only, up to 50 MiB.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Pages</h2>
          {PAGE_SECTIONS.map((section) => (
            <div
              key={section.title}
              className='space-y-1.5'
              role='group'
              aria-label={section.title}
            >
              <p className='text-muted-foreground pt-2 text-xs font-medium uppercase tracking-wide'>
                {section.title}
              </p>
              {section.fields.map((field) => textField(field.key, field.label))}
            </div>
          ))}
          <Row label='About story'>
            <Textarea
              aria-label='About story'
              rows={4}
              className='text-sm'
              value={editorState.aboutStory}
              placeholder={SITE_SETTINGS_DEFAULTS.aboutStory ?? undefined}
              onChange={(e) => setField('aboutStory', e.target.value)}
            />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Home kickers</h2>
          {KICKER_FIELDS.map((field) =>
            textField(
              field.key,
              field.label.replace(' kicker', ''),
              SITE_SETTINGS_DEFAULTS[field.key] ?? undefined
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Banner & social</h2>
          <Row label='Banner active'>
            <label htmlFor='bannerIsActive-input' className='flex items-center gap-2 text-sm'>
              <Checkbox
                id='bannerIsActive-input'
                checked={editorState.bannerIsActive}
                onCheckedChange={(checked) =>
                  setEditorState({ ...editorState, bannerIsActive: checked === true })
                }
              />
              Show the announcement banner
            </label>
          </Row>
          {textField('bannerTitle', 'Banner title')}
          {textField('bannerBody', 'Banner text')}
          {SOCIAL_FIELDS.map((field) => textField(field.key, field.label, 'https://…'))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className='space-y-1.5'>
          <h2 className='text-sm font-semibold'>Contact</h2>
          {textField('contactEmail', 'Studio email')}
          {textField('contactPhone', 'Studio phone')}
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button type='button' onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
