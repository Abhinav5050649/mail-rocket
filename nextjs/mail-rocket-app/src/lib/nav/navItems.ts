import { AtSign, Building02, FileCode01, Home02, Key01, MarkerPin01, Phone, Send01, User01, Users01 } from "@untitledui/icons";
import type { Subject } from "@/lib/auth/abilities";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hidden unless the signed-in key can `read` this subject. */
  subject?: Subject;
  /** Active only on this exact path. */
  exact?: boolean;
}

export interface NavGroup {
  /** Sentence-case group label; the first group has none. */
  label?: string;
  items: NavItem[];
}

/** Sidebar navigation. One instance serves one organization, so every path is top-level. */
export const NAV_GROUPS: NavGroup[] = [
  { items: [{ label: "Overview", href: "/", icon: Home02, exact: true }] },
  {
    label: "Sending",
    items: [
      { label: "Campaigns", href: "/campaigns", icon: Send01, subject: "Campaign" },
      { label: "Templates", href: "/templates", icon: FileCode01, subject: "Template" },
      { label: "Identities", href: "/identities", icon: AtSign, subject: "Identity" },
    ],
  },
  {
    label: "Audience",
    items: [
      { label: "Groups", href: "/groups", icon: Users01, subject: "Group" },
      { label: "Recipients", href: "/recipients", icon: User01, subject: "Recipient" },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "Profile", href: "/settings", icon: Building02, subject: "Organization", exact: true },
      { label: "Addresses", href: "/addresses", icon: MarkerPin01, subject: "Address" },
      { label: "Contact details", href: "/contact-details", icon: Phone, subject: "ContactDetails" },
      { label: "API keys", href: "/settings/keys", icon: Key01, subject: "Key" },
    ],
  },
];
