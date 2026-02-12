/**
 * Re-exports from @rocicorp/zero.
 * This package is the single consumer of @rocicorp/zero to avoid multiple instances.
 */
export type { Zero } from "@rocicorp/zero";
export {
  defineMutator,
  defineMutators,
  defineQueries,
  defineQuery,
  mustGetMutator,
  mustGetQuery,
} from "@rocicorp/zero";
