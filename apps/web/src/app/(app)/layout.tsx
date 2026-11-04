import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";

/**
 * Pages here are static routes (no `[orgId]` segment any more), so Next
 * prerenders them - and any page reading `useSearchParams()` (e.g. via
 * `usePaginationParams`) must sit under a Suspense boundary to do so.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Suspense>{children}</Suspense>
    </AppShell>
  );
}
