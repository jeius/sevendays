import type { Branch, StudioServiceWithBranches } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { bookableBranchNames } from './bookable-branches';

function branch(name: string): Branch {
  return {
    id: crypto.randomUUID(),
    name,
    address: 'test address',
    phone: '+63 900 000 000',
    acceptsWalkIns: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function service(bookableBranchIds: string[]): StudioServiceWithBranches {
  return {
    id: crypto.randomUUID(),
    name: 'Photo Recovery',
    description: 'test service',
    priceCents: 150000,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    bookableBranchIds,
    applicableAddonServiceIds: [],
  };
}

// The three live branches, in the API's name-ascending order.
const CALAMBA = branch('Calamba Main Branch');
const ILIGAN = branch('Iligan Branch');
const DIPOLOG = branch('Dipolog Branch');
const BRANCHES = [CALAMBA, ILIGAN, DIPOLOG];

describe('bookableBranchNames', () => {
  it('orders chip names by the branches read, not the service id order', () => {
    const s = service([DIPOLOG.id, CALAMBA.id]);
    expect(bookableBranchNames(s, BRANCHES)).toEqual(['Calamba Main Branch', 'Dipolog Branch']);
  });

  it('drops ids absent from the branches list (never rendered)', () => {
    const s = service([CALAMBA.id, crypto.randomUUID()]);
    expect(bookableBranchNames(s, BRANCHES)).toEqual(['Calamba Main Branch']);
  });

  it('empty bookability renders no chips', () => {
    expect(bookableBranchNames(service([]), BRANCHES)).toEqual([]);
  });

  it('all three branches render all three names in list order', () => {
    const s = service([DIPOLOG.id, ILIGAN.id, CALAMBA.id]);
    expect(bookableBranchNames(s, BRANCHES)).toEqual([
      'Calamba Main Branch',
      'Iligan Branch',
      'Dipolog Branch',
    ]);
  });
});
