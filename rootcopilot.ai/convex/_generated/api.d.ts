/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assistant from "../assistant.js";
import type * as clients from "../clients.js";
import type * as components_ from "../components.js";
import type * as environments from "../environments.js";
import type * as issues from "../issues.js";
import type * as messages from "../messages.js";
import type * as projects from "../projects.js";
import type * as rag from "../rag.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as thread_messages from "../thread_messages.js";
import type * as threads from "../threads.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  assistant: typeof assistant;
  clients: typeof clients;
  components: typeof components_;
  environments: typeof environments;
  issues: typeof issues;
  messages: typeof messages;
  projects: typeof projects;
  rag: typeof rag;
  search: typeof search;
  seed: typeof seed;
  thread_messages: typeof thread_messages;
  threads: typeof threads;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
