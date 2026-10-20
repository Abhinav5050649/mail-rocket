"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { useTheme } from "next-themes";
import { Key01, LogOut01, Menu02, Monitor01, Moon01, Sun, XClose } from "@untitledui/icons";
import { Logo } from "@/components/ui/logo";
import { Menu } from "@/components/ui/overlay";
import { IconButton } from "@/components/ui/button";
import { NAV_GROUPS } from "@/lib/nav/navItems";
import { useAbility } from "@/hooks/useAbility";
import { useGetMeQuery } from "@/features/session";
import { useSignoutMutation } from "@/features/auth";
import { useGetOrganizationQuery } from "@/features/organizations";
import { apiSlice } from "@/lib/redux/api/apiSlice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { capitalize } from "@/lib/format";
import { cx } from "@/utils/cx";

/**
 * Framed sheet shell. The sidebar and the 48px top bar share the tinted
 * frame with no rule between them; the page sits on a white sheet inset 8px
 * from the window's right and bottom edges. Below `lg` the frame drops away:
 * the sheet is the screen and the nav opens as a full-screen panel.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the phone nav whenever the route changes.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-frame lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col lg:flex">
        <SidebarContent />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 bg-frame px-3 lg:static lg:px-2 lg:pr-4">
          <IconButton icon={Menu02} label="Open navigation" className="lg:hidden" onClick={() => setNavOpen(true)} />
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <OrganizationScope />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>

        <main className="flex-1 bg-sheet lg:mr-2 lg:mb-2 lg:rounded-sheet lg:border lg:border-border">
          <div className="mx-auto w-full max-w-[1240px] px-5 pt-5 pb-16 sm:px-6 lg:px-8 lg:pt-7">{children}</div>
        </main>
      </div>

      <ModalOverlay isOpen={navOpen} onOpenChange={setNavOpen} isDismissable className="fixed inset-0 z-50 bg-(--scrim) lg:hidden">
        <Modal className="h-full w-[min(320px,100%)] bg-frame data-entering:animate-in data-entering:slide-in-from-left">
          <Dialog aria-label="Navigation" className="flex h-full flex-col outline-none">
            <div className="absolute top-2 right-2">
              <IconButton icon={XClose} label="Close navigation" onClick={() => setNavOpen(false)} />
            </div>
            <SidebarContent />
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}

/** Logo, then the navigation groups the key may see. */
function SidebarContent() {
  const pathname = usePathname();
  const { ability, isLoading } = useAbility();

  return (
    <>
      <div className="flex h-12 shrink-0 items-center px-4">
        <Link href="/" className="rounded-control">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 pt-3 pb-6">
        {NAV_GROUPS.map((group, index) => {
          // Wait for the key's claims before deciding what to hide, so items don't flash in and out.
          const items = group.items.filter((item) => !item.subject || (!isLoading && ability.can("read", item.subject)));
          if (items.length === 0) return null;
          return (
            <div key={group.label ?? index} className="flex flex-col gap-px">
              {group.label && <p className="px-2.5 pb-1.5 text-xs text-muted">{group.label}</p>}
              {items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex h-8 items-center gap-2.5 rounded-control px-2.5 text-sm transition-colors duration-150",
                      active ? "bg-active font-medium text-text" : "text-muted hover:bg-active/60 hover:text-text",
                    )}
                  >
                    <item.icon className={cx("size-4 shrink-0", active ? "text-text" : "text-faint")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </>
  );
}

/** The organization this instance belongs to - the scope of everything on screen. */
function OrganizationScope() {
  const { ability } = useAbility();
  const canRead = ability.can("read", "Organization");
  const { data: organization } = useGetOrganizationQuery(undefined, { skip: !canRead });
  if (!organization?.name) return null;

  return (
    <Link
      href="/settings"
      className="hidden h-8 items-center gap-2 truncate rounded-control px-2 text-sm text-muted transition-colors hover:bg-active/60 hover:text-text sm:flex"
    >
      {organization.name}
    </Link>
  );
}

const THEME_ORDER = ["system", "light", "dark"] as const;
const THEME_ICON = { light: Sun, dark: Moon01, system: Monitor01 } as const;
const THEME_LABEL = { light: "Light theme", dark: "Dark theme", system: "System theme" } as const;

/** Cycles system → light → dark. Renders the system icon until mounted to avoid a hydration mismatch. */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const current = mounted ? ((theme as (typeof THEME_ORDER)[number]) ?? "system") : "system";
  const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];

  return <IconButton icon={THEME_ICON[current]} label={`${THEME_LABEL[current]} (switch to ${next})`} onClick={() => setTheme(next)} />;
}

/** The signed-in API key (there are no user accounts), with keys and sign-out. */
function AccountMenu() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: me } = useGetMeQuery();
  const [signout] = useSignoutMutation();

  const handleAction = async (id: string) => {
    if (id === "keys") router.push("/settings/keys");
    if (id === "sign-out") {
      await signout();
      // Drop every cached query so the next sign-in never shows data fetched with this key.
      dispatch(apiSlice.util.resetApiState());
      router.push("/login");
    }
  };

  return (
    <Menu
      triggerLabel="Account"
      triggerClassName="flex h-8 max-w-56 items-center gap-2 rounded-control px-2 transition-colors hover:bg-active/60"
      trigger={
        <>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-active">
            <Key01 className="size-3.5 text-muted" />
          </span>
          <span className="hidden min-w-0 flex-col text-left sm:flex">
            <span className="truncate text-sm leading-4 font-medium text-text">{me?.name ?? "…"}</span>
            <span className="truncate text-xs leading-4 text-muted">{me ? (me.preset ? capitalize(me.preset) : "Custom claims") : " "}</span>
          </span>
        </>
      }
      items={[
        { id: "keys", label: "API keys", icon: Key01 },
        { id: "sign-out", label: "Sign out", icon: LogOut01, separated: true },
      ]}
      onAction={handleAction}
    />
  );
}
