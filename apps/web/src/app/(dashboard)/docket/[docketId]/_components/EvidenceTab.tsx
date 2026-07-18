"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EvidenceTab({ caseId }: { caseId: string }) {
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const evidenceQuery = useQuery(
    trpc.evidence.list.queryOptions({ caseId, limit: 50, offset: 0 }),
  );
  const getDownloadUrl = useMutation(trpc.evidence.getDownloadUrl.mutationOptions());

  const uploadEvidence = useMutation(
    trpc.evidence.upload.mutationOptions({
      onSuccess: () => {
        setUploadTitle("");
        setUploadFile(null);
        setUploadError(null);
        queryClient.invalidateQueries({
          queryKey: trpc.evidence.list.queryKey({ caseId, limit: 50, offset: 0 }),
        });
        queryClient.invalidateQueries({ queryKey: trpc.cases.getById.queryKey({ id: caseId }) });
        queryClient.invalidateQueries({ queryKey: trpc.cases.timeline.queryKey({ caseId }) });
        queryClient.invalidateQueries({ queryKey: trpc.cases.nextActions.queryKey({ caseId }) });
      },
      onError: (err) => setUploadError(err.message),
    }),
  );

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Select a file to upload");
      return;
    }
    setUploadError(null);
    const fileBase64 = await fileToBase64(uploadFile);
    uploadEvidence.mutate({
      caseId,
      type: uploadFile.type.startsWith("image/") ? "IMAGE" : "DOCUMENT",
      title: uploadTitle || uploadFile.name,
      source: "MANUAL_UPLOAD",
      originalFilename: uploadFile.name,
      mimeType: uploadFile.type || "application/octet-stream",
      fileSize: uploadFile.size,
      fileBase64,
    });
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleUpload}
        className="bg-surface-container-low rounded-2xl p-6 border border-dashed border-outline flex flex-col gap-3"
      >
        <h5 className="text-body-lg font-bold">Upload evidence</h5>
        {uploadError && <p className="text-sm text-error">{uploadError}</p>}
        <input
          className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
          placeholder="Title (defaults to filename)"
          value={uploadTitle}
          onChange={(e) => setUploadTitle(e.target.value)}
        />
        <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
        <button
          type="submit"
          disabled={uploadEvidence.isPending}
          className="self-start px-8 py-2 bg-primary text-on-primary rounded-full text-sm font-bold disabled:opacity-50"
        >
          {uploadEvidence.isPending ? "Uploading..." : "Upload"}
        </button>
      </form>

      {evidenceQuery.isLoading && (
        <p className="text-sm text-on-surface-variant">Loading evidence...</p>
      )}
      {evidenceQuery.data?.items.length === 0 && (
        <p className="text-sm text-on-surface-variant">No evidence linked to this case yet.</p>
      )}
      <div className="space-y-3">
        {evidenceQuery.data?.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-surface-container-low p-4 rounded-xl border border-outline-variant/30"
          >
            <div>
              <p className="text-sm font-bold">{item.title}</p>
              <p className="text-xs text-on-surface-variant font-mono">
                {item.fileHash.slice(0, 16)}... · {item.mimeType} ·{" "}
                {(item.fileSize / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={async () => {
                const result = await getDownloadUrl.mutateAsync({ id: item.id });
                window.open(result.url, "_blank", "noopener,noreferrer");
              }}
              className="px-4 py-2 border border-outline rounded-xl text-sm font-semibold hover:bg-surface transition-colors"
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
