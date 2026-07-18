"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const PAGE_SIZE = 12;

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

function iconForMimeType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "videocam";
  if (mimeType.startsWith("audio/")) return "graphic_eq";
  return "description";
}

export default function EvidencePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, string>>({});

  const input = useMemo(
    () => ({ search: search || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [search, page],
  );

  const { data, isLoading, isError, error } = useQuery(trpc.evidence.list.queryOptions(input));

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: trpc.evidence.list.queryKey() });

  const uploadEvidence = useMutation(
    trpc.evidence.upload.mutationOptions({
      onSuccess: () => {
        setUploadTitle("");
        setUploadFile(null);
        setUploadError(null);
        setShowUpload(false);
        invalidateList();
      },
      onError: (err) => setUploadError(err.message),
    }),
  );

  const getDownloadUrl = useMutation(trpc.evidence.getDownloadUrl.mutationOptions());
  const verifyIntegrity = useMutation(
    trpc.evidence.verifyIntegrity.mutationOptions({
      onSuccess: (result, variables) => {
        setVerifyResult((prev) => ({
          ...prev,
          [variables.evidenceId]: result.isValid ? "VALID" : "TAMPERED",
        }));
      },
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
      type: uploadFile.type.startsWith("image/") ? "IMAGE" : "DOCUMENT",
      title: uploadTitle || uploadFile.name,
      source: "MANUAL_UPLOAD",
      originalFilename: uploadFile.name,
      mimeType: uploadFile.type || "application/octet-stream",
      fileSize: uploadFile.size,
      fileBase64,
    });
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <section className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant mb-stack-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-body-sm w-full outline-none"
              placeholder="Search evidence by title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-medium text-body-sm"
        >
          <span className="material-symbols-outlined text-body-sm">upload</span>
          <span>Upload Evidence</span>
        </button>
      </section>

      {showUpload && (
        <form
          onSubmit={handleUpload}
          className="bg-surface-container-lowest rounded-xl p-stack-md border border-outline-variant shadow-sm mb-stack-lg flex flex-col gap-3"
        >
          {uploadError && <p className="text-sm text-error">{uploadError}</p>}
          <input
            className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-low"
            placeholder="Title (defaults to filename)"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
          />
          <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
          <p className="text-xs text-on-surface-variant">
            Not linked to a case yet — link it from a case&apos;s Evidence tab, or upload directly
            from the docket page to link automatically.
          </p>
          <button
            type="submit"
            disabled={uploadEvidence.isPending}
            className="self-start px-8 py-2 bg-primary text-white rounded-full text-sm font-bold disabled:opacity-50"
          >
            {uploadEvidence.isPending ? "Uploading..." : "Upload"}
          </button>
        </form>
      )}

      {isLoading && <p className="text-on-surface-variant text-body-sm">Loading evidence...</p>}
      {isError && <p className="text-error text-body-sm">Failed to load evidence: {error?.message}</p>}
      {!isLoading && !isError && data?.items.length === 0 && (
        <section className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-5xl text-outline-variant">search_off</span>
          </div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">
            No evidence found
          </h2>
          <p className="text-on-surface-variant font-body-md text-body-md max-w-sm mb-8">
            Try adjusting your search, or upload the first piece of evidence.
          </p>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
        {data?.items.map((item) => (
          <div
            key={item.id}
            className="group bg-white rounded-xl border border-outline-variant overflow-hidden transition-all duration-300 flex flex-col"
          >
            <div className="relative h-32 bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-outline text-5xl opacity-40">
                {iconForMimeType(item.mimeType)}
              </span>
              {verifyResult[item.id] && (
                <div
                  className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold ${
                    verifyResult[item.id] === "VALID"
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-error text-white"
                  }`}
                >
                  {verifyResult[item.id]}
                </div>
              )}
            </div>
            <div className="p-stack-md flex-1 flex flex-col">
              <h3 className="font-body-md text-body-md font-bold text-on-surface truncate mb-2">
                {item.title}
              </h3>
              <p className="text-[10px] font-mono text-on-surface-variant mb-4 truncate">
                sha256:{item.fileHash.slice(0, 20)}...
              </p>
              <div className="mt-auto pt-4 border-t border-outline-variant flex justify-between items-center text-on-surface-variant mb-3">
                <div className="flex items-center space-x-1">
                  <span className="material-symbols-outlined !text-sm">calendar_today</span>
                  <span className="text-[12px] font-body-sm">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-[12px] font-body-sm">
                  {(item.fileSize / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const result = await getDownloadUrl.mutateAsync({ id: item.id });
                    window.open(result.url, "_blank", "noopener,noreferrer");
                  }}
                  className="flex-1 px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-container transition-colors"
                >
                  Download
                </button>
                <button
                  disabled={verifyIntegrity.isPending}
                  onClick={() => verifyIntegrity.mutate({ evidenceId: item.id })}
                  className="flex-1 px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-stack-lg flex items-center justify-between border-t border-outline-variant pt-stack-md">
        <p className="text-body-sm text-on-surface-variant">
          Showing <span className="font-bold text-on-surface">{data?.items.length ?? 0}</span> of{" "}
          <span className="font-bold text-on-surface">{data?.total ?? 0}</span> evidence items
        </p>
        <div className="flex space-x-2">
          <button
            className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-30"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="px-4 py-2 text-on-surface-variant">
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-30"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </>
  );
}
