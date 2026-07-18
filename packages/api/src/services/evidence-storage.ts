import { randomUUID } from "node:crypto";

import { supabaseAdmin } from "@Sentinel360/auth";
import { TRPCError } from "@trpc/server";

const EVIDENCE_BUCKET = "evidence";
let bucketEnsured = false;

// Evidence must never be world-readable — every read goes through
// getEvidenceDownloadUrl() so it's logged as a chain-of-custody ACCESSED
// event and the URL expires quickly.
async function ensureBucketExists(): Promise<void> {
  if (bucketEnsured) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === EVIDENCE_BUCKET)) {
    const { error } = await supabaseAdmin.storage.createBucket(EVIDENCE_BUCKET, {
      public: false,
    });
    if (error && !error.message.includes("already exists")) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to provision evidence storage bucket: ${error.message}`,
      });
    }
  }
  bucketEnsured = true;
}

export async function uploadEvidenceFile(
  fileBytes: Buffer,
  originalFilename: string,
  mimeType: string,
): Promise<{ storagePath: string }> {
  await ensureBucketExists();

  const year = new Date().getFullYear();
  const storagePath = `${year}/${randomUUID()}-${originalFilename}`;

  const { error } = await supabaseAdmin.storage
    .from(EVIDENCE_BUCKET)
    .upload(storagePath, fileBytes, { contentType: mimeType, upsert: false });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Evidence upload failed: ${error.message}`,
    });
  }

  return { storagePath };
}

export async function downloadEvidenceFile(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage
    .from(EVIDENCE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Evidence file not found in storage: ${error?.message ?? "unknown error"}`,
    });
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function getEvidenceSignedUrl(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to create signed URL: ${error?.message ?? "unknown error"}`,
    });
  }

  return data.signedUrl;
}
