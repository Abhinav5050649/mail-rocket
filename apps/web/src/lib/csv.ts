/**
 * A small CSV reader for subscriber imports. Follows RFC 4180: fields may be
 * wrapped in double quotes, a quoted field may hold the delimiter, line
 * breaks and `""` (an escaped quote), and lines end in LF or CRLF. Accepts
 * a comma or a semicolon as the delimiter (spreadsheets in many locales
 * save with `;`), picked from the header line.
 */

/**
 * Splits CSV text into rows of cells. Empty lines are dropped.
 *
 * @param text - The file's contents.
 * @returns One entry per non-empty row: its cells, and the 1-based file line it starts on
 * (counted before blank lines are dropped, and across line breaks inside quoted cells).
 */
export function parseCsv(text: string): { cells: string[]; line: number }[] {
  // Spreadsheet apps often prepend a UTF-8 byte-order mark; it isn't data.
  const source = text.replace(/^﻿/, "");
  // The delimiter is whichever of `,` / `;` appears more in the first line.
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: { cells: string[]; line: number }[] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  // The file line being read, and the one the current row started on.
  let line = 1;
  let rowStart = 1;

  /** Ends the current cell. */
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  /** Ends the current row, keeping it only if it holds something. */
  const endRow = () => {
    endCell();
    if (row.some((value) => value.trim() !== "")) rows.push({ cells: row, line: rowStart });
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    // Every newline, even one inside a quoted cell, moves to the next file line.
    if (char === "\n") line++;

    if (inQuotes) {
      if (char === '"' && source[i + 1] === '"') {
        // `""` inside quotes is one literal quote.
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      endCell();
    } else if (char === "\n") {
      endRow();
      // `line` already counts this newline, so it's where the next row begins.
      rowStart = line;
    } else if (char !== "\r") {
      // A bare `\r` is half of a CRLF line end; the `\n` ends the row.
      cell += char;
    }
  }
  // The last line may have no trailing newline.
  endRow();

  return rows;
}

/** A subscriber read from one CSV line. `line` is its 1-based line in the file, header included. */
export interface CsvSubscriberRow {
  line: number;
  email_id: string;
  first_name?: string;
  last_name?: string;
}

/** Subscribers read from a CSV, or why the file can't be used. */
export type CsvSubscribers = { rows: CsvSubscriberRow[]; hasHeader: boolean } | { error: string };

/** Header names each column is recognised by, compared lowercased with spaces, dashes and underscores removed. */
const HEADER_ALIASES = {
  email_id: ["email", "emailid", "emailaddress", "mail"],
  first_name: ["firstname", "first", "givenname", "forename"],
  last_name: ["lastname", "last", "surname", "familyname"],
} as const;

/** `"First Name"` -> `"firstname"`, so headers match however they're spelled. */
const normalizeHeader = (value: string) => value.toLowerCase().replace(/[\s_-]/g, "");

/**
 * Reads subscribers out of CSV text. With a header row, columns are found by
 * name (`email`, `first name`, `last name` and common variants), in any order,
 * and other columns are ignored. Without one (the first cell holds an `@`),
 * columns are taken as email, first name, last name. Emails aren't validated
 * here: the API reports each bad row, so nothing is silently dropped.
 *
 * @param text - The file's contents.
 * @returns The rows, or an error to show when no email column can be found.
 */
export function readSubscribersCsv(text: string): CsvSubscribers {
  const rows = parseCsv(text);
  if (rows.length === 0) return { error: "The file is empty." };

  const header = rows[0]!.cells.map(normalizeHeader);
  /** Index of the first header cell matching one of `aliases`, or -1. */
  const find = (aliases: readonly string[]) => header.findIndex((name) => aliases.includes(name));
  const emailColumn = find(HEADER_ALIASES.email_id);
  const hasHeader = emailColumn !== -1;

  // No recognisable header: accept a headerless file only if it starts with an email.
  if (!hasHeader && !rows[0]!.cells[0]?.includes("@")) {
    return { error: "Couldn't find an email column. Add a header row with an \"email\" column (and optionally \"first name\" and \"last name\")." };
  }

  const columns = hasHeader
    ? { email_id: emailColumn, first_name: find(HEADER_ALIASES.first_name), last_name: find(HEADER_ALIASES.last_name) }
    : { email_id: 0, first_name: 1, last_name: 2 };
  /** Trimmed cell `index` of `cells`, or undefined when the column is absent or blank. */
  const cellAt = (cells: string[], index: number) => (index === -1 ? undefined : cells[index]?.trim() || undefined);

  const dataRows = hasHeader ? rows.slice(1) : rows;
  if (dataRows.length === 0) return { error: "The file has a header row but no subscribers." };

  return {
    hasHeader,
    rows: dataRows.map(({ cells, line }) => ({
      // The row's real line in the file, so a skipped row can be found there.
      line,
      email_id: cellAt(cells, columns.email_id) ?? "",
      first_name: cellAt(cells, columns.first_name),
      last_name: cellAt(cells, columns.last_name),
    })),
  };
}
