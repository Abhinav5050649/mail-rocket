"use client";

import * as React from "react";
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  Popover,
  TimeField,
} from "react-aria-components";
import {
  CalendarDate,
  CalendarDateTime,
  Time,
  now,
  parseDate,
  parseDateTime,
  startOfWeek,
  today,
} from "@internationalized/date";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, XClose } from "@untitledui/icons";
import { getDisplayTimeZone } from "@/lib/format";
import { cx } from "@/utils/cx";

/**
 * Date and date-and-time pickers on react-aria-components: a field whose
 * day / month / year (and hour / minute) segments can be typed or stepped
 * with the arrow keys, plus a calendar popover with quick picks. Values stay
 * plain strings in the same shapes the native inputs used - `YYYY-MM-DD`, or
 * `YYYY-MM-DDTHH:mm` read as wall-clock time in the organization's time zone
 * - so forms and `src/lib/format.ts` helpers don't change. Dates show in
 * en-GB order with a 24-hour clock, like every other date in the app.
 */

/** A quick pick in the popover: a label and the value it sets. */
interface Preset<Value> {
  label: string;
  value: () => Value;
}

interface PickerBaseProps {
  /** Wired by `Field`: the control id, whose `<label>` carries `${id}-label`. */
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  /** The current value, or "" for none. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable day, as `YYYY-MM-DD`; earlier days show greyed out. */
  minDate?: string;
  isDisabled?: boolean;
  /** Shows a clear button while there's a value, for optional fields. */
  clearable?: boolean;
  className?: string;
}

/** Today in the organization's time zone, the day every "today" in the app means. */
const zoneToday = () => today(getDisplayTimeZone());

/** Now in the organization's time zone, as wall-clock date and time. */
const zoneNow = () => {
  const current = now(getDisplayTimeZone());
  return new CalendarDateTime(current.year, current.month, current.day, current.hour, current.minute);
};

/** Parses a stored value, treating anything unparseable as empty rather than throwing mid-render. */
function safeParse<Value>(parse: (text: string) => Value, text: string): Value | null {
  if (!text) return null;
  try {
    return parse(text);
  } catch {
    return null;
  }
}

/** The bordered control the segments sit in, styled like every other input. */
const groupClass =
  "flex h-9 w-full items-center gap-1 rounded-control border border-control bg-sheet pl-3 pr-1 text-sm text-text " +
  "transition-[border-color,box-shadow] duration-150 ease-out hover:border-faint " +
  "focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/20 " +
  "data-invalid:border-negative data-invalid:focus-within:ring-negative/20 " +
  "data-disabled:cursor-not-allowed data-disabled:bg-raised data-disabled:text-muted";

/** The typed segments: each one highlights in the accent while it has focus. */
function Segments({ className }: { className?: string }) {
  return (
    <DateInput className={cx("tabular flex flex-1 items-center", className)}>
      {(segment) => (
        <DateSegment
          segment={segment}
          className={({ isPlaceholder, isFocused }) =>
            cx(
              "rounded-[3px] px-[1px] caret-transparent outline-none",
              segment.type === "literal" ? "px-0 text-faint" : "focus:bg-accent focus:text-white",
              isPlaceholder && !isFocused && "text-faint",
            )
          }
        />
      )}
    </DateInput>
  );
}

/** A small square icon button inside the control (calendar trigger, clear). */
const iconButtonClass =
  "grid size-7 shrink-0 place-items-center rounded-[5px] text-muted outline-none transition-colors duration-150 " +
  "hover:bg-raised hover:text-text data-pressed:bg-active data-focus-visible:outline-2 data-focus-visible:outline-focus " +
  "data-disabled:pointer-events-none data-disabled:opacity-50";

/** Clears an optional value. Plain button so it never opens the popover. */
function ClearButton({ onClear, isDisabled }: { onClear: () => void; isDisabled?: boolean }) {
  return (
    <AriaButton slot={null} aria-label="Clear" onPress={onClear} isDisabled={isDisabled} className={iconButtonClass}>
      <XClose className="size-4" />
    </AriaButton>
  );
}

