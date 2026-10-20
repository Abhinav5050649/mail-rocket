"use client";

import Link from "next/link";
import { cx } from "@/utils/cx";
import type { Group } from "@/types/resources";

interface GroupPickerProps {
  groups: Group[] | undefined;
  value: string[];
  onChange: (groupIds: string[]) => void;
  /** Campaign names by id, shown beside each group so it's clear which sends it feeds. */
  campaignName: (id: string | null) => string | null;
  disabled?: boolean;
  id?: string;
}

/**
 * Pick any number of groups: a checkbox per group in a bordered, scrollable
 * list, each with the campaign it feeds. Selected groups sort first.
 */
export function GroupPicker({ groups, value, onChange, campaignName, disabled, id }: GroupPickerProps) {
  if (groups && groups.length === 0) {
    return (
      <p className="text-sm text-muted">
        No groups yet.{" "}
        <Link href="/groups/new" className="text-text underline-offset-3 hover:underline">
          Create one
        </Link>{" "}
        to send to many recipients at once.
      </p>
    );
  }

  const selected = new Set(value);
  const toggle = (groupId: string) => onChange(selected.has(groupId) ? value.filter((idValue) => idValue !== groupId) : [...value, groupId]);
  // Chosen groups first, so a long list still shows what's picked without scrolling.
  const ordered = [...(groups ?? [])].sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)) || (a.name ?? "").localeCompare(b.name ?? ""));

  return (
    <fieldset id={id} disabled={disabled} className="flex flex-col gap-2">
      <legend className="sr-only">Groups</legend>
      <div className="max-h-64 overflow-y-auto rounded-control border border-control bg-sheet">
        {!groups ? (
          <p className="px-3 py-2.5 text-sm text-muted">Loading groups…</p>
        ) : (
          ordered.map((group) => {
            const campaign = campaignName(group.campaign_id);
            return (
              <label
                key={group.id}
                className={cx(
                  "flex cursor-pointer items-center gap-3 border-b border-rule px-3 py-2.5 last:border-b-0 hover:bg-raised",
                  disabled && "cursor-not-allowed opacity-70",
                )}
              >
                <input type="checkbox" checked={selected.has(group.id)} onChange={() => toggle(group.id)} className="size-4 shrink-0 accent-(--accent)" />
                <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="min-w-0 truncate text-sm text-text">{group.name || "Untitled group"}</span>
                  <span className="min-w-0 truncate text-xs text-muted sm:max-w-[50%]">{campaign ? `Sent by ${campaign}` : "No campaign"}</span>
                </span>
              </label>
            );
          })
        )}
      </div>
      <p className="text-xs text-muted">{value.length === 0 ? "In no groups." : `In ${value.length} group${value.length === 1 ? "" : "s"}.`}</p>
    </fieldset>
  );
}
