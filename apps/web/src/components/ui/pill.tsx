import { cx } from "@/utils/cx";
import { capitalize } from "@/lib/format";
import type { CampaignStatus, IdentityStatus } from "@/types/resources";

export type Tone = "neutral" | "accent" | "positive" | "negative" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-(--pill-neutral-bg) text-(--pill-neutral-ink)",
  accent: "bg-accent-soft text-accent-ink",
  positive: "bg-(--pill-positive-bg) text-(--pill-positive-ink)",
  negative: "bg-(--pill-negative-bg) text-(--pill-negative-ink)",
  warning: "bg-(--pill-warning-bg) text-(--pill-warning-ink)",
};

/** A pale tint with dark text of the same hue. Inside rows and beside a value only, never above a heading. */
export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-5 flex-none items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Campaign lifecycle tones; the colour says where the send stands. */
export const CAMPAIGN_TONE: Record<CampaignStatus, Tone> = {
  draft: "neutral",
  scheduled: "accent",
  sending: "warning",
  sent: "positive",
  failed: "negative",
};

export function CampaignStatusPill({ status }: { status: CampaignStatus }) {
  return (
    <Pill tone={CAMPAIGN_TONE[status]}>
      {status === "sending" && <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
      {capitalize(status)}
    </Pill>
  );
}

const IDENTITY_TONE: Record<IdentityStatus, Tone> = { created: "neutral", pending: "warning", active: "positive" };
const IDENTITY_LABEL: Record<IdentityStatus, string> = { created: "Created", pending: "Awaiting verification", active: "Verified" };

export function IdentityStatusPill({ status }: { status: IdentityStatus }) {
  return <Pill tone={IDENTITY_TONE[status]}>{IDENTITY_LABEL[status]}</Pill>;
}
