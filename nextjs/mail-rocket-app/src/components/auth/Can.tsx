"use client";

import * as React from "react";
import { useAbility } from "@/hooks/useAbility";
import type { Action, Subject } from "@/lib/auth/abilities";

interface CanProps {
  /** The action the wrapped control performs. */
  I: Action;
  /** The resource it performs it on. */
  a: Subject;
  mode?: "hide" | "disable";
  children: React.ReactElement;
}

/**
 * Gates a single control (button, menu item, form, ...) by the signed-in
 * key's claims. UX only - bun/api independently enforces the same claim via
 * `requireAbility`, so a mutation can still come back 403 (e.g. the key's
 * claims changed in another tab) and must be handled gracefully regardless.
 */
export function Can({ I: action, a: subject, mode = "hide", children }: CanProps) {
  const { ability, isLoading } = useAbility();
  const allowed = !isLoading && ability.can(action, subject);

  if (allowed) return children;
  if (mode === "hide") return null;
  // Untitled UI's react-aria-based controls use `isDisabled`; plain native
  // elements use `disabled` - set both so this works on either.
  return React.cloneElement(children, { disabled: true, isDisabled: true } as Partial<unknown>);
}
