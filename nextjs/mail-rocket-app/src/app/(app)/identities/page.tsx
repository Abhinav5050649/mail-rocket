"use client";

import { Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { PageHeader, Tabs } from "@/components/ui/page";
import { IdentityStatusPill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/feedback";
import { Select } from "@/components/ui/field";
import { Can } from "@/components/auth/Can";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useGetIdentitiesQuery } from "@/features/identities";
import { useGetOverviewQuery } from "@/features/overview";
import { formatDate } from "@/lib/format";
import type { Identity, IdentityStatus, IdentityType } from "@/types/resources";

const STATUS_TABS: { value: IdentityStatus; label: string }[] = [
  { value: "active", label: "Verified" },
  { value: "pending", label: "Awaiting verification" },
  { value: "created", label: "Created" },
];

export default function IdentitiesPage() {
  const { limit, offset, searchParams, setOffset, setFilter } = usePaginationParams();
  const status = (searchParams.get("status") as IdentityStatus | null) ?? undefined;
  const type = (searchParams.get("type") as IdentityType | null) ?? undefined;

  const { data: identities, isLoading, error, refetch } = useGetIdentitiesQuery({ status, type, limit, offset });
  const { data: overview } = useGetOverviewQuery();
  const counts = overview?.identities;

  /** Keeps the type filter when switching status tabs. */
  const tabHref = (value?: IdentityStatus) => {
    const params = new URLSearchParams();
    if (value) params.set("status", value);
    if (type) params.set("type", type);
    const query = params.toString();
    return query ? `/identities?${query}` : "/identities";
  };

  const action = (
    <Can I="create" a="Identity">
      <Button href="/identities/new" variant="primary" icon={Plus}>
        Add identity
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Identities" description="Domains and email addresses campaigns send from. SES has to verify each one before it can send." actions={action} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          label="Filter by status"
          className="min-w-0 flex-1"
          items={[
            { label: "All", href: tabHref(), count: counts?.total, active: !status },
            ...STATUS_TABS.map((tab) => ({ label: tab.label, href: tabHref(tab.value), count: counts?.by_status[tab.value], active: status === tab.value })),
          ]}
        />
        <Select
          aria-label="Filter by type"
          className="h-8 w-40"
          value={type ?? ""}
          onChange={(event) => setFilter("type", event.target.value || undefined)}
          options={[
            { label: "Domains and emails", value: "" },
            { label: "Domains", value: "domain" },
            { label: "Email addresses", value: "email" },
          ]}
        />
      </div>

      <div>
        <DataTable<Identity>
          noun="identities"
          rows={identities}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          href={(identity) => `/identities/${identity.id}`}
          columns={[
            { header: "Identity", cell: (identity) => identity.identity, className: "w-[42%]" },
            { header: "Type", cell: (identity) => (identity.type === "domain" ? "Domain" : "Email address"), className: "text-muted" },
            { header: "Status", cell: (identity) => <IdentityStatusPill status={identity.status} />, className: "w-52" },
            { header: "Added", cell: (identity) => <span className="tabular">{formatDate(identity.created_at)}</span>, align: "right", className: "w-36" },
          ]}
          mobile={{
            title: (identity) => identity.identity,
            subtitle: (identity) => (identity.type === "domain" ? "Domain" : "Email address"),
            trailing: (identity) => <IdentityStatusPill status={identity.status} />,
          }}
          empty={
            <EmptyState title={status || type ? "No identities match these filters" : "No identities yet"} action={!status && !type ? action : undefined}>
              {status || type ? "Try another status or type." : "Add a domain (send from any address on it) or a single email address."}
            </EmptyState>
          }
        />
        <Pagination noun="identities" limit={limit} offset={offset} rowCount={identities?.length ?? 0} onOffsetChange={setOffset} />
      </div>
    </div>
  );
}
