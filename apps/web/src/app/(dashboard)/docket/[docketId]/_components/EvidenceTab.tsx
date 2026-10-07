"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { formatDateTime, formatFileSize, humanizeEnum } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import { getErrorMessage, getFieldErrors } from "@/lib/trpc-errors";

import { EVIDENCE_LIST_INPUT, invalidateDocket } from "../_lib/invalidate";
import { useDeepLinkFocus } from "../_lib/nav";
import { Field, FormCard, FormError, inputClass, SubmitButton } from "./ui/Field";
import { QueryState, SectionEmpty } from "./ui/SectionState";

// Must match packages/api/src/services/evidence-storage.ts — the storage
// bucket rejects anything else, so check before encoding and uploading.
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

const FRIENDLY_TYPE: Record<string, string> = {
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "image/webp": "WebP image",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read the file"));
    reader.readAsDataURL(file);
  });
}

function validateFile(file: File | null): string | null {
  if (!file) return "Choose a file to upload.";
  if (!ACCEPTED_TYPES.includes(file.type)) return "Only JPEG, PNG or WebP images can be uploaded as evidence.";
  if (file.size > MAX_BYTES) return `This file is ${formatFileSize(file.size)} — the limit is 10 MB.`;
  return null;
}

type IntegrityResult = { isValid: boolean; computedHash: string; storedHash: string };

