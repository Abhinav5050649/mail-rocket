"use client";

import { Plus, Trash01 } from "@untitledui/icons";
import { ResourceTable } from "@/components/data/ResourceTable";
import { LimitOffsetPagination } from "@/components/data/LimitOffsetPagination";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { Can } from "@/components/auth/Can";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { NativeSelect } from "@/components/base/select/select-native";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useAbility } from "@/hooks/useAbility";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { getApiErrorMessage } from "@/lib/redux/api/errors";
import { PRESETS, type KeyPreset } from "@/lib/auth/abilities";
import { useGetMeQuery } from "@/features/session";
import {
  useGetKeysQuery,
  useUpdateKeyMutation,
  useRevokeKeyMutation,
  selectKeyDialog,
  keyRevokeDialogOpened,
  keyDialogClosed,
  type ApiKey,
  type ApiKeySummary,
} from "@/features/keys";

const PRESET_OPTIONS = PRESETS.map((preset) => ({ label: preset[0]!.toUpperCase() + preset.slice(1), value: preset }));
/** Shown (disabled) for a key whose claims match no preset - change it via the API with an explicit claim list. */
const CUSTOM_OPTION = { label: "Custom", value: "" };

/** Full rows carry `prefix`; callers without `create Key` only get the summary shape. */
const isFullKey = (key: ApiKey | ApiKeySummary): key is ApiKey => "prefix" in key;

export default function KeysPage() {
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectKeyDialog);
  const { limit, offset, setLimit, setOffset } = usePaginationParams();
  const { data: keys, isLoading, error } = useGetKeysQuery({ limit, offset });
  const [updateKey, { error: updateError }] = useUpdateKeyMutation();
  const [revokeKey, { isLoading: isRevoking }] = useRevokeKeyMutation();
  const { data: me } = useGetMeQuery();
  const { ability } = useAbility();

  const target = dialog?.type === "delete" ? keys?.find((key) => key.id === dialog.id) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-primary">API keys</h1>
          <p className="text-sm text-tertiary">Every person, script and integration signs in with its own key. A key&apos;s preset decides what it can do.</p>
        </div>
        <Can I="create" a="Key">
          <Button href="/settings/keys/new" iconLeading={Plus}>
            New key
          </Button>
        </Can>
      </div>

      {updateError && <p className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle">{getApiErrorMessage(updateError)}</p>}

      <ResourceTable
        rows={keys}
        loading={isLoading}
        error={error}
        emptyMessage="No keys."
        columns={[
          {
            header: "Name",
            render: (key) => (
              <span className="flex items-center gap-2">
                {key.name}
                {key.id === me?.id && (
                  <Badge size="sm" color="brand">
                    You
                  </Badge>
                )}
              </span>
            ),
          },
          { header: "Key", render: (key) => (isFullKey(key) ? <code className="font-mono text-xs">{key.prefix}…</code> : "—") },
          {
            header: "Preset",
            render: (key) => (
              <NativeSelect
                size="sm"
                className="w-32"
                options={key.preset ? PRESET_OPTIONS : [CUSTOM_OPTION, ...PRESET_OPTIONS]}
                value={key.preset ?? ""}
                // The server refuses a key changing its own claims - mirror that here.
                disabled={!ability.can("update", "Key") || key.id === me?.id}
                onChange={(e) => e.target.value && updateKey({ keyId: key.id, preset: e.target.value as KeyPreset })}
              />
            ),
          },
          {
            header: "Expires",
            render: (key) => (isFullKey(key) ? (key.expires_at ? new Date(key.expires_at).toLocaleDateString() : "Never") : "—"),
          },
          {
            header: "",
            align: "right",
            render: (key) =>
              key.id !== me?.id && (
                <Can I="delete" a="Key">
                  <ButtonUtility icon={Trash01} size="sm" color="tertiary" tooltip="Revoke" onClick={() => dispatch(keyRevokeDialogOpened(key.id))} />
                </Can>
              ),
          },
        ]}
      />

      <LimitOffsetPagination limit={limit} offset={offset} rowCount={keys?.length ?? 0} onLimitChange={setLimit} onOffsetChange={setOffset} />

      <ConfirmDialog
        isOpen={dialog?.type === "delete"}
        onOpenChange={(open) => !open && dispatch(keyDialogClosed())}
        title={`Revoke ${target ? `"${target.name}"` : "this key"}?`}
        description="Anything using this key loses access immediately. Revoking can't be undone - mint a new key instead."
        confirmLabel="Revoke"
        isLoading={isRevoking}
        onConfirm={async () => {
          if (dialog?.type === "delete") {
            await revokeKey({ keyId: dialog.id });
            dispatch(keyDialogClosed());
          }
        }}
      />
    </div>
  );
}