/** Month heading with previous/next arrows, then the day grid. */
function MonthCalendar() {
  return (
    <Calendar className="w-fit">
      <header className="mb-2 flex items-center justify-between gap-2">
        <AriaButton slot="previous" className={iconButtonClass} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </AriaButton>
        <Heading className="text-sm font-medium text-text" />
        <AriaButton slot="next" className={iconButtonClass} aria-label="Next month">
          <ChevronRight className="size-4" />
        </AriaButton>
      </header>
      <CalendarGrid weekdayStyle="short" className="border-separate border-spacing-0.5">
        <CalendarGridHeader>
          {(day) => <CalendarHeaderCell className="pb-1 text-xs font-normal text-faint">{day}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={({ isSelected, isToday, isDisabled, isUnavailable, isOutsideMonth, isFocusVisible }) =>
                cx(
                  "tabular relative grid size-9 cursor-pointer place-items-center rounded-control text-sm outline-none transition-colors duration-150",
                  isOutsideMonth && "invisible",
                  isSelected ? "bg-accent font-medium text-white" : "text-text hover:bg-raised",
                  // Today keeps a small accent dot under the number, so it's findable at a glance.
                  isToday && !isSelected && "font-semibold text-accent after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-accent",
                  (isDisabled || isUnavailable) && "cursor-default text-faint/50 hover:bg-transparent",
                  isFocusVisible && "ring-2 ring-accent ring-offset-1 ring-offset-sheet",
                )
              }
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </Calendar>
  );
}

/**
 * Quick picks as a row of small chips under the calendar. `w-0 min-w-full`
 * keeps the row out of the popover's width calculation: the calendar alone
 * sets how wide the panel is, and the chips wrap to fit it instead of
 * stretching the panel and leaving empty space beside the calendar.
 */
function Presets<Value>({ presets, onPick }: { presets: Preset<Value>[]; onPick: (value: Value) => void }) {
  return (
    <div className="flex w-0 min-w-full flex-wrap gap-1.5 border-t border-rule pt-3">
      {presets.map((preset) => (
        <AriaButton
          key={preset.label}
          onPress={() => onPick(preset.value())}
          className="h-7 rounded-full border border-border px-2.5 text-xs text-text outline-none transition-colors duration-150 hover:bg-raised data-pressed:bg-active data-focus-visible:outline-2 data-focus-visible:outline-focus"
        >
          {preset.label}
        </AriaButton>
      ))}
    </div>
  );
}

/** The floating panel: the only kind of surface in the app that casts a shadow. */
function PickerPopover({ children }: { children: React.ReactNode }) {
  return (
    <Popover
      placement="bottom start"
      offset={6}
      className="rounded-card border border-border bg-sheet p-3 shadow-[0_8px_24px_rgb(0_0_0/0.12)] outline-none data-entering:animate-in data-entering:fade-in data-entering:zoom-in-95"
    >
      <Dialog className="flex flex-col gap-3 outline-none">{children}</Dialog>
    </Popover>
  );
}

/**
 * A date picker, for values like an API key's expiry. Quick picks jump 30
 * days, 90 days or a year ahead.
 */
export function DatePicker({ id, value, onChange, minDate, isDisabled, clearable, className, ...aria }: PickerBaseProps) {
  const parsed = safeParse(parseDate, value);
  const presets: Preset<CalendarDate>[] = [
    { label: "In 30 days", value: () => zoneToday().add({ days: 30 }) },
    { label: "In 90 days", value: () => zoneToday().add({ days: 90 }) },
    { label: "In 1 year", value: () => zoneToday().add({ years: 1 }) },
  ];

  return (
    <I18nProvider locale="en-GB">
      <AriaDatePicker
        id={id}
        aria-labelledby={id ? `${id}-label` : undefined}
        aria-describedby={aria["aria-describedby"]}
        isInvalid={aria["aria-invalid"]}
        value={parsed}
        onChange={(next) => onChange(next ? next.toString() : "")}
        minValue={minDate ? safeParse(parseDate, minDate) : undefined}
        isDisabled={isDisabled}
        className={cx("w-full max-w-52", className)}
      >
        <Group className={groupClass}>
          <Segments />
          {clearable && parsed && <ClearButton onClear={() => onChange("")} isDisabled={isDisabled} />}
          <AriaButton className={iconButtonClass} aria-label="Open calendar">
            <CalendarIcon className="size-4" />
          </AriaButton>
        </Group>
        <PickerPopover>
          <MonthCalendar />
          <Presets presets={presets} onPick={(date) => onChange(date.toString())} />
        </PickerPopover>
      </AriaDatePicker>
    </I18nProvider>
  );
}

/** The next whole quarter-hour from now, so "In 1 hour" lands on a tidy time. */
const roundedHourFromNow = () => {
  const later = zoneNow().add({ hours: 1 });
  const minutes = Math.ceil(later.minute / 15) * 15;
  return later.set({ minute: 0 }).add({ minutes });
};

/** 09:00 on a day: when most campaigns go out. */
const morningOf = (day: CalendarDate) => new CalendarDateTime(day.year, day.month, day.day, 9, 0);

/**
 * A date-and-time picker, for scheduling. The calendar sets the day and the
 * time field beside it sets the time, both also typeable in the main field.
 * Picking a day with no time yet starts at 09:00. Quick picks cover the
 * usual sends: in an hour, tomorrow morning, next Monday morning.
 */
export function DateTimePicker({ id, value, onChange, minDate, isDisabled, clearable, className, ...aria }: PickerBaseProps) {
  const parsed = safeParse(parseDateTime, value);
  /** Stores a picked value as `YYYY-MM-DDTHH:mm`, dropping seconds the field never shows. */
  const commit = (next: CalendarDateTime | null) => onChange(next ? next.toString().slice(0, 16) : "");

  const presets: Preset<CalendarDateTime>[] = [
    { label: "In 1 hour", value: roundedHourFromNow },
    { label: "Tomorrow, 09:00", value: () => morningOf(zoneToday().add({ days: 1 })) },
    // startOfWeek in en-GB is Monday; a week on from this Monday is next Monday.
    { label: "Next Monday, 09:00", value: () => morningOf(startOfWeek(zoneToday(), "en-GB").add({ weeks: 1 })) },
  ];

  return (
    <I18nProvider locale="en-GB">
      <AriaDatePicker
        id={id}
        aria-labelledby={id ? `${id}-label` : undefined}
        aria-describedby={aria["aria-describedby"]}
        isInvalid={aria["aria-invalid"]}
        value={parsed}
        onChange={(next) => commit(next as CalendarDateTime | null)}
        granularity="minute"
        hourCycle={24}
        // A day picked before any time is set starts at 09:00 rather than midnight.
        placeholderValue={morningOf(zoneToday().add({ days: 1 }))}
        minValue={minDate ? safeParse(parseDate, minDate) : undefined}
        isDisabled={isDisabled}
        className={cx("w-full max-w-72", className)}
      >
        <Group className={groupClass}>
          <Segments />
          {clearable && parsed && <ClearButton onClear={() => commit(null)} isDisabled={isDisabled} />}
          <AriaButton className={iconButtonClass} aria-label="Open calendar">
            <CalendarIcon className="size-4" />
          </AriaButton>
        </Group>
        <PickerPopover>
          <MonthCalendar />
          <div className="flex items-center justify-between gap-3 border-t border-rule pt-3">
            <span className="text-sm text-muted">Time</span>
            <TimeField
              aria-label="Time"
              hourCycle={24}
              value={parsed ? new Time(parsed.hour, parsed.minute) : null}
              // With no day picked yet, the time applies to tomorrow, the same default the calendar uses.
              onChange={(time) => {
                if (!time) return;
                const base = parsed ?? morningOf(zoneToday().add({ days: 1 }));
                commit(base.set({ hour: time.hour, minute: time.minute }));
              }}
              className="w-24"
            >
              <Group className={cx(groupClass, "h-8 pr-2")}>
                <Segments className="justify-center" />
              </Group>
            </TimeField>
          </div>
          <Presets presets={presets} onPick={commit} />
        </PickerPopover>
      </AriaDatePicker>
    </I18nProvider>
  );
}

/** Today in the organization's time zone as `YYYY-MM-DD`, for `minDate`. */
export const todayInZone = () => zoneToday().toString();
