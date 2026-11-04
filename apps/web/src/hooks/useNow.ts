"use client";

import { useEffect, useState } from "react";

/** The current time, refreshed every `intervalMs`, so "in 2 h" style labels stay true while a page is open. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
