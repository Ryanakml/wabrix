// ============================================================
// Product Mutations — Placeholder
// ============================================================
// TanStack Query has been removed. This file is a placeholder.
// These will be replaced with Convex mutations during the wiring phase.
// ============================================================

import { createProduct, updateProduct, deleteProduct } from './service';
import type { ProductMutationPayload } from './types';

// Re-export service functions directly for components that still reference mutations.
// During wiring phase, these will become Convex mutations.
export { createProduct, updateProduct, deleteProduct };
export type { ProductMutationPayload };
