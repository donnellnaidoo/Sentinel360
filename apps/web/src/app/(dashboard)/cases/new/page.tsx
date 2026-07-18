"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export default function NewCasePage() {
  const router = useRouter();
  const [caseType, setCaseType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]>("MEDIUM");

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
    createCase.mutate({ caseType, title, description: description || undefined, priority });
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
          <input
            required
            minLength={2}
            maxLength={100}
            value={caseType}
            onChange={(e) => setCaseType(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
            placeholder="e.g. Burglary, Fraud, Cyber Intrusion"
          />
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
