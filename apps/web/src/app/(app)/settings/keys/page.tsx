"use client";

import { Plus, Trash01 } from "@untitledui/icons";
import { Button, IconButton } from "@/components/ui/button";
import { DataTable, Pagination } from "@/components/ui/data-table";
import { Dash, PageHeader } from "@/components/ui/page";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/field";
import { EmptyState, FormError } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Can } from "@/components/auth/Can";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import { useAbility } from "@/hooks/useAbility";
import { useNow } from "@/hooks/useNow";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { PRESETS, PRESET_DESCRIPTIONS, type KeyPreset } from "@mail-rocket/shared";
import { capitalize, formatDate, formatRelative } from "@/lib/format";
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

const PRESET_OPTIONS = PRESETS.map((preset) => ({ label: capitalize(preset), value: preset }));

/** Full rows carry `prefix`; keys without `create Key` only receive the summary shape. */
const isFullKey = (key: ApiKey | ApiKeySummary): key is ApiKey => "prefix" in key;

/** When a key stops working, in words; expired keys read in the negative colour. */
function Expiry({ expiresAt }: { expiresAt: string | null }) {
  const now = useNow();
  if (!expiresAt) return <span className="text-muted">Never</span>;
  const expired = new Date(expiresAt).getTime() < now;
  return (
    <span className="flex flex-col leading-tight">
      <span className={expired ? "text-negative" : "tabular"}>{expired ? "Expired" : formatDate(expiresAt)}</span>
      <span className="text-xs text-muted">{formatRelative(expiresAt, now)}</span>
    </span>
  );
}

export default function KeysPage() {
  const dispatch = useAppDispatch();
  const dialog = useAppSelector(selectKeyDialog);
  const { limit, offset, setOffset } = usePaginationParams();
  const { data: keys, isLoading, error, refetch } = useGetKeysQuery({ limit, offset });
  const [updateKey, { error: updateError }] = useUpdateKeyMutation();
  const [revokeKey, { isLoading: isRevoking }] = useRevokeKeyMutation();
  const { data: me } = useGetMeQuery();
  const { ability } = useAbility();

  const target = dialog?.type === "delete" ? keys?.find((key) => key.id === dialog.id) : undefined;
  const canEdit = ability.can("update", "Key");

  const action = (
    <Can I="create" a="Key">
      <Button href="/settings/keys/new" variant="primary" icon={Plus}>
        New key
      </Button>
    </Can>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="API keys"
        description="Every person, script and AI client signs in with its own key. A key's preset decides what it can see and change."
        actions={action}
      />

      <dl className="grid gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-3">
        {PRESETS.map((preset) => (
          <div key={preset} className="flex flex-col gap-1 bg-sheet p-4">
            <dt className="text-sm font-medium text-text">{capitalize(preset)}</dt>
            <dd className="text-sm text-muted">{PRESET_DESCRIPTIONS[preset]}</dd>
          </div>
        ))}
      </dl>

      <FormError error={updateError} />

      <div>
        <DataTable<ApiKey | ApiKeySummary>
          noun="API keys"
          rows={keys}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          columns={[
            {
              header: "Name",
              cell: (key) => (
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{key.name}</span>
                  {key.id === me?.id && <Pill tone="accent">This key</Pill>}
                </span>
              ),
              className: "w-[28%]",
            },
            { header: "Key", cell: (key) => (isFullKey(key) ? <code className="text-[13px] text-muted">{key.prefix}…</code> : <Dash />), className: "hidden lg:table-cell" },
            {
              header: "Preset",
              cell: (key) => (
                <Select
                  aria-label={`Preset for ${key.name}`}
                  size="sm"
                  className="w-32"
                  options={key.preset ? PRESET_OPTIONS : [{ label: "Custom", value: "" }, ...PRESET_OPTIONS]}
                  value={key.preset ?? ""}
                  // The server refuses a key changing its own claims; mirror that here.
                  disabled={!canEdit || key.id === me?.id}
                  title={key.id === me?.id ? "A key can't change its own preset" : undefined}
                  onChange={(event) => event.target.value && updateKey({ keyId: key.id, preset: event.target.value as KeyPreset })}
                />
              ),
              className: "w-40",
            },
            { header: "Expires", cell: (key) => (isFullKey(key) ? <Expiry expiresAt={key.expires_at} /> : <Dash />), className: "w-36" },
            {
              header: "",
              cell: (key) =>
                key.id !== me?.id && (
                  <Can I="delete" a="Key">
                    <IconButton icon={Trash01} label={`Revoke ${key.name}`} onClick={() => dispatch(keyRevokeDialogOpened(key.id))} className="hover:text-negative" />
                  </Can>
                ),
              align: "right",
              className: "w-14",
            },
          ]}
          mobile={{
            title: (key) => key.name,
            subtitle: (key) => [key.preset ? capitalize(key.preset) : "Custom claims", isFullKey(key) ? `${key.prefix}…` : null].filter(Boolean).join(" · "),
            trailing: (key) =>
              key.id === me?.id ? (
                <Pill tone="accent">This key</Pill>
              ) : (
                <Can I="delete" a="Key">
                  <IconButton icon={Trash01} label={`Revoke ${key.name}`} onClick={() => dispatch(keyRevokeDialogOpened(key.id))} />
                </Can>
              ),
          }}
          empty={<EmptyState title="No keys" action={action} />}
        />
        <Pagination noun="keys" limit={limit} offset={offset} rowCount={keys?.length ?? 0} onOffsetChange={setOffset} />
      </div>

      <ConfirmDialog
        isOpen={dialog?.type === "delete"}
        onOpenChange={(open) => !open && dispatch(keyDialogClosed())}
        title={`Revoke “${target?.name ?? "this key"}”?`}
        description="Anything signed in with this key loses access immediately. Revoking can't be undone; mint a new key instead."
        confirmLabel="Revoke key"
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
