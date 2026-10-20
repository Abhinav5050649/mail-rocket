import {
  BarChart03,
  Building07,
  Contrast01,
  Home02,
  Key01,
  Mail01,
  Settings01,
  Shield01,
  Users01,
  UserSquare,
} from "@untitledui/icons";
import type { NavItemType } from "@/components/application/app-navigation/config";

/** Subset of items surfaced in the mobile bottom row/quick links - keep this short. */
export const PRIMARY_NAV_LABELS = ["Dashboard", "Campaigns", "Templates", "Recipients"];

/** Sidebar items. One instance serves one organization, so every path is top-level. */
export const NAV_ITEMS: NavItemType[] = [
  { label: "Dashboard", href: "/", icon: Home02 },
  { label: "Campaigns", href: "/campaigns", icon: BarChart03 },
  { label: "Templates", href: "/templates", icon: Mail01 },
  { label: "Groups", href: "/groups", icon: Users01 },
  { label: "Recipients", href: "/recipients", icon: UserSquare },
  { label: "Identities", href: "/identities", icon: Shield01 },
  { label: "Addresses", href: "/addresses", icon: Building07 },
  { label: "Contact details", href: "/contact-details", icon: Contrast01 },
  { label: "API keys", href: "/settings/keys", icon: Key01 },
  { label: "Settings", href: "/settings", icon: Settings01 },
];
