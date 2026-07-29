import { randomUUID } from "node:crypto";

import { supabaseAdmin } from "@Sentinel360/auth";
import { TRPCError } from "@trpc/server";

const PROFILE_PHOTO_BUCKET = "profile-photos";
let bucketEnsured = false;

// Unlike evidence, wanted-poster photos are meant to be shown on the public
// wanted feed and the community mobile app, so this bucket is public and
// served via a stable public URL instead of a short-lived signed one.
async function ensureBucketExists(): Promise<void> {
  if (bucketEnsured) return;
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === PROFILE_PHOTO_BUCKET)) {
    const { error } = await supabaseAdmin.storage.createBucket(PROFILE_PHOTO_BUCKET, {
      public: true,
    });
    if (error && !error.message.includes("already exists")) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to provision profile photo storage bucket: ${error.message}`,
      });
    }
  }
  bucketEnsured = true;
}

export async function uploadProfilePhoto(
  fileBytes: Buffer,
  originalFilename: string,
  mimeType: string,
): Promise<{ publicUrl: string }> {
  await ensureBucketExists();

  const storagePath = `${randomUUID()}-${originalFilename}`;

  const { error } = await supabaseAdmin.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(storagePath, fileBytes, { contentType: mimeType, upsert: false });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Profile photo upload failed: ${error.message}`,
    });
  }

  const { data } = supabaseAdmin.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl };
}
