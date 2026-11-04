import * as React from "react";

/** The heading row of a tab inside a detail page: a title, a grey note and one action. */
export function SubsectionHeader({ title, note, action }: { title: string; note?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-medium text-text">{title}</h2>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      {action}
    </div>
  );
}
