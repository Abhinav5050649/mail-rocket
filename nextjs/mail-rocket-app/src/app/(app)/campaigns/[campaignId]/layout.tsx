"use client";

import { use } from "react";
import { RouteTabs } from "@/components/data/RouteTabs";

export default function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);
  const base = `/campaigns/${campaignId}`;

  return (
    <div className="flex flex-col gap-6">
      <RouteTabs
        items={[
          { label: "Overview", href: base, exact: true },
          { label: "Templates", href: `${base}/templates` },
          { label: "Groups", href: `${base}/groups` },
          { label: "Recipients", href: `${base}/recipients` },
        ]}
      />
      {children}
    </div>
  );
}
