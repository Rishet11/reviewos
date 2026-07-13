import type { WidgetState } from "./types";

export type Store = {
  getState: () => WidgetState;
  setState: (patch: Partial<WidgetState>) => void;
  subscribe: (fn: () => void) => () => void;
};

export function createStore(initial: WidgetState): Store {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState(patch) {
      state = { ...state, ...patch };
      listeners.forEach((fn) => fn());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
