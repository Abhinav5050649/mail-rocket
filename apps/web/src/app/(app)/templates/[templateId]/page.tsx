"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { DeleteSection } from "@/components/resources/DeleteSection";
import { PageHeader } from "@/components/ui/page";
import { ErrorNotice, Skeleton } from "@/components/ui/feedback";
import { useAbility } from "@/hooks/useAbility";
import { useCampaignNames } from "@/hooks/useLookups";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { formatDateTime } from "@/lib/format";
import {
  useGetTemplateQuery,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  selectTemplateDialog,
  templateDeleteDialogOpened,
  templateDialogClosed,
} from "@/features/templates";

export default function TemplateDetailPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = use(params);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectTemplateDialog);
  const { ability } = useAbility();
  const { campaignName } = useCampaignNames();

  const { data: template, isLoading, error, refetch } = useGetTemplateQuery({ templateId });
  const [updateTemplate, { isLoading: isSaving, error: updateError }] = useUpdateTemplateMutation();
  const [deleteTemplate, { isLoading: isDeleting, error: deleteError }] = useDeleteTemplateMutation();

  const campaign = campaignName(template?.campaign_id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/templates", label: "Templates" }}
        title={template ? template.name || "Untitled template" : isLoading ? <Skeleton className="h-7 w-56" /> : "Template"}
        description={
          template && (
            <>
              {template.campaign_id && campaign ? (
                <>
                  Sent by{" "}
                  <Link href={`/campaigns/${template.campaign_id}`} className="text-text hover:underline">
                    {campaign}
                  </Link>
                  .{" "}
                </>
              ) : (
                "Not linked to a campaign. "
              )}
              Last saved {formatDateTime(template.updated_at ?? template.created_at)}.
            </>
          )
        }
      />

      {error ? (
        <ErrorNotice error={error} what="this template" onRetry={refetch} />
      ) : !template ? (
        <Skeleton className="h-[560px] w-full" />
      ) : (
        <>
          <TemplateForm
            key={template.updated_at ?? template.created_at}
            mode="edit"
            initialData={template}
            readOnly={!ability.can("update", "Template")}
            isSubmitting={isSaving}
            error={updateError}
            onSubmit={(values) => updateTemplate({ templateId, ...values, campaign_id: values.campaign_id || undefined })}
          />
          {ability.can("delete", "Template") && (
            <div className="mt-4 border-t border-border">
              <DeleteSection
                noun="template"
                name={template.name || "Untitled template"}
                consequence="Permanently removes the template. A campaign that uses it has nothing to send until it gets another."
                isOpen={dialog?.type === "delete"}
                onOpenChange={(open) => dispatch(open ? templateDeleteDialogOpened(templateId) : templateDialogClosed())}
                isDeleting={isDeleting}
                error={deleteError}
                onConfirm={async () => {
                  const result = await deleteTemplate({ templateId, campaignId: template.campaign_id ?? undefined });
                  if (!("error" in result)) {
                    dispatch(templateDialogClosed());
                    router.push("/templates");
                  }
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
