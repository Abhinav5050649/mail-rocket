import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RouteProvider } from "@/providers/router-provider";
import { ThemeModeProvider } from "@/providers/theme";
import { StoreProvider } from "@/lib/redux/StoreProvider";
import { cx } from "@/utils/cx";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Mail Rocket",
  description: "Multi-tenant email campaign management",
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning is required because next-themes sets the
    // light-mode/dark-mode class on <html> before hydration to avoid a flash.
    <html lang="en" suppressHydrationWarning>
      <body className={cx(inter.variable, "bg-primary antialiased")}>
        <RouteProvider>
          <ThemeModeProvider>
            <StoreProvider>{children}</StoreProvider>
          </ThemeModeProvider>
        </RouteProvider>
      </body>
    </html>
  );
}
