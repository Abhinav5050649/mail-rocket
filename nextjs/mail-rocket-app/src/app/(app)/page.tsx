"use client";

import Link from "next/link";
import { useGetOrganizationQuery } from "@/features/organizations";
import { NAV_ITEMS } from "@/lib/nav/navItems";

export default function DashboardPage() {
  const { data: organization } = useGetOrganizationQuery();
  const items = NAV_ITEMS.filter((item) => item.label !== "Dashboard");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-primary">{organization?.name || "Dashboard"}</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon!;
          return (
            <Link
              key={item.label}
              href={item.href!}
              className="flex flex-col items-center gap-2 rounded-xl bg-primary p-5 text-center ring-1 ring-secondary transition duration-100 ease-linear hover:bg-secondary"
            >
              <Icon className="size-6 text-fg-brand-primary" />
              <span className="text-sm font-medium text-secondary">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
