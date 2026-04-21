/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as configuration from "../configuration.js";
import type * as http from "../http.js";
import type * as inbound from "../inbound.js";
import type * as knowledge from "../knowledge.js";
import type * as knowledgeActions from "../knowledgeActions.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_defaults from "../lib/defaults.js";
import type * as lib_guardrails from "../lib/guardrails.js";
import type * as lib_knowledge from "../lib/knowledge.js";
import type * as lib_observability from "../lib/observability.js";
import type * as rbac from "../rbac.js";
import type * as users from "../users.js";
import type * as whatsapp from "../whatsapp.js";
import type * as whatsappWebhookEvents from "../whatsappWebhookEvents.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  configuration: typeof configuration;
  http: typeof http;
  inbound: typeof inbound;
  knowledge: typeof knowledge;
  knowledgeActions: typeof knowledgeActions;
  "lib/crypto": typeof lib_crypto;
  "lib/defaults": typeof lib_defaults;
  "lib/guardrails": typeof lib_guardrails;
  "lib/knowledge": typeof lib_knowledge;
  "lib/observability": typeof lib_observability;
  rbac: typeof rbac;
  users: typeof users;
  whatsapp: typeof whatsapp;
  whatsappWebhookEvents: typeof whatsappWebhookEvents;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
