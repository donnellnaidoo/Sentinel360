"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

export default function AdminSettingsPage() {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [flagName, setFlagName] = useState("");
  const [flagDescription, setFlagDescription] = useState("");

  const { data: settings, isLoading: settingsLoading } = useQuery(
    trpc.settings.listSettings.queryOptions(),
  );
  const { data: flags, isLoading: flagsLoading } = useQuery(
    trpc.settings.listFeatureFlags.queryOptions(),
  );

  const invalidateSettings = () =>
    queryClient.invalidateQueries({ queryKey: trpc.settings.listSettings.queryKey() });
  const invalidateFlags = () =>
    queryClient.invalidateQueries({ queryKey: trpc.settings.listFeatureFlags.queryKey() });

  const upsertSetting = useMutation(
    trpc.settings.upsertSetting.mutationOptions({
      onSuccess: () => {
        invalidateSettings();
        setNewKey("");
        setNewValue("");
        setJsonError(null);
      },
      onError: (err) => setJsonError(err.message),
    }),
  );

  const deleteSetting = useMutation(
    trpc.settings.deleteSetting.mutationOptions({ onSuccess: invalidateSettings }),
  );

  const createFlag = useMutation(
    trpc.settings.createFeatureFlag.mutationOptions({
      onSuccess: () => {
        invalidateFlags();
        setFlagName("");
        setFlagDescription("");
      },
    }),
  );

  const toggleFlag = useMutation(
    trpc.settings.toggleFeatureFlag.mutationOptions({ onSuccess: invalidateFlags }),
  );

  const saveEdit = (settingKey: string, settingType: string) => {
    const raw = editValues[settingKey];
    if (raw === undefined) return;
    try {
      const parsed = JSON.parse(raw);
      setJsonError(null);
      upsertSetting.mutate({ settingKey, settingValue: parsed, settingType });
    } catch {
      setJsonError(`"${settingKey}" is not valid JSON`);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">System Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Key/value configuration read by the platform at runtime.
        </p>
      </div>

      {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}

      <div className="bg-card border border-border/30 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-muted/50 px-5 py-3 border-b border-border/50">
          <h3 className="font-semibold text-sm text-foreground">Settings</h3>
        </div>
        {settingsLoading && <p className="p-5 text-sm text-muted-foreground">Loading...</p>}
        {!settingsLoading && settings?.length === 0 && (
          <p className="p-5 text-sm text-muted-foreground">No settings configured yet — add one below.</p>
        )}
        <div className="divide-y divide-border/30">
          {settings?.map((s) => {
            const raw = editValues[s.settingKey] ?? JSON.stringify(s.settingValue);
            return (
              <div key={s.id} className="p-5 flex items-center gap-4">
                <div className="w-56 shrink-0">
                  <p className="font-mono text-sm font-semibold">{s.settingKey}</p>
                  <p className="text-xs text-muted-foreground">{s.settingType}</p>
                </div>
                <input
                  value={raw}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [s.settingKey]: e.target.value }))}
                  className="flex-1 border border-input bg-background rounded-lg px-3 py-2 text-sm font-mono"
                />
                <button
                  disabled={upsertSetting.isPending}
                  onClick={() => saveEdit(s.settingKey, s.settingType)}
                  className="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  disabled={deleteSetting.isPending}
                  onClick={() => {
                    if (confirm(`Delete setting "${s.settingKey}"?`)) deleteSetting.mutate({ id: s.id });
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            );
          })}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const parsed = newValue.trim() ? JSON.parse(newValue) : {};
              setJsonError(null);
              upsertSetting.mutate({ settingKey: newKey, settingValue: parsed });
            } catch {
              setJsonError("New value is not valid JSON");
            }
          }}
          className="p-5 border-t border-border flex gap-3 bg-muted/20"
        >
          <input
            required
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="setting_key"
            className="w-56 shrink-0 border border-input bg-background rounded-lg px-3 py-2 text-sm font-mono"
          />
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder='JSON value, e.g. "true" or {"key":"value"}'
            className="flex-1 border border-input bg-background rounded-lg px-3 py-2 text-sm font-mono"
          />
          <button
            type="submit"
            disabled={upsertSetting.isPending}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground">Feature Flags</h2>
        <p className="text-sm text-muted-foreground mt-1">Toggle platform features on or off.</p>
      </div>

      <div className="bg-card border border-border/30 rounded-lg shadow-sm overflow-hidden">
        {flagsLoading && <p className="p-5 text-sm text-muted-foreground">Loading...</p>}
        {!flagsLoading && flags?.length === 0 && (
          <p className="p-5 text-sm text-muted-foreground">No feature flags yet — add one below.</p>
        )}
        <div className="divide-y divide-border/30">
          {flags?.map((f) => (
            <div key={f.id} className="p-5 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-sm">{f.name}</p>
                {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={f.isEnabled}
                  onChange={(e) => toggleFlag.mutate({ id: f.id, isEnabled: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-xs font-medium">{f.isEnabled ? "Enabled" : "Disabled"}</span>
              </label>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createFlag.mutate({ name: flagName, description: flagDescription || undefined });
          }}
          className="p-5 border-t border-border flex gap-3 bg-muted/20"
        >
          <input
            required
            value={flagName}
            onChange={(e) => setFlagName(e.target.value)}
            placeholder="flag_name"
            className="w-56 shrink-0 border border-input bg-background rounded-lg px-3 py-2 text-sm font-mono"
          />
          <input
            value={flagDescription}
            onChange={(e) => setFlagDescription(e.target.value)}
            placeholder="Description"
            className="flex-1 border border-input bg-background rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={createFlag.isPending}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
