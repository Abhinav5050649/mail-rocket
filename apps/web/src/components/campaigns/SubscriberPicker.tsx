"use client";

import { useState } from "react";
import { SearchMd } from "@untitledui/icons";
import { Input } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";
import { fullName } from "@/lib/format";
import { cx } from "@/utils/cx";
import type { Subscriber } from "@/types/resources";

interface SubscriberPickerProps {
  /** Every subscriber to choose from; undefined while they load. */
  subscribers: Subscriber[] | undefined;
  /** Ids of the picked subscribers. */
  value: string[];
  onChange: (subscriberIds: string[]) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * Pick individual subscribers for a campaign, on top of its groups: a search
 * box over a checkbox list, picked people first. Someone who unsubscribed
 * can't be picked (no campaign sends to them), but stays visible - and can
 * be unpicked - if they were picked before they left.
 */
export function SubscriberPicker({ subscribers, value, onChange, disabled, id }: SubscriberPickerProps) {
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const toggle = (subscriberId: string) =>
    onChange(selected.has(subscriberId) ? value.filter((existing) => existing !== subscriberId) : [...value, subscriberId]);

  // Matches the email or the name, case-insensitively; picked people always stay visible.
  const needle = query.trim().toLowerCase();
  const matches = (subscriber: Subscriber) =>
    !needle || selected.has(subscriber.id) || [subscriber.email_id, fullName(subscriber)].some((text) => text?.toLowerCase().includes(needle));
  const ordered = [...(subscribers ?? [])]
    .filter(matches)
    .sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)) || (a.email_id ?? "").localeCompare(b.email_id ?? ""));

  return (
    <fieldset id={id} disabled={disabled} className="flex flex-col gap-2">
      <legend className="sr-only">Individual subscribers</legend>
      <div className="relative">
        <SearchMd className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email or name"
          aria-label="Search subscribers"
          className="pl-9"
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-control border border-control bg-sheet">
        {!subscribers ? (
          <p className="px-3 py-2.5 text-sm text-muted">Loading subscribers…</p>
        ) : ordered.length === 0 ? (
          <p className="px-3 py-2.5 text-sm text-muted">{subscribers.length === 0 ? "No subscribers yet." : "No one matches that search."}</p>
        ) : (
          ordered.map((subscriber) => {
            const isPicked = selected.has(subscriber.id);
            // Unsubscribed people can be unpicked but never newly picked.
            const blocked = Boolean(subscriber.unsubscribed_at) && !isPicked;
            return (
              <label
                key={subscriber.id}
                className={cx(
                  "flex cursor-pointer items-center gap-3 border-b border-rule px-3 py-2.5 last:border-b-0 hover:bg-raised",
                  (disabled || blocked) && "cursor-not-allowed opacity-70",
                )}
              >
                <input
                  type="checkbox"
                  checked={isPicked}
                  disabled={blocked}
                  onChange={() => toggle(subscriber.id)}
                  className="size-4 shrink-0 accent-(--accent)"
                />
                <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="min-w-0 truncate text-sm text-text">{subscriber.email_id}</span>
                  <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
                    {subscriber.unsubscribed_at && <Pill tone="warning">Unsubscribed</Pill>}
                    <span className="truncate">{fullName(subscriber)}</span>
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
      <p className="text-xs text-muted">{value.length === 0 ? "No one picked individually." : `${value.length} picked individually.`}</p>
    </fieldset>
  );
}
