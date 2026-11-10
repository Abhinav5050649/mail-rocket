import { useEffect } from "react";

/**
 * Calls `refetch` whenever the browser tab regains focus. The campaign form
 * links out to create a template, group or subscriber in a new tab; this
 * brings the new one into its pickers as soon as the person comes back,
 * without a reload.
 *
 * @param refetch - The RTK Query `refetch` of the list to refresh.
 */
export function useRefetchOnFocus(refetch: () => unknown) {
  useEffect(() => {
    // Refetching on every focus is cheap: these lists are small and cached between focuses.
    const onFocus = () => void refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch]);
}
