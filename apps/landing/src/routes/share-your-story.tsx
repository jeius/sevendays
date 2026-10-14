import { ApiClientError } from '@sevendays/api-client';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import { Label } from '@sevendays/ui/components/label';
import { Textarea } from '@sevendays/ui/components/textarea';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CheckCircle2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { submitTestimonial } from '../lib/api.functions';
import {
  buildTestimonialSubmissionPayload,
  canSubmitTestimonialForm,
  FORM_BOUNDS,
  GENERIC_SEND_FAILURE_LINE,
  type TestimonialFormValues,
  testimonialFormErrors,
} from '../lib/testimonial-form';

export const Route = createFileRoute('/share-your-story')({
  head: () => ({ meta: [{ title: 'Share your story | Sevendays Photography' }] }),
  component: ShareYourStoryPage,
});

// The public testimonial submission page (M7 #216): the #164 prototype
// Round-4-ruled composition (owner-reacted 2026-10-01), ported onto
// today's primitives — #224 upgrades the visual treatment, #217 the
// theme. Quote + person ONLY; the counter and maxLength read the API
// schema's own numbers through FORM_BOUNDS (the spec's 600 bound — the
// prototype's 500 was a pre-spec stub); disabled-until-valid follows the
// spec's min bounds; the hidden honeypot rides the payload verbatim; the
// ruled success panel replaces the form on 201. The 429 line is the
// API's own error string (one source); anything else fails generic. The
// submit stays today's plain disabled vocabulary — #218's pending system
// covers this surface with the rest.
function ShareYourStoryPage() {
  const [values, setValues] = useState<TestimonialFormValues>({
    quote: '',
    person: '',
    website: '',
  });
  // Inline errors after blur-still-invalid (the #58 form-interaction ruling).
  const [touched, setTouched] = useState({ quote: false, person: false });
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const errors = testimonialFormErrors(values);
  const canSubmit = canSubmitTestimonialForm(values) && !sending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmitTestimonialForm(values)) return;
    setSending(true);
    setFailure(null);
    try {
      await submitTestimonial({ data: buildTestimonialSubmissionPayload(values) });
      setSubmitted(true);
    } catch (error) {
      // 429 carries the ruled customer line in the parsed envelope
      // (details.error — the client's .message is prefixed "API <status>:",
      // the documented client split). Everything
      // else (bounds race, network) is the generic catch-all.
      const details = (error as { details?: { error?: unknown } } | undefined)?.details;
      const ruled =
        error instanceof ApiClientError &&
        error.status === 429 &&
        typeof details?.error === 'string'
          ? details.error
          : null;
      setFailure(ruled ?? GENERIC_SEND_FAILURE_LINE);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className='mx-auto max-w-2xl px-6 pt-12 pb-16'>
      <h1 className='font-bold font-serif text-4xl text-brand-ink'>Share your story</h1>
      <p className='mt-3 max-w-prose text-muted-foreground'>
        Shot with us recently? A few words about your session help the next customer choose with
        confidence. Selected stories appear on our About page.
      </p>

      {submitted ? (
        // The ruled success panel (Round 4): the generic answer — the
        // customer cannot tell a stored submission from a honeypot
        // discard, which is exactly the posture.
        <div className='mt-10 flex flex-col items-start gap-4 rounded-xl border border-line-soft bg-card p-6 shadow-sm'>
          <CheckCircle2 className='text-brand-700 size-8' aria-hidden='true' />
          <h2 className='font-semibold font-serif text-2xl text-brand-ink'>
            Thank you — your story is on its way.
          </h2>
          <p className='text-muted-foreground'>
            We read every submission. If we share yours, it appears with your name on the About
            page.
          </p>
          <Link to='/' className={cn(buttonVariants({ variant: 'outline' }))}>
            Back to home
          </Link>
        </div>
      ) : (
        <form className='mt-8 flex flex-col gap-5' onSubmit={handleSubmit}>
          <div>
            <Label htmlFor='story-quote'>Your experience</Label>
            <Textarea
              id='story-quote'
              value={values.quote}
              onChange={(e) => setValues({ ...values, quote: e.target.value })}
              onBlur={() => setTouched({ ...touched, quote: true })}
              required
              maxLength={FORM_BOUNDS.quoteMax}
              rows={5}
              placeholder='What was your session like?'
              className='mt-1.5'
            />
            <p className='text-muted-foreground mt-1 text-xs'>
              {values.quote.length}/{FORM_BOUNDS.quoteMax}
            </p>
            {touched.quote && errors.quote ? (
              <p className='text-destructive mt-1 text-sm' role='alert'>
                {errors.quote}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor='story-person'>Your name</Label>
            <Input
              id='story-person'
              type='text'
              value={values.person}
              onChange={(e) => setValues({ ...values, person: e.target.value })}
              onBlur={() => setTouched({ ...touched, person: true })}
              required
              maxLength={FORM_BOUNDS.personMax}
              placeholder='How should we credit you?'
              className='mt-1.5'
            />
            {touched.person && errors.person ? (
              <p className='text-destructive mt-1 text-sm' role='alert'>
                {errors.person}
              </p>
            ) : null}
          </div>
          {/* Honeypot: invisible to humans, irresistible to bots — the
              API's silent discard is the real gate (a filled 'website'
              answers the success shape and never reaches the database). */}
          <div aria-hidden='true' className='absolute h-0 w-0 overflow-hidden opacity-0'>
            <Label htmlFor='story-website'>Website</Label>
            <Input
              id='story-website'
              type='text'
              tabIndex={-1}
              autoComplete='off'
              value={values.website}
              onChange={(e) => setValues({ ...values, website: e.target.value })}
            />
          </div>
          {failure ? (
            <p className='text-destructive text-sm' role='alert'>
              {failure}
            </p>
          ) : null}
          <div className='mt-2 flex items-center gap-3'>
            <button
              type='submit'
              disabled={!canSubmit}
              className={cn(buttonVariants(), 'self-start disabled:opacity-50')}
            >
              Send my story
            </button>
            <Link
              to='/about'
              className='text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground'
            >
              Back to About
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
