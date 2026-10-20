"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MailRocketLogo } from "@/components/foundations/logo/untitledui-logo";
import { MobileNavigationHeader } from "@/components/application/app-navigation/base-components/mobile-header";
import { NavList } from "@/components/application/app-navigation/base-components/nav-list";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { NAV_ITEMS } from "@/lib/nav/navItems";
import { cx } from "@/utils/cx";

const SIDEBAR_WIDTH = 272;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const sidebarContent = (
    <aside
      style={{ "--width": `${SIDEBAR_WIDTH}px` } as React.CSSProperties}
      className="flex h-full w-full max-w-full flex-col justify-between overflow-auto border-secondary bg-primary pt-4 md:border-r lg:w-(--width) lg:pt-5"
    >
      <div className="flex flex-col gap-4 px-4 lg:px-5">
        <Link href="/">
          <MailRocketLogo />
        </Link>
      </div>

      <NavList activeUrl={pathname ?? undefined} items={NAV_ITEMS} className="flex-1" />

      <div className="mt-auto flex flex-col gap-3 border-t border-secondary px-4 py-4 lg:py-5">
        <div className="flex items-center justify-between">
          <UserMenu />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-dvh bg-secondary_alt">
      {/* Mobile header + slide-out drawer */}
      <MobileNavigationHeader>{sidebarContent}</MobileNavigationHeader>

      {/* Desktop fixed sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex">{sidebarContent}</div>

      <main className={cx("min-h-dvh", "lg:pl-(--width)")} style={{ "--width": `${SIDEBAR_WIDTH}px` } as React.CSSProperties}>
        <div className="mx-auto w-full max-w-(--max-width-container) p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
