"use client";

import Link from "next/link";
import { cx } from "@/utils/cx";
import type { Group } from "@/types/resources";

interface GroupPickerProps {
  groups: Group[] | undefined;
  value: string[];
  onChange: (groupIds: string[]) => void;
  disabled?: boolean;
  id?: string;
  /** Summary line under the list, given how many groups are picked. Defaults to subscriber wording ("In 2 groups."). */
  summary?: (count: number) => string;
}

/** "In no groups." / "In 2 groups." - how a subscriber's memberships read. */
const membershipSummary = (count: number) => (count === 0 ? "In no groups." : `In ${count} group${count === 1 ? "" : "s"}.`);

/**
 * Pick any number of groups: a checkbox per group in a bordered, scrollable
 * list, each with how many subscribers it holds. Selected groups sort first.
 * Used for a subscriber's memberships and for a campaign's audience.
 */
export function GroupPicker({ groups, value, onChange, disabled, id, summary = membershipSummary }: GroupPickerProps) {
  if (groups && groups.length === 0) {
    return (
      <p className="text-sm text-muted">
        No groups yet.{" "}
        <Link href="/groups/new" className="text-text underline-offset-3 hover:underline">
          Create one
        </Link>{" "}
        to send to many subscribers at once.
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
                  <span className="tabular shrink-0 text-xs text-muted">
                    {group.subscriber_count} subscriber{group.subscriber_count === 1 ? "" : "s"}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
      <p className="text-xs text-muted">{summary(value.length)}</p>
    </fieldset>
  );
}
