// ============================================================
// User Mutations — Placeholder
// ============================================================
// TanStack Query has been removed. This file is a placeholder.
// These will be replaced with Convex mutations during the wiring phase.
// ============================================================

import { createUser, updateUser, deleteUser } from './service';
import type { UserMutationPayload } from './types';

// Re-export service functions directly for components that still reference mutations.
// During wiring phase, these will become Convex mutations.
export { createUser, updateUser, deleteUser };
export type { UserMutationPayload };
