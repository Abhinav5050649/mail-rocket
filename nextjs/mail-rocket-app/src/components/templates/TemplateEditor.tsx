"use client";

import * as React from "react";
import { Code02 } from "@untitledui/icons";
import { Menu } from "@/components/ui/overlay";
import { TEMPLATE_VARIABLES } from "@/lib/constants/templateVariables";
import { cx } from "@/utils/cx";

/**
 * Example values the preview fills variables with. They are labelled as
 * samples on screen; real values come from each recipient at send time.
 */
const SAMPLE_VALUES: Record<string, string> = {
  recipient_first_name: "Priya",
  recipient_last_name: "Raman",
  recipient_full_name: "Priya Raman",
  recipient_email: "priya@example.com",
  group_name: "Newsletter subscribers",
  campaign_name: "Your campaign",
  campaign_start_date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  organization_name: "Your organization",
  sender_email: "hello@example.com",
};

const VARIABLE_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Replaces known `{{variables}}` with sample values; unknown ones stay visible. */
function fillSamples(html: string, organizationName?: string | null) {
  return html.replace(VARIABLE_PATTERN, (match, token: string) => {
    if (token === "organization_name" && organizationName) return organizationName;
    return SAMPLE_VALUES[token] ?? match;
  });
}

/** `{{variables}}` in the body that the send pipeline doesn't know, so they'd be sent literally. */
export function unknownVariables(html: string) {
  const known = new Set<string>(TEMPLATE_VARIABLES.map((variable) => variable.token));
  return [...new Set([...html.matchAll(VARIABLE_PATTERN)].map((match) => match[1]!))].filter((token) => !known.has(token));
}

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  organizationName?: string | null;
  readOnly?: boolean;
}

/**
 * HTML source on the left, the rendered email on the right. A native
 * textarea so "Insert variable" can read and set the cursor directly. The
 * preview renders in a sandboxed iframe with scripts disabled.
 */
export function TemplateEditor({ value, onChange, organizationName, readOnly }: TemplateEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [previewMode, setPreviewMode] = React.useState<"sample" | "raw">("sample");
  // Debounce the preview so typing doesn't re-render the iframe on every keystroke.
  const deferred = React.useDeferredValue(value);
  const unknown = unknownVariables(value);

  const insertVariable = (token: string) => {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    const insert = `{{${token}}}`;
    onChange(`${value.slice(0, start)}${insert}${value.slice(end)}`);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + insert.length, start + insert.length);
    });
  };

  const srcDoc = previewMode === "sample" ? fillSamples(deferred, organizationName) : deferred;

  return (
    <div className="grid overflow-hidden rounded-card border border-border lg:grid-cols-2">
      <div className="flex min-w-0 flex-col border-border max-lg:border-b lg:border-r">
        <div className="flex h-11 items-center justify-between gap-2 border-b border-rule bg-raised px-3">
          <label htmlFor="template-html" className="text-sm font-medium text-text">
            HTML
          </label>
          {!readOnly && (
            <Menu
              triggerLabel="Insert variable"
              triggerClassName="flex h-7 items-center gap-1.5 rounded-control px-2 text-sm text-muted transition-colors hover:bg-active hover:text-text"
              trigger={
                <>
                  <Code02 className="size-4" />
                  Insert variable
                </>
              }
              className="max-h-80 w-80"
              items={TEMPLATE_VARIABLES.map((variable) => ({ id: variable.token, label: `{{${variable.token}}}`, description: variable.description }))}
              onAction={insertVariable}
            />
          )}
        </div>
        <textarea
          id="template-html"
          ref={textareaRef}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          placeholder={"<p>Hi {{recipient_first_name}},</p>"}
          className="min-h-[420px] w-full flex-1 resize-y bg-sheet p-4 font-mono text-[13px] leading-5 text-text outline-none placeholder:text-faint focus-visible:outline-none lg:min-h-[540px]"
        />
        {unknown.length > 0 && (
          <p className="border-t border-rule px-4 py-2.5 text-sm text-warning">
            Not a known variable, so it would be sent as written: {unknown.map((token) => `{{${token}}}`).join(", ")}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex h-11 items-center justify-between gap-2 border-b border-rule bg-raised px-3">
          <span className="text-sm font-medium text-text">Preview</span>
          <div role="radiogroup" aria-label="Preview variables as" className="flex rounded-control bg-active p-0.5">
            {(["sample", "raw"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={previewMode === mode}
                onClick={() => setPreviewMode(mode)}
                className={cx(
                  "h-6 rounded-[4px] px-2 text-xs transition-colors",
                  previewMode === mode ? "bg-sheet font-medium text-text" : "text-muted hover:text-text",
                )}
              >
                {mode === "sample" ? "Sample values" : "Variables"}
              </button>
            ))}
          </div>
        </div>
        {value.trim() ? (
          <iframe title="Email preview" sandbox="" srcDoc={srcDoc} className="min-h-[420px] w-full flex-1 bg-white lg:min-h-[540px]" />
        ) : (
          <div className="flex min-h-[420px] flex-1 items-center justify-center p-6 text-center text-sm text-muted lg:min-h-[540px]">
            The rendered email appears here as you write.
          </div>
        )}
      </div>
    </div>
  );
}
