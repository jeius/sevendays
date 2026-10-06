import { describe, expect, it } from 'vitest';
import { auditActionSchema, auditEntitySchema, auditLogRowSchema } from './audit.js';

// The Audit Log row's contract (M6 #185, spec § The Audit Log): the enum
// vocabulary is the spec's own pin; the row schema mirrors packages/db's
// audit_log table 1:1 so #188's reads parse what the write side stores.
// Assertions run on PARSED OUTPUT (zod strips unknown keys — the strip is
// proven by the output's key set, never by expecting a throw).

const fullRow = {
  id: '11111111-2222-4333-8444-555555555555',
  occurredAt: '2026-10-06T12:00:00.000Z',
  actorId: 'better-auth-text-id',
  actorEmail: 'staff@sevendays.test',
  entity: 'service-package',
  entityId: '66666666-7777-4888-9999-000000000000',
  action: 'deactivate',
  summary: 'Graduation Deluxe',
  requestId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
};

describe('auditActionSchema', () => {
  it('accepts exactly the four spec-pinned values', () => {
    for (const action of ['create', 'update', 'deactivate', 'reorder']) {
      expect(auditActionSchema.parse(action)).toBe(action);
    }
  });

  it('rejects anything else — delete is not in the vocabulary', () => {
    expect(auditActionSchema.safeParse('delete').success).toBe(false);
  });
});

describe('auditEntitySchema', () => {
  it('accepts the nine route-segment names', () => {
    for (const entity of [
      'branch',
      'print-size',
      'gallery-photo',
      'attire',
      'addon-service',
      'studio-service',
      'service-package',
      'gallery-category',
      'testimonial',
    ]) {
      expect(auditEntitySchema.parse(entity)).toBe(entity);
    }
  });

  it('rejects names outside the admin write model (appointments are not audited)', () => {
    expect(auditEntitySchema.safeParse('appointment').success).toBe(false);
  });
});

describe('auditLogRowSchema', () => {
  it('round-trips a full row: occurredAt coerced to Date, unknown keys stripped from the output', () => {
    const parsed = auditLogRowSchema.parse({ ...fullRow, sneaky: 'blob' });
    expect(parsed).toEqual({
      id: fullRow.id,
      occurredAt: new Date('2026-10-06T12:00:00.000Z'),
      actorId: fullRow.actorId,
      actorEmail: fullRow.actorEmail,
      entity: fullRow.entity,
      entityId: fullRow.entityId,
      action: fullRow.action,
      summary: fullRow.summary,
      requestId: fullRow.requestId,
    });
    expect('sneaky' in parsed).toBe(false);
  });

  it('entityId and summary are nullable (the order PUTs write null); ids must be uuids and actors non-empty', () => {
    const nullable = auditLogRowSchema.parse({ ...fullRow, entityId: null, summary: null });
    expect(nullable.entityId).toBeNull();
    expect(nullable.summary).toBeNull();
    expect(auditLogRowSchema.safeParse({ ...fullRow, entityId: 'not-a-uuid' }).success).toBe(false);
    expect(auditLogRowSchema.safeParse({ ...fullRow, actorEmail: '' }).success).toBe(false);
  });
});
