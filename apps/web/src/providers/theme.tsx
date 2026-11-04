"use client";

import { ThemeProvider } from "next-themes";

/** Dark mode is toggled via a `dark-mode`/`light-mode` class on <html>, matching Untitled UI's theme.css tokens. */
export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" value={{ light: "light-mode", dark: "dark-mode" }} enableSystem>
      {children}
    </ThemeProvider>
  );
}
