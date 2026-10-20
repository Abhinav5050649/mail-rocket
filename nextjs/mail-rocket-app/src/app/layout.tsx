import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { RouteProvider } from "@/providers/router-provider";
import { ThemeModeProvider } from "@/providers/theme";
import { StoreProvider } from "@/lib/redux/StoreProvider";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-sans",
});

/** Second face, one job: API keys, DNS records, IDs and template HTML. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: { default: "Mail Rocket", template: "%s · Mail Rocket" },
  description: "Schedule and send email campaigns through your own AWS SES account.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff3f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1212" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning is required because next-themes sets the
    // light-mode/dark-mode class on <html> before hydration to avoid a flash.
    <html lang="en" suppressHydrationWarning className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <RouteProvider>
          <ThemeModeProvider>
            <StoreProvider>{children}</StoreProvider>
          </ThemeModeProvider>
        </RouteProvider>
      </body>
    </html>
  );
}
