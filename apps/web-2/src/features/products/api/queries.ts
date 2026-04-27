// ============================================================
// Product Queries — Placeholder
// ============================================================
// TanStack Query has been removed. This file now exports types only.
// These will be replaced with Convex queries during the wiring phase.
// ============================================================

import type { Product, ProductFilters } from './types';

export type { Product };

export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters) => [...productKeys.all, 'list', filters] as const,
  detail: (id: number) => [...productKeys.all, 'detail', id] as const
};
