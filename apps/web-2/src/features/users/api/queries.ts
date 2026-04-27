// ============================================================
// User Queries — Placeholder
// ============================================================
// TanStack Query has been removed. This file now exports types only.
// These will be replaced with Convex queries during the wiring phase.
// ============================================================

import type { User, UserFilters } from './types';

export type { User };

export const userKeys = {
  all: ['users'] as const,
  list: (filters: UserFilters) => [...userKeys.all, 'list', filters] as const,
  detail: (id: number) => [...userKeys.all, 'detail', id] as const
};
