"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Plus } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { Card, CardLink, Dash, PageHeader } from "@/components/ui/page";
import { CampaignStatusPill, Pill } from "@/components/ui/pill";
import { EmptyState, ErrorNotice, Skeleton } from "@/components/ui/feedback";
import { Can } from "@/components/auth/Can";
import { useAbility } from "@/hooks/useAbility";
import { useGetOverviewQuery, type Overview, type RecentCampaign } from "@/features/overview";
import { useGetIdentitiesQuery } from "@/features/identities";
import { formatCount, formatDateTime, formatRelative, formatTime, formatWeekday, plural } from "@/lib/format";
import type { Campaign, CampaignStatus } from "@/types/resources";
import { cx } from "@/utils/cx";

/**
 * Overview. The screen's question: what goes out next, and did the last
 * sends land? Counts of everything the key can read sit in one strip on top.
 */
export default function OverviewPage() {
  const { data, isLoading, error, refetch } = useGetOverviewQuery(undefined, { refetchOnMountOrArgChange: 30 });
  const { ability } = useAbility();
  const canReadIdentities = ability.can("read", "Identity");
  // Sender names for the campaign rows, and the identities still waiting on DNS.
  const { data: identities } = useGetIdentitiesQuery({ limit: 100 }, { skip: !canReadIdentities });
  const senderName = React.useCallback((id: string | null) => identities?.find((identity) => identity.id === id)?.identity ?? null, [identities]);

  const campaigns = data?.campaigns;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description={isLoading ? <Skeleton className="mt-1 h-4 w-72" /> : data ? <Finding overview={data} senderName={senderName} /> : null}
        actions={
          <Can I="create" a="Campaign">
            <Button href="/campaigns/new" variant="primary" icon={Plus}>
              New campaign
            </Button>
          </Can>
        }
      />

      {error ? (
        <ErrorNotice error={error} what="the overview" onRetry={refetch} />
      ) : (
        <>
          <CountStrip overview={data} isLoading={isLoading} />

          {data && <SetupChecklist overview={data} />}

          {(isLoading || campaigns) && (
            <div className="grid gap-6 lg:grid-cols-3">
              <UpcomingCard
                className="lg:col-span-2"
                upcoming={campaigns?.upcoming}
                scheduledTotal={campaigns?.by_status.scheduled ?? 0}
                senderName={senderName}
              />
              <StatusCard byStatus={campaigns?.by_status} total={campaigns?.total ?? 0} />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {(isLoading || campaigns) && (
              <RecentCard className={cx(data?.identities ? "lg:col-span-2" : "lg:col-span-3")} recent={campaigns?.recent} totals={campaigns?.deliveries} />
            )}
            {data?.identities && (
              <IdentitiesCard
                className={cx(!campaigns && "lg:col-span-3")}
                counts={data.identities}
                pending={identities?.filter((identity) => identity.status !== "active").slice(0, 3)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** The one line under the title: the fact that most needs attention right now. */
function Finding({ overview, senderName }: { overview: Overview; senderName: (id: string | null) => string | null }) {
  const campaigns = overview.campaigns;
  const failed = campaigns?.recent.find((campaign) => campaign.status === "failed");
  const next = campaigns?.upcoming[0];
  const identities = overview.identities;

  if (failed) {
    return (
      <span>
        <Link href={`/campaigns/${failed.id}`} className="font-medium text-text hover:underline">
          {failed.name}
        </Link>{" "}
        failed{failed.start_time ? ` ${formatRelative(failed.start_time)}` : ""}
        {failed.failure_reason ? `: ${failed.failure_reason}` : "."}
      </span>
    );
  }
  if (next?.start_time) {
    const sender = senderName(next.identity_id);
    return (
      <span>
        Next send:{" "}
        <Link href={`/campaigns/${next.id}`} className="font-medium text-text hover:underline">
          {next.name}
        </Link>{" "}
        {formatRelative(next.start_time)}, {formatWeekday(next.start_time)} at {formatTime(next.start_time)}
        {sender ? ` from ${sender}` : ""}.
      </span>
    );
  }
  if (identities && identities.total > 0 && identities.by_status.active === 0) {
    return <span>No identity is verified yet, so nothing can send until one is.</span>;
  }
  if (campaigns && campaigns.total === 0) return <span>No campaigns yet.</span>;
  return <span>Nothing is scheduled to send.</span>;
}

interface CountCell {
  label: string;
  href: string;
  value: number;
  detail: React.ReactNode;
}

/** Counts of every resource the key can read, in one container split by hairlines. Each cell opens its list. */
function CountStrip({ overview, isLoading }: { overview?: Overview; isLoading: boolean }) {
  if (isLoading || !overview) {
    return (
      <div className={cx("grid gap-px overflow-hidden rounded-card border border-border bg-border", STRIP_COLUMNS[6])}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2 bg-sheet p-4">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  const { campaigns, identities, templates, groups, recipients } = overview;
  const cells: CountCell[] = [];
  if (campaigns) {
    cells.push({
      label: "Campaigns",
      href: "/campaigns",
      value: campaigns.total,
      detail: `${formatCount(campaigns.by_status.draft)} draft · ${formatCount(campaigns.by_status.sent)} sent`,
    });
    cells.push({
      label: "Scheduled",
      href: "/campaigns?status=scheduled",
      value: campaigns.by_status.scheduled,
      detail: campaigns.upcoming[0]?.start_time ? `Next ${formatRelative(campaigns.upcoming[0].start_time)}` : <Dash />,
    });
  }
  if (identities) {
    cells.push({
      label: "Identities",
      href: "/identities",
      value: identities.total,
      detail:
        identities.total === 0 ? (
          <Dash />
        ) : (
          <>
            {formatCount(identities.by_status.active)} verified
            {identities.by_status.pending > 0 && <span className="text-warning"> · {formatCount(identities.by_status.pending)} pending</span>}
          </>
        ),
    });
  }
  if (templates) cells.push({ label: "Templates", href: "/templates", value: templates.total, detail: "HTML bodies" });
  if (groups) cells.push({ label: "Groups", href: "/groups", value: groups.total, detail: "Recipient lists" });
  if (recipients) cells.push({ label: "Recipients", href: "/recipients", value: recipients.total, detail: "Email addresses" });

  if (cells.length === 0) return null;

  return (
    // Hairlines come from the 1px gaps showing the border colour behind the cells.
    <div className={cx("grid gap-px overflow-hidden rounded-card border border-border bg-border", STRIP_COLUMNS[cells.length])}>
      {cells.map((cell, index) => (
        <Link
          key={cell.label}
          href={cell.href}
          className={cx(
            "group flex flex-col gap-1 bg-sheet p-4 transition-colors duration-150 hover:bg-raised",
            // An odd count leaves the last phone cell alone in its row: let it take the full width.
            cells.length % 2 === 1 && index === cells.length - 1 && "max-sm:col-span-2",
          )}
        >
          <span className="text-sm text-muted group-hover:text-text">{cell.label}</span>
          <span className="tabular text-kpi text-text">{formatCount(cell.value)}</span>
          <span className="truncate text-xs text-muted">{cell.detail}</span>
        </Link>
      ))}
    </div>
  );
}

/** Column count per number of cells, so no row is left with an orphan. */
const STRIP_COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
};

/** First run: the steps between an empty instance and a first send, at their true progress. */
function SetupChecklist({ overview }: { overview: Overview }) {
  const { campaigns, identities, templates, recipients } = overview;
  if (!campaigns || !identities || !templates || !recipients) return null;

  const steps = [
    { label: "Verify a sending identity", href: "/identities/new", done: identities.by_status.active > 0 },
    { label: "Write a template", href: "/templates/new", done: templates.total > 0 },
    { label: "Add recipients", href: "/recipients/new", done: recipients.total > 0 },
    { label: "Schedule a campaign", href: "/campaigns/new", done: campaigns.by_status.scheduled + campaigns.by_status.sent > 0 },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length || campaigns.by_status.sent > 0) return null;

  return (
    <Card title="Get ready to send" meta={`${doneCount} of ${steps.length} done`}>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className={cx(
                "flex h-10 items-center gap-2.5 rounded-control px-3 text-sm transition-colors",
                step.done ? "bg-raised text-muted" : "border border-control text-text hover:bg-raised",
              )}
            >
              <span
                className={cx(
                  "flex size-4.5 shrink-0 items-center justify-center rounded-full",
                  step.done ? "bg-positive text-sheet" : "border border-control",
                )}
              >
                {step.done && <Check className="size-3" />}
              </span>
              <span className={cx(step.done && "line-through decoration-faint")}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const DAY_MS = 86_400_000;

/** Midnight at the start of `date`'s local day. */
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * The next 14 days as a strip of day cells, each marked with the scheduled
 * sends that fall on it. Only the sends the overview returned are drawn.
 */
function ScheduleStrip({ upcoming }: { upcoming: Campaign[] }) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 14 }, (_, index) => new Date(today.getTime() + index * DAY_MS));
  const countFor = (day: Date) =>
    upcoming.filter((campaign) => campaign.start_time && startOfDay(new Date(campaign.start_time)).getTime() === day.getTime()).length;

  return (
    <div className="-mx-1 grid grid-cols-7 gap-y-1 sm:grid-cols-14" aria-label="Scheduled sends over the next 14 days">
      {days.map((day, index) => {
        const count = countFor(day);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        return (
          <div
            key={day.toISOString()}
            title={count ? `${count} send${count > 1 ? "s" : ""} on ${day.toDateString()}` : day.toDateString()}
            className={cx("mx-px flex flex-col items-center gap-1 rounded-control py-1.5", index === 0 && "bg-raised", isWeekend && index !== 0 && "bg-raised/50")}
          >
            <span className="text-[11px] leading-3 text-muted">{index === 0 ? "Today" : day.toLocaleDateString("en-GB", { weekday: "short" })}</span>
            <span className={cx("tabular text-sm", count ? "font-semibold text-accent-ink" : "text-text")}>{day.getDate()}</span>
            <span className="flex h-1.5 gap-0.5">
              {Array.from({ length: Math.min(count, 3) }, (_, dot) => (
                <span key={dot} className="size-1.5 rounded-full bg-accent" />
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** What goes out next: the 14-day strip, then the scheduled sends soonest first. */
function UpcomingCard({
  upcoming,
  scheduledTotal,
  senderName,
  className,
}: {
  upcoming?: Campaign[];
  scheduledTotal: number;
  senderName: (id: string | null) => string | null;
  className?: string;
}) {
  return (
    <Card
      className={className}
      title="Upcoming sends"
      meta={upcoming && scheduledTotal > upcoming.length ? `Next ${upcoming.length} of ${formatCount(scheduledTotal)}` : undefined}
      action={<CardLink href="/campaigns?status=scheduled">View scheduled</CardLink>}
    >
      {!upcoming ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ScheduleStrip upcoming={upcoming} />
          {upcoming.length === 0 ? (
            <EmptyState
              title="Nothing is scheduled"
              action={
                <Can I="create" a="Campaign">
                  <Button href="/campaigns/new" size="sm" icon={Plus}>
                    Schedule a campaign
                  </Button>
                </Can>
              }
            >
              A campaign is scheduled once it has a start time and a verified sender.
            </EmptyState>
          ) : (
            <ul className="flex flex-col">
              {upcoming.map((campaign) => {
                const sender = senderName(campaign.identity_id);
                return (
                  <li key={campaign.id} className="border-t border-rule first:border-t-0">
                    <Link href={`/campaigns/${campaign.id}`} className="-mx-2 flex items-center gap-4 rounded-control px-2 py-2.5 transition-colors hover:bg-raised">
                      <span className="flex w-24 shrink-0 flex-col">
                        <span className="text-sm text-text">{formatWeekday(campaign.start_time!)}</span>
                        <span className="tabular text-xs text-muted">{formatTime(campaign.start_time!)}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-text">{campaign.name}</span>
                        <span className="truncate text-xs text-muted">
                          {campaign.subject || "No subject"}
                          {sender && ` · from ${sender}`}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-right text-sm text-muted">{formatRelative(campaign.start_time!)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

const STATUS_ORDER: CampaignStatus[] = ["draft", "scheduled", "sending", "sent", "failed"];
const STATUS_COLOR: Record<CampaignStatus, string> = {
  draft: "bg-control",
  scheduled: "bg-accent",
  sending: "bg-warning",
  sent: "bg-positive",
  failed: "bg-negative",
};
const STATUS_LABEL: Record<CampaignStatus, string> = { draft: "Draft", scheduled: "Scheduled", sending: "Sending", sent: "Sent", failed: "Failed" };

/** Every campaign by lifecycle status: one 100% bar and the counts beside it. */
function StatusCard({ byStatus, total }: { byStatus?: Record<CampaignStatus, number>; total: number }) {
  return (
    <Card title="Campaigns by status" meta={byStatus ? `${formatCount(total)} total` : undefined}>
      {!byStatus ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-2.5 w-full" />
          {STATUS_ORDER.map((status) => (
            <Skeleton key={status} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-track" aria-hidden>
            {total > 0 &&
              STATUS_ORDER.filter((status) => byStatus[status] > 0).map((status) => (
                <span key={status} className={STATUS_COLOR[status]} style={{ flexGrow: byStatus[status] }} />
              ))}
          </div>
          <ul className="flex flex-col">
            {STATUS_ORDER.map((status) => (
              <li key={status}>
                <Link
                  href={`/campaigns?status=${status}`}
                  className="-mx-2 flex h-9 items-center gap-2.5 rounded-control px-2 text-sm transition-colors hover:bg-raised"
                >
                  <span className={cx("size-2 shrink-0 rounded-full", STATUS_COLOR[status])} />
                  <span className="flex-1 text-text">{STATUS_LABEL[status]}</span>
                  <span className={cx("tabular w-10 text-right", byStatus[status] ? "text-text" : "text-faint")}>{formatCount(byStatus[status])}</span>
                  <span className="tabular w-12 text-right text-xs text-muted">
                    {total > 0 ? `${Math.round((byStatus[status] / total) * 100)}%` : "–"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Sent against failed (and still pending) for one send, as a thin bar at true proportions. */
function DeliveryBar({ counts }: { counts: RecentCampaign["deliveries"] }) {
  const total = counts.sent + counts.failed + counts.pending;
  if (total === 0) return <span className="block h-1.5 w-full rounded-full bg-track" aria-hidden />;
  return (
    <span className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-track" aria-hidden>
      {counts.sent > 0 && <span className="bg-accent" style={{ flexGrow: counts.sent }} />}
      {counts.failed > 0 && <span className="bg-negative" style={{ flexGrow: counts.failed }} />}
      {counts.pending > 0 && <span className="bg-track" style={{ flexGrow: counts.pending }} />}
    </span>
  );
}

/** The latest sends and how their deliveries went. */
function RecentCard({ recent, totals, className }: { recent?: RecentCampaign[]; totals?: RecentCampaign["deliveries"]; className?: string }) {
  return (
    <Card
      className={className}
      title="Recent sends"
      meta={
        totals && totals.sent + totals.failed > 0 ? (
          <>
            {formatCount(totals.sent)} delivered{totals.failed > 0 && <span className="text-negative"> · {formatCount(totals.failed)} failed</span>} in all
          </>
        ) : undefined
      }
      action={<CardLink href="/campaigns?status=sent">View sent</CardLink>}
    >
      {!recent ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <EmptyState title="No sends yet">Campaigns appear here once their start time arrives and sending begins.</EmptyState>
      ) : (
        <ul className="flex flex-col">
          {recent.map((campaign) => {
            const { sent, failed, pending } = campaign.deliveries;
            return (
              <li key={campaign.id} className="border-t border-rule first:border-t-0">
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="-mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-control px-2 py-2.5 transition-colors hover:bg-raised sm:grid-cols-[minmax(0,1fr)_140px_120px_92px]"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-text">{campaign.name}</span>
                    <span className="truncate text-xs text-muted">{campaign.start_time ? formatDateTime(campaign.start_time) : "No start time"}</span>
                  </span>
                  <span className="hidden flex-col gap-1.5 sm:flex">
                    <DeliveryBar counts={campaign.deliveries} />
                  </span>
                  <span className="tabular hidden flex-col text-right text-sm sm:flex">
                    <span className="text-text">{formatCount(sent)} sent</span>
                    <span className={cx("text-xs", failed ? "text-negative" : "text-muted")}>
                      {failed ? `${formatCount(failed)} failed` : pending ? `${formatCount(pending)} pending` : "0 failed"}
                    </span>
                  </span>
                  <span className="justify-self-end">
                    <CampaignStatusPill status={campaign.status} />
                  </span>
                  <span className="tabular col-span-2 text-xs text-muted sm:hidden">
                    {formatCount(sent)} sent · {failed ? <span className="text-negative">{formatCount(failed)} failed</span> : "0 failed"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Who mail can go out as, and which identities still need their DNS records. */
function IdentitiesCard({
  counts,
  pending,
  className,
}: {
  counts: NonNullable<Overview["identities"]>;
  pending?: { id: string; identity: string; type: string; status: string }[];
  className?: string;
}) {
  const rows = [
    { label: "Verified", value: counts.by_status.active, tone: "text-positive" },
    { label: "Awaiting verification", value: counts.by_status.pending, tone: "text-warning" },
    { label: "Created", value: counts.by_status.created, tone: "text-muted" },
  ];

  return (
    <Card className={className} title="Sending identities" meta={`${formatCount(counts.total)} total`} action={<CardLink href="/identities">View all</CardLink>}>
      {counts.total === 0 ? (
        <EmptyState
          title="No identities yet"
          action={
            <Can I="create" a="Identity">
              <Button href="/identities/new" size="sm" icon={Plus}>
                Add identity
              </Button>
            </Can>
          }
        >
          Add a domain or an email address to send from. SES verifies it before any campaign can use it.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="flex flex-col">
            {rows.map((row) => (
              <div key={row.label} className="flex h-8 items-center justify-between text-sm">
                <dt className="flex items-center gap-2 text-text">
                  <span className={cx("size-2 rounded-full bg-current", row.tone)} />
                  {row.label}
                </dt>
                <dd className={cx("tabular", row.value ? "text-text" : "text-faint")}>{formatCount(row.value)}</dd>
              </div>
            ))}
          </dl>
          {pending && pending.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-rule pt-3">
              <p className="pb-1 text-xs text-muted">Needs DNS records or confirmation</p>
              {pending.map((identity) => (
                <Link
                  key={identity.id}
                  href={`/identities/${identity.id}`}
                  className="-mx-2 flex h-9 items-center justify-between gap-3 rounded-control px-2 text-sm transition-colors hover:bg-raised"
                >
                  <span className="truncate text-text">{identity.identity}</span>
                  <Pill tone={identity.status === "pending" ? "warning" : "neutral"}>{identity.type === "domain" ? "Add DNS records" : "Confirm email"}</Pill>
                </Link>
              ))}
            </div>
          )}
          {counts.by_status.active === counts.total && (
            <p className="text-sm text-muted">{counts.total === 1 ? "The identity is" : `All ${plural(counts.total, "identity", "identities")} are`} verified.</p>
          )}
        </div>
      )}
    </Card>
  );
}
