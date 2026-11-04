"use client";

import * as React from "react";
import { Provider } from "react-redux";
import { makeStore } from "./store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Lazy useState initializer (not useRef) so the store isn't read/written
  // during render - created once per mount so each request/browser tab in
  // App Router SSR gets its own store instance.
  const [store] = React.useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
}
