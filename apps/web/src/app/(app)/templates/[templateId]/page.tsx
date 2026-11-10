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
  const { campaigns } = useCampaignNames();

  const { data: template, isLoading, error, refetch } = useGetTemplateQuery({ templateId });
  const [updateTemplate, { isLoading: isSaving, error: updateError }] = useUpdateTemplateMutation();
  const [deleteTemplate, { isLoading: isDeleting, error: deleteError }] = useDeleteTemplateMutation();

  // Templates are shared, so any number of campaigns may send this one.
  const usedBy = campaigns?.filter((campaign) => campaign.template_id === templateId) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/templates", label: "Templates" }}
        title={template ? template.name || "Untitled template" : isLoading ? <Skeleton className="h-7 w-56" /> : "Template"}
        description={
          template && (
            <>
              {usedBy.length > 0 ? (
                <>
                  Used by{" "}
                  {usedBy.map((campaign, index) => (
                    <span key={campaign.id}>
                      {index > 0 && ", "}
                      <Link href={`/campaigns/${campaign.id}`} className="text-text hover:underline">
                        {campaign.name || "Untitled campaign"}
                      </Link>
                    </span>
                  ))}
                  .{" "}
                </>
              ) : (
                "Not used by any campaign yet. "
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
            onSubmit={(values) => updateTemplate({ templateId, ...values })}
          />
          {ability.can("delete", "Template") && (
            <div className="mt-4 border-t border-border">
              <DeleteSection
                noun="template"
                name={template.name || "Untitled template"}
                consequence="Permanently removes the template. Draft campaigns that use it need another before they can be scheduled; it can't be deleted while a scheduled campaign uses it."
                isOpen={dialog?.type === "delete"}
                onOpenChange={(open) => dispatch(open ? templateDeleteDialogOpened(templateId) : templateDialogClosed())}
                isDeleting={isDeleting}
                error={deleteError}
                onConfirm={async () => {
                  const result = await deleteTemplate({ templateId });
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
