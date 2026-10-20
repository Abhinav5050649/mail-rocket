"use client";

import * as React from "react";
import { Trash01 } from "@untitledui/icons";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { SettingsSection } from "@/components/ui/page";
import { getApiErrorMessage } from "@/lib/redux/api/errors";

interface DeleteSectionProps {
  /** Lower-case noun: "campaign", "template". */
  noun: string;
  /** The object's name, repeated in the confirmation so it's clear what goes. */
  name: string;
  /** The consequence, in words. */
  consequence: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  error?: FetchBaseQueryError | SerializedError;
  onConfirm: () => void;
}

/**
 * The last settings row of a detail page: the consequence in words and an
 * outlined destructive button, confirmed in a dialog that names the object.
 */
export function DeleteSection({ noun, name, consequence, isOpen, onOpenChange, isDeleting, error, onConfirm }: DeleteSectionProps) {
  return (
    <SettingsSection title={`Delete ${noun}`} description={consequence}>
      <div className="flex flex-col items-start gap-2">
        <Button variant="danger" icon={Trash01} onClick={() => onOpenChange(true)}>
          Delete {noun}
        </Button>
        {error && !isOpen && <p className="text-sm text-negative">{getApiErrorMessage(error)}</p>}
      </div>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title={`Delete “${name}”?`}
        description={
          <>
            {consequence} This can&apos;t be undone.
            {error && <span className="mt-2 block text-negative">{getApiErrorMessage(error)}</span>}
          </>
        }
        confirmLabel={`Delete ${noun}`}
        isLoading={isDeleting}
        onConfirm={onConfirm}
      />
    </SettingsSection>
  );
}
