import { Badge } from "@/components/base/badges/badges";
import type { CampaignStatus } from "@/types/resources";

const COLOR: Record<CampaignStatus, "gray" | "sky" | "warning" | "success" | "error"> = {
  draft: "gray",
  scheduled: "sky",
  sending: "warning",
  sent: "success",
  failed: "error",
};

export function CampaignStatusChip({ status }: { status: CampaignStatus }) {
  return (
    <Badge size="sm" color={COLOR[status]} className="capitalize">
      {status}
    </Badge>
  );
}
