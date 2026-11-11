"use client";

import { useState } from "react";
import { CheckCircle, Upload01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { FormError, Notice } from "@/components/ui/feedback";
import { Dash, FactList, FormActions, SettingsSection } from "@/components/ui/page";
import { useGroupNames } from "@/hooks/useLookups";
import { SUBSCRIBER_IMPORT_MAX_ROWS, useImportSubscribersMutation, type SubscriberImportResult } from "@/features/subscribers";
import { formatCount } from "@/lib/format";
import { readSubscribersCsv, type CsvSubscribers } from "@/lib/csv";
import { GroupPicker } from "./GroupPicker";

/** Rows of the file shown before importing, so the columns can be checked. */
const PREVIEW_ROWS = 5;

/** "1 subscriber" / "3 subscribers". */
const subscribersLabel = (count: number) => `${formatCount(count)} subscriber${count === 1 ? "" : "s"}`;

interface SubscriberImportFormProps {
  /** Pre-selects this group (opened from a group's page). */
  defaultGroupId?: string;
  /** Where "Done" goes after an import. */
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Imports subscribers from a CSV file into any number of groups. The file is
 * read in the browser (the API takes JSON), previewed, then sent in one
 * request; the API creates new subscribers, reuses ones whose email it
 * already has, and puts them all in the picked groups. Afterwards it shows
 * what happened, including every row that was skipped and why.
 */
export function SubscriberImportForm({ defaultGroupId, onDone, onCancel }: SubscriberImportFormProps) {
  const { groups, groupNames } = useGroupNames();
  const [importSubscribers, { isLoading, error, reset }] = useImportSubscribersMutation();
  const [fileName, setFileName] = useState<string>();
  const [parsed, setParsed] = useState<CsvSubscribers>();
  const [groupIds, setGroupIds] = useState<string[]>(defaultGroupId ? [defaultGroupId] : []);
  const [result, setResult] = useState<SubscriberImportResult>();

  const rows = parsed && "rows" in parsed ? parsed.rows : undefined;
  const tooMany = (rows?.length ?? 0) > SUBSCRIBER_IMPORT_MAX_ROWS;

  /** Reads the chosen file and replaces any earlier one. */
  const onFile = async (file: File | undefined) => {
    // A new file clears the last attempt's server error.
    reset();
    setFileName(file?.name);
    setParsed(file ? readSubscribersCsv(await file.text()) : undefined);
  };

  /** Sends the rows, in file order, with the picked groups. */
  const submit = async () => {
    if (!rows || tooMany) return;
    const response = await importSubscribers({
      subscribers: rows.map(({ email_id, first_name, last_name }) => ({ email_id, first_name, last_name })),
      group_ids: groupIds,
    });
    if (response.data) setResult(response.data);
  };

  /** Back to an empty form, keeping the groups, for the next file. */
  const startOver = () => {
    reset();
    setResult(undefined);
    setParsed(undefined);
    setFileName(undefined);
  };

  if (result && rows) {
    return <ImportSummary result={result} csvLines={rows.map((row) => row.line)} groupNames={groupNames} onAnother={startOver} onDone={onDone} />;
  }

  return (
    <div>
      <SettingsSection
        title="File"
        description={
          <>
            A CSV with a header row. An <code>email</code> column is required; <code>first name</code> and <code>last name</code> are optional, and other
            columns are ignored. Up to {formatCount(SUBSCRIBER_IMPORT_MAX_ROWS)} rows per import.
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-start gap-2 rounded-card border border-dashed border-control px-5 py-6 hover:bg-raised">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-text">
              <Upload01 className="size-4" />
              {fileName ?? "Choose a CSV file"}
            </span>
            <span className="text-xs text-muted">{fileName ? "Choose another file to replace it." : ".csv, comma or semicolon separated"}</span>
            {/* The native input stays for keyboard and screen-reader use; the label is its visible face. */}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                void onFile(event.target.files?.[0]);
                // Clearing the value lets the same file be picked again after editing it.
                event.target.value = "";
              }}
            />
          </label>

          {parsed && "error" in parsed && <Notice title="This file can't be imported">{parsed.error}</Notice>}
          {tooMany && (
            <Notice title={`${subscribersLabel(rows!.length)} is over the limit`}>
              Split the file into imports of at most {formatCount(SUBSCRIBER_IMPORT_MAX_ROWS)} rows.
            </Notice>
          )}
          {rows && !tooMany && <ImportPreview rows={rows} />}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Groups"
        description="Everyone in the file joins these groups. People already on your list keep their details and other groups, and are only added to these."
      >
        <GroupPicker
          groups={groups}
          value={groupIds}
          onChange={setGroupIds}
          summary={(count) => (count === 0 ? "Imported subscribers join no group." : `Imported subscribers join ${count} group${count === 1 ? "" : "s"}.`)}
        />
      </SettingsSection>

      <div className="flex flex-col gap-3 border-t border-border pt-5 lg:pl-[360px]">
        <FormError error={error} />
        <FormActions>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" isLoading={isLoading} disabled={!rows || tooMany} onClick={submit}>
            {rows && !tooMany ? `Import ${subscribersLabel(rows.length)}` : "Import"}
          </Button>
        </FormActions>
      </div>
    </div>
  );
}

/** How many rows were read, and the first few as the API will receive them. */
function ImportPreview({ rows }: { rows: { line: number; email_id: string; first_name?: string; last_name?: string }[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text">
        {subscribersLabel(rows.length)} found{rows.length > PREVIEW_ROWS ? `; the first ${PREVIEW_ROWS}:` : ":"}
      </p>
      <div className="overflow-x-auto rounded-control border border-control">
        <table className="w-full text-left text-sm">
          <thead className="bg-raised text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">First name</th>
              <th className="px-3 py-2 font-medium">Last name</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, PREVIEW_ROWS).map((row) => (
              <tr key={row.line} className="border-t border-rule">
                <td className="max-w-64 truncate px-3 py-2 text-text">{row.email_id || <Dash />}</td>
                <td className="px-3 py-2 text-text">{row.first_name ?? <Dash />}</td>
                <td className="px-3 py-2 text-text">{row.last_name ?? <Dash />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Rows without a valid email, and repeats of an earlier email, are skipped and listed after the import.</p>
    </div>
  );
}

interface ImportSummaryProps {
  result: SubscriberImportResult;
  /** CSV line of each sent row, so a skipped row (1-based position in the request) can be named by its line in the file. */
  csvLines: number[];
  /** Formats group ids as their names (see `useGroupNames`). */
  groupNames: (ids: string[]) => string | null;
  onAnother: () => void;
  onDone: () => void;
}

/** What an import did: counts, the groups, and each skipped row with its line in the file. */
function ImportSummary({ result, csvLines, groupNames, onAnother, onDone }: ImportSummaryProps) {
  const groupLabel = groupNames(result.group_ids) ?? <Dash />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-2.5">
        <CheckCircle className="mt-0.5 size-5 shrink-0 text-positive" />
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-medium text-text">Import finished</p>
          <p className="text-sm text-muted">
            {subscribersLabel(result.created + result.existing)} imported
            {result.skipped.length > 0 ? `, ${formatCount(result.skipped.length)} row${result.skipped.length === 1 ? "" : "s"} skipped` : ""}.
          </p>
        </div>
      </div>

      <FactList
        className="max-w-xl"
        items={[
          { label: "New subscribers", value: formatCount(result.created) },
          { label: "Already subscribed (added to groups)", value: formatCount(result.existing) },
          { label: "Skipped rows", value: formatCount(result.skipped.length) },
          { label: "Groups", value: groupLabel },
        ]}
      />

      {result.skipped.length > 0 && (
        <div className="flex max-w-xl flex-col gap-2">
          <p className="text-sm font-medium text-text">Skipped rows</p>
          <div className="max-h-72 overflow-y-auto rounded-control border border-control">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-raised text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Line</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.skipped.map((skip) => (
                  <tr key={skip.row} className="border-t border-rule">
                    <td className="tabular px-3 py-2 text-muted">{csvLines[skip.row - 1] ?? skip.row}</td>
                    <td className="max-w-56 truncate px-3 py-2 text-text">{skip.email_id || <Dash />}</td>
                    <td className="px-3 py-2 text-muted">{skip.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FormActions>
        <Button variant="ghost" onClick={onAnother}>
          Import another file
        </Button>
        <Button variant="primary" onClick={onDone}>
          Done
        </Button>
      </FormActions>
    </div>
  );
}
