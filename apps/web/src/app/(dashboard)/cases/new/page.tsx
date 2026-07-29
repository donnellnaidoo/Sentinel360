"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const CASE_TYPE_OPTIONS = [
  "Burglary",
  "Robbery",
  "Assault",
  "Murder",
  "Fraud",
  "Cyber Intrusion",
  "Drug-Related",
  "Vehicle Theft",
  "Missing Person",
  "Domestic Violence",
  "Other",
] as const;

export default function NewCasePage() {
  const router = useRouter();
  const [caseType, setCaseType] = useState<(typeof CASE_TYPE_OPTIONS)[number] | "">("");
  const [customCaseType, setCustomCaseType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]>("MEDIUM");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [isSensitive, setIsSensitive] = useState(false);

  const assignableQuery = useQuery(trpc.cases.listAssignableInvestigators.queryOptions());

  const createCase = useMutation(
    trpc.cases.create.mutationOptions({
      onSuccess: (created) => {
        queryClient.invalidateQueries({ queryKey: trpc.cases.list.queryKey() });
        if (created) {
          router.push(`/docket/${created.id}`);
        } else {
          router.push("/cases");
        }
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCase.mutate({
      caseType: caseType === "Other" ? customCaseType : caseType,
      title,
      description: description || undefined,
      priority,
      assignedToUserId: assignedToUserId || undefined,
      isSensitive,
    });
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Open New Case</h2>
      <p className="text-on-surface-variant font-body-md text-body-md mb-stack-lg">
        A case number will be generated automatically once created.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-stack-lg space-y-5"
      >
        {createCase.isError && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl font-body-sm text-body-sm">
            {createCase.error.message}
          </div>
        )}

        <div>
          <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">
            Title
          </label>
          <input
            required
            minLength={2}
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
            placeholder="e.g. Warehouse break-in — Sector 4"
          />
        </div>

        <div>
          <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">
            Case Type
          </label>
          <select
            required
            value={caseType}
            onChange={(e) => setCaseType(e.target.value as (typeof CASE_TYPE_OPTIONS)[number])}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
          >
            <option value="" disabled>
              Select a case type...
            </option>
            {CASE_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {caseType === "Other" && (
            <input
              required
              minLength={2}
              maxLength={100}
              value={customCaseType}
              onChange={(e) => setCustomCaseType(e.target.value)}
              className="w-full mt-2 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
              placeholder="Describe the case type"
            />
          )}
        </div>

        <div>
          <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">
            Assign Investigator (optional)
          </label>
          <select
            value={assignedToUserId}
            onChange={(e) => setAssignedToUserId(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
          >
            <option value="">Leave unassigned</option>
            {assignableQuery.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2.5 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isSensitive}
            onChange={(e) => setIsSensitive(e.target.checked)}
          />
          <span className="material-symbols-outlined text-base text-on-surface-variant">lock</span>
          <span className="text-body-sm">
            Sensitive case — restrict visibility to the assigned investigator and admins
          </span>
        </label>

        <div>
          <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={10000}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
            placeholder="Details known at intake..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/cases")}
            className="px-5 py-2.5 rounded-xl font-body-md text-body-md font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createCase.isPending}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-body-md text-body-md font-bold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {createCase.isPending ? "Creating..." : "Create Case"}
          </button>
        </div>
      </form>
    </div>
  );
}
