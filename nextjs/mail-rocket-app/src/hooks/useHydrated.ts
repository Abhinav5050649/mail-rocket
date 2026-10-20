import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true afterwards. Data that the
 * shell may already have fetched by the time a page's Suspense boundary
 * hydrates (the signed-in key, its claims) must not change that first
 * render, or React reports a hydration mismatch.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
