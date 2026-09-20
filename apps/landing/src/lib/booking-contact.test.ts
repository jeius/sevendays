import { describe, expect, it } from 'vitest';
import { contactFieldErrors, contactSchema } from './booking';

// The M2 gate, restated as a schema (#99): the confirm button's predicate is
// UNCHANGED — name/email/phone non-empty after trim; notes never gates.
// These tests pin the equivalence with the old inline expression
// (name.trim() !== '' && email.trim() !== '' && phone.trim() !== '') so the
// restyle cannot drift the gate the CDP scenario flips (check 12).
describe('contactSchema (the step-5 gate)', () => {
  it('accepts the three fields filled — the gate opens', () => {
    const result = contactSchema.safeParse({
      name: 'A Customer',
      email: 'customer@example.com',
      phone: '+63 917 000 0000',
      notes: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects all-empty — the gate stays shut', () => {
    const result = contactSchema.safeParse({ name: '', email: '', phone: '', notes: '' });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only fields — trim before the min, like the old predicate', () => {
    const result = contactSchema.safeParse({ name: '   ', email: ' ', phone: '\t', notes: '' });
    expect(result.success).toBe(false);
  });

  it('never gates on notes — any value, long or empty', () => {
    const result = contactSchema.safeParse({
      name: 'A Customer',
      email: 'customer@example.com',
      phone: '+63 917 000 0000',
      notes: 'x'.repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it('carries one message per invalid contact field, in the pinned wording', () => {
    expect(contactFieldErrors({ name: '', email: '', phone: '', notes: '' })).toEqual({
      name: 'Please enter your full name.',
      email: 'Please enter your email — your confirmation goes there.',
      phone: 'Please enter a phone number.',
    });
  });

  it('returns no errors once every contact field is valid', () => {
    expect(
      contactFieldErrors({ name: 'A', email: 'b@example.com', phone: '+63 917', notes: '' })
    ).toEqual({});
  });
});
