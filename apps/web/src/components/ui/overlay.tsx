"use client";

import * as React from "react";
import {
  Button as AriaButton,
  Dialog,
  Heading,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuTrigger,
  Modal,
  ModalOverlay,
  Popover,
  Separator,
  type Key,
} from "react-aria-components";
import { Button } from "./button";
import { cx } from "@/utils/cx";

/**
 * Overlays built on react-aria-components for focus trapping, Escape and
 * outside-click handling. They are the only surfaces in the app that cast a
 * shadow, because they are the only things that float.
 */

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** The consequence, in words. */
  description: React.ReactNode;
  confirmLabel: string;
  isLoading?: boolean;
  onConfirm: () => void;
}

/** Confirmation for a destructive action. The confirm button names the action ("Delete campaign"). */
export function ConfirmDialog({ isOpen, onOpenChange, title, description, confirmLabel, isLoading, onConfirm }: ConfirmDialogProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={!isLoading}
      className="fixed inset-0 z-50 flex items-end justify-center bg-(--scrim) p-4 data-entering:animate-in data-entering:fade-in sm:items-center"
    >
      <Modal className="w-full max-w-md data-entering:animate-in data-entering:zoom-in-95">
        <Dialog role="alertdialog" className="flex flex-col gap-5 rounded-card bg-sheet p-5 shadow-[0_12px_32px_rgb(0_0_0/0.18)] outline-none">
          <div className="flex flex-col gap-1.5">
            <Heading slot="title" className="text-base font-medium text-text">
              {title}
            </Heading>
            <div className="text-sm text-muted">{description}</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} isLoading={isLoading} autoFocus>
              {confirmLabel}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export interface MenuItem {
  id: string;
  label: string;
  /** Grey second line. */
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Draws a separator above this item. */
  separated?: boolean;
}

/** A dropdown menu opened by `trigger` (rendered as the menu's button). */
export function Menu({
  trigger,
  triggerClassName,
  triggerLabel,
  items,
  onAction,
  placement = "bottom end",
  className,
}: {
  trigger: React.ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  items: MenuItem[];
  onAction: (id: string) => void;
  placement?: "bottom end" | "bottom start" | "top start" | "top end";
  className?: string;
}) {
  return (
    <MenuTrigger>
      <AriaButton aria-label={triggerLabel} className={cx("outline-none data-focus-visible:outline-2 data-focus-visible:outline-focus", triggerClassName)}>
        {trigger}
      </AriaButton>
      <Popover
        placement={placement}
        offset={6}
        className={cx(
          "min-w-52 overflow-auto rounded-card border border-border bg-sheet p-1 shadow-[0_8px_24px_rgb(0_0_0/0.12)] outline-none data-entering:animate-in data-entering:fade-in",
          className,
        )}
      >
        <AriaMenu className="outline-none" onAction={(key: Key) => onAction(String(key))}>
          {items.flatMap((item) => [
            ...(item.separated ? [<Separator key={`${item.id}-sep`} className="my-1 h-px bg-rule" />] : []),
            <AriaMenuItem
              key={item.id}
              id={item.id}
              textValue={item.label}
              className="flex cursor-pointer items-start gap-2.5 rounded-[5px] px-2.5 py-1.5 text-sm text-text outline-none data-focused:bg-raised"
            >
              {item.icon && <item.icon className="mt-0.5 size-4 shrink-0 text-muted" />}
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{item.label}</span>
                {item.description && <span className="text-xs text-muted">{item.description}</span>}
              </span>
            </AriaMenuItem>,
          ])}
        </AriaMenu>
      </Popover>
    </MenuTrigger>
  );
}
