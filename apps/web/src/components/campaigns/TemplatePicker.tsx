"use client";

import { useState } from "react";
import { LinkExternal01 } from "@untitledui/icons";
import { Select } from "@/components/ui/field";
import { fillSamples } from "@/components/templates/TemplateEditor";
import type { Template } from "@/types/resources";

interface TemplatePickerProps {
  /** The template library; undefined while it loads. */
  templates: Template[] | undefined;
  /** The chosen template's id, or "" for none. */
  value: string;
  onChange: (templateId: string) => void;
  disabled?: boolean;
  id?: string;
  /** Fills `{{organization_name}}` in the preview. */
  organizationName?: string | null;
}

/** A small text link that opens in a new tab, so the campaign form keeps its unsaved state. */
function NewTabLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-muted underline-offset-3 hover:text-text hover:underline">
      {children}
      <LinkExternal01 className="size-3.5" aria-hidden />
    </a>
  );
}

/**
 * Pick the template a campaign sends from the library, and see it right
 * there: a preview with sample values in place of the `{{variables}}`,
 * rendered in a sandboxed iframe with scripts disabled. Editing or adding a
 * template opens in a new tab, so nothing typed into the campaign is lost.
 */
export function TemplatePicker({ templates, value, onChange, disabled, id, organizationName }: TemplatePickerProps) {
  const [showPreview, setShowPreview] = useState(true);
  const selected = templates?.find((template) => template.id === value);

  const options = [
    { label: templates ? "Choose a template" : "Loading templates…", value: "" },
    ...(templates ?? []).map((template) => ({ label: template.name || "Untitled template", value: template.id })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value)} options={options} disabled={disabled} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {selected && (
          <button
            type="button"
            onClick={() => setShowPreview((open) => !open)}
            aria-expanded={showPreview}
            className="text-sm text-muted underline-offset-3 hover:text-text hover:underline"
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
        )}
        {selected && <NewTabLink href={`/templates/${selected.id}`}>Edit template</NewTabLink>}
        <NewTabLink href="/templates/new">New template</NewTabLink>
      </div>

      {selected && showPreview && (
        <div className="overflow-hidden rounded-control border border-control bg-white">
          <iframe
            title={`Preview of ${selected.name || "the template"}`}
            sandbox=""
            srcDoc={fillSamples(selected.html_body ?? "", organizationName)}
            className="h-[420px] w-full"
          />
        </div>
      )}
      {selected && showPreview && <p className="text-xs text-muted">Shown with sample values; each subscriber gets their own.</p>}
    </div>
  );
}
