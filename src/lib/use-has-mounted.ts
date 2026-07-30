"use client";

import { useSyncExternalStore } from "react";

// Returns false during SSR and the hydration pass, true afterwards.
//
// Several components need to render a placeholder on the server and the real
// thing on the client — the heatmap because bucket date strings depend on the
// host timezone (Workers SSR runs UTC, the browser doesn't), so rendering the
// grid on both sides guarantees a hydration mismatch.
//
// The usual spelling of this is `useState(false)` plus `useEffect(() =>
// setMounted(true), [])`, which works but is a setState synchronously inside an
// effect — an extra render pass, and something the React Compiler lint rules
// flag. `useSyncExternalStore` expresses the same thing directly: it is built to
// return a different value on the server than on the client, which is precisely
// the question being asked.
//
// `subscribe` returns a no-op unsubscribe because the value never changes after
// hydration. The snapshot getters are module-level constants so they are
// referentially stable across renders — React requires getSnapshot to return a
// cached value, and inline arrows would allocate a new function every render.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
