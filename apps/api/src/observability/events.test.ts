import { afterEach, describe, expect, it, vi } from 'vitest';
import { logAccess, logEmail, logMediaFailure } from './events.js';
import { createRequestLogger } from './logger.js';

// The sink seam: every event lands on console.log as ONE JSON string (the
// pino/browser write inside logger.ts) — tests capture that string and parse
// it, so assertions run against exactly what `wrangler tail` would show.
const captureLines = () => {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(String(args[0]));
  });
  return lines;
};

const parse = (lines: string[]) =>
  lines.map((line) => JSON.parse(line) as Record<string, unknown>);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('event classes — enumerated field schemas (spec #175)', () => {
  it('access: exactly the ruled keys at info; actorId omitted when the session did not verify', () => {
    const lines = captureLines();
    logAccess(createRequestLogger('req-unit-1'), {
      method: 'GET',
      route: '/api/v1/branches',
      status: 200,
      durationMs: 5,
    });
    expect(lines).toHaveLength(1);
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'durationMs',
      'evt',
      'level',
      'method',
      'msg',
      'requestId',
      'route',
      'status',
      'time',
    ]);
    expect(line.evt).toBe('access');
    expect(line.requestId).toBe('req-unit-1');
    expect(line.route).toBe('/api/v1/branches');
    expect(line.status).toBe(200);
    expect(line.durationMs).toBe(5);
    expect(line.level).toBe(30); // pino info
  });

  it('access: actorId rides only when passed (the verified-session case)', () => {
    const lines = captureLines();
    logAccess(createRequestLogger('req-unit-2'), {
      method: 'GET',
      route: '/api/v1/admin/branches',
      status: 200,
      durationMs: 7,
      actorId: 'user-1',
    });
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line)).toContain('actorId');
    expect(line.actorId).toBe('user-1');
  });

  it('media_failure: exactly op + reason at warn', () => {
    const lines = captureLines();
    logMediaFailure(createRequestLogger('req-unit-3'), {
      op: 'commit',
      reason: 'cap_violation',
    });
    expect(lines).toHaveLength(1);
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'evt',
      'level',
      'msg',
      'op',
      'reason',
      'requestId',
      'time',
    ]);
    expect(line.evt).toBe('media_failure');
    expect(line.op).toBe('commit');
    expect(line.reason).toBe('cap_violation');
    expect(line.level).toBe(40); // pino warn
  });

  it('email attempt: exactly phase + appointmentId at info', () => {
    const lines = captureLines();
    logEmail(createRequestLogger('req-unit-4'), {
      phase: 'attempt',
      appointmentId: 'apt-1',
    });
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'appointmentId',
      'evt',
      'level',
      'msg',
      'phase',
      'requestId',
      'time',
    ]);
    expect(line.evt).toBe('email');
    expect(line.phase).toBe('attempt');
    expect(line.appointmentId).toBe('apt-1');
    expect(line.level).toBe(30);
  });

  it('email sent: same schema as attempt, phase flipped', () => {
    const lines = captureLines();
    logEmail(createRequestLogger('req-unit-5'), {
      phase: 'sent',
      appointmentId: 'apt-1',
    });
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'appointmentId',
      'evt',
      'level',
      'msg',
      'phase',
      'requestId',
      'time',
    ]);
    expect(line.phase).toBe('sent');
  });

  it('email failed: code rides, at error level', () => {
    const lines = captureLines();
    logEmail(createRequestLogger('req-unit-6'), {
      phase: 'failed',
      appointmentId: 'apt-1',
      code: 'resend:internal_server_error',
    });
    const [line] = parse(lines);
    if (!line) throw new Error('expected one parsed line');
    expect(Object.keys(line).sort()).toEqual([
      'appointmentId',
      'code',
      'evt',
      'level',
      'msg',
      'phase',
      'requestId',
      'time',
    ]);
    expect(line.phase).toBe('failed');
    expect(line.code).toBe('resend:internal_server_error');
    expect(line.level).toBe(50); // pino error
  });

  it('one request child stamps the same requestId on every event it emits', () => {
    const lines = captureLines();
    const log = createRequestLogger('req-unit-7');
    logAccess(log, { method: 'POST', route: '/api/v1/appointments', status: 201, durationMs: 12 });
    logEmail(log, { phase: 'sent', appointmentId: 'apt-9' });
    const parsed = parse(lines);
    expect(parsed).toHaveLength(2);
    expect(new Set(parsed.map((line) => line.requestId))).toEqual(new Set(['req-unit-7']));
  });
});