function UploadForm({ caseId }: { caseId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [relationship, setRelationship] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [encoding, setEncoding] = useState(false);
  // Changing the key remounts the file input, which is the only way to clear it.
  const [inputKey, setInputKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useDeepLinkFocus("evidence-form", true);

  const upload = useMutation(
    trpc.evidence.upload.mutationOptions({
      onSuccess: (created) => {
        setFile(null);
        setTitle("");
        setDescription("");
        setRelationship("");
        setInputKey((k) => k + 1);
        invalidateDocket(caseId, ["evidence", "case"]);
        toast.success("Evidence uploaded and fingerprinted", {
          description: `SHA-256 ${created.fileHash.slice(0, 16)}…`,
        });
      },
    }),
  );
  const fieldErrors = getFieldErrors(upload.error);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateFile(file);
    setFileError(problem);
    if (problem || !file) {
      fileRef.current?.focus();
      return;
    }
    setEncoding(true);
    let fileBase64: string;
    try {
      fileBase64 = await fileToBase64(file);
    } catch (err) {
      setFileError(getErrorMessage(err));
      return;
    } finally {
      setEncoding(false);
    }
    upload.mutate({
      caseId,
      type: "IMAGE",
      title: title.trim() || file.name,
      description: description.trim() || undefined,
      relationshipDescription: relationship.trim() || undefined,
      source: "MANUAL_UPLOAD",
      originalFilename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      fileBase64,
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormCard
        id="evidence-form"
        title="Upload evidence"
        description="Each file is fingerprinted (SHA-256) on upload and logged to the chain of custody."
      >
        <Field
          label="File"
          required
          error={fileError}
          hint="JPEG, PNG or WebP image, up to 10 MB."
        >
          <input
            key={inputKey}
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              setFile(picked);
              setFileError(picked ? validateFile(picked) : null);
            }}
            className="text-sm file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold"
          />
        </Field>
        {file && !fileError && (
          <p className="text-xs text-on-surface-variant -mt-2">
            {file.name} · {formatFileSize(file.size)}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Title" hint="Defaults to the file name." error={fieldErrors.title}>
            <input value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          <Field
            label="How it relates to the case"
            hint="e.g. “CCTV still of suspect leaving the premises”"
            error={fieldErrors.relationshipDescription}
          >
            <input
              value={relationship}
              maxLength={1000}
              onChange={(e) => setRelationship(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Description" count={{ value: description.length, max: 5000 }} error={fieldErrors.description}>
          <textarea
            rows={2}
            value={description}
            maxLength={5000}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </Field>
        <FormError message={upload.isError && Object.keys(fieldErrors).length === 0 ? getErrorMessage(upload.error) : null} />
        <div>
          <SubmitButton pending={encoding || upload.isPending} pendingLabel={encoding ? "Preparing file…" : "Uploading…"}>
            Upload evidence
          </SubmitButton>
        </div>
      </FormCard>
    </form>
  );
}

function CustodyChain({ evidenceId }: { evidenceId: string }) {
  const chainQuery = useQuery(trpc.evidence.getCustodyChain.queryOptions({ id: evidenceId }));
  return (
    <QueryState
      query={chainQuery}
      loadingRows={2}
      isEmpty={(events) => events.length === 0}
      empty={<p className="text-xs text-on-surface-variant">No custody events recorded.</p>}
    >
      {(events) => (
        <ol className="space-y-1.5 text-xs">
          {events.map((ev) => (
            <li key={ev.id} className="flex flex-wrap gap-x-2">
              <span className="font-semibold text-on-surface">{humanizeEnum(ev.action)}</span>
              <span className="text-on-surface-variant">{formatDateTime(ev.createdAt)}</span>
              <span className="text-on-surface-variant">— {ev.reason}</span>
            </li>
          ))}
        </ol>
      )}
    </QueryState>
  );
}

function EvidenceItem({
  item,
}: {
  item: { id: string; title: string; fileHash: string; mimeType: string; fileSize: number; createdAt: string | Date; description: string | null };
}) {
  const [result, setResult] = useState<IntegrityResult | null>(null);
  const [showChain, setShowChain] = useState(false);

  const verify = useMutation(
    trpc.evidence.verifyIntegrity.mutationOptions({ onSuccess: (r) => setResult(r) }),
  );
  const download = useMutation(
    trpc.evidence.getDownloadUrl.mutationOptions({
      onSuccess: (r) => window.open(r.url, "_blank", "noopener,noreferrer"),
    }),
  );
  const error = verify.error ?? download.error;

  return (
    <li className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-on-surface break-words">{item.title}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {FRIENDLY_TYPE[item.mimeType] ?? item.mimeType} · {formatFileSize(item.fileSize)} · added{" "}
            {formatDateTime(item.createdAt)}
          </p>
          <p className="text-[11px] text-on-surface-variant font-mono mt-0.5" title={item.fileHash}>
            SHA-256 {item.fileHash.slice(0, 16)}…
          </p>
          {item.description && <p className="text-xs text-on-surface mt-1">{item.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <SubmitButton
            type="button"
            variant="secondary"
            pending={verify.isPending}
            pendingLabel="Checking…"
            onClick={() => {
              setResult(null);
              verify.mutate({ evidenceId: item.id });
            }}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              verified
            </span>
            Verify integrity
          </SubmitButton>
          <SubmitButton
            type="button"
            variant="secondary"
            pending={download.isPending}
            pendingLabel="Preparing…"
            onClick={() => download.mutate({ id: item.id })}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              download
            </span>
            Download
          </SubmitButton>
        </div>
      </div>

      <div aria-live="polite">
        {result && (
          <div
            className={`mt-3 pt-3 border-t border-outline-variant/40 text-xs ${result.isValid ? "text-primary" : "text-error"}`}
          >
            <p className="font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                {result.isValid ? "check_circle" : "gpp_bad"}
              </span>
              {result.isValid
                ? "Integrity verified — the file is unchanged since upload."
                : "Integrity check failed — the stored file no longer matches its original fingerprint. Report this before relying on it."}
            </p>
            <p className="mt-1 font-mono break-all text-on-surface-variant">Original: {result.storedHash}</p>
            <p className="font-mono break-all text-on-surface-variant">Now: {result.computedHash}</p>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-xs text-error">
            {getErrorMessage(error)}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowChain((v) => !v)}
        aria-expanded={showChain}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">
          {showChain ? "expand_less" : "history"}
        </span>
        {showChain ? "Hide chain of custody" : "View chain of custody"}
      </button>
      {showChain && (
        <div className="mt-2 pl-3 border-l-2 border-outline-variant">
          <CustodyChain evidenceId={item.id} />
        </div>
      )}
    </li>
  );
}

export function EvidenceTab({ caseId }: { caseId: string }) {
  const evidenceQuery = useQuery(trpc.evidence.list.queryOptions({ caseId, ...EVIDENCE_LIST_INPUT }));

  return (
    <div className="space-y-6">
      <UploadForm caseId={caseId} />
      <section aria-label="Case evidence">
        <QueryState
          query={evidenceQuery}
          isEmpty={(d) => d.items.length === 0}
          empty={
            <SectionEmpty
              icon="inventory_2"
              title="No evidence linked yet"
              body="At least one item is needed before the docket can be submitted for review."
            />
          }
        >
          {(d) => (
            <ul className="space-y-3">
              {d.items.map((item) => (
                <EvidenceItem key={item.id} item={item} />
              ))}
            </ul>
          )}
        </QueryState>
      </section>
    </div>
  );
}
