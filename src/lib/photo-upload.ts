import { supabase } from "@/integrations/supabase/client";

export const PHOTO_BUCKET = "work-photos";
export const AREA_IMAGE_BUCKET = "area-images";
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export async function convertImageToWebp(file: File, quality = 0.82): Promise<Blob> {
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (jpg, png, webp, gif, bmp).");
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This image format cannot be converted. Use JPG, PNG, WEBP, GIF or BMP.");
  });

  const maxDim = 1920;
  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not convert the image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/webp", quality);
  });
  if (!blob) {
    throw new Error("This browser could not save the photo as WebP.");
  }
  return blob;
}

export async function uploadWorkPhotoWebp(opts: {
  roomId: string;
  workItemId: string;
  userId: string;
  originalName: string;
  blob: Blob;
}): Promise<string> {
  const fileName = `${crypto.randomUUID()}.webp`;
  const path = `${opts.roomId}/${opts.workItemId}/${fileName}`;

  const { error: uploadErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, opts.blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (uploadErr) {
    throw new Error(
      uploadErr.message.includes("Bucket")
        ? "Photo storage is not set up. Create a public bucket named work-photos in Supabase Storage."
        : uploadErr.message || "Could not save the photo to storage.",
    );
  }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    throw new Error("Photo uploaded but no public link was returned.");
  }
  const storedName = opts.originalName.replace(/\.[^.]+$/, "") + ".webp";

  const { error: rowErr } = await supabase.from("work_photos").insert({
    room_id: opts.roomId,
    work_item_id: opts.workItemId,
    file_name: storedName,
    drive_file_id: path,
    drive_view_url: publicUrl,
    drive_thumbnail_url: publicUrl,
    user_id: opts.userId,
  });
  if (rowErr) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    throw new Error(rowErr.message || "Photo uploaded but could not be recorded.");
  }
  return publicUrl;
}

export async function uploadAreaImageWebp(areaSlug: string, originalName: string, blob: Blob): Promise<string> {
  const path = `${areaSlug}/${crypto.randomUUID()}.webp`;
  const { error: uploadErr } = await supabase.storage.from(AREA_IMAGE_BUCKET).upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (uploadErr) {
    throw new Error(
      uploadErr.message.includes("Bucket")
        ? "Room type image storage is not set up. Create a public bucket named area-images in Supabase Storage."
        : uploadErr.message || "Could not save the room type image.",
    );
  }
  const { data } = supabase.storage.from(AREA_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function assertPhotoSize(file: File) {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("File exceeds 10 MB limit. Please select a photo under 10 MB.");
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read the photo file."));
    reader.readAsDataURL(blob);
  });
}

export function workPhotoThumbUrl(photo: {
  drive_file_id?: string | null;
  drive_thumbnail_url?: string | null;
  drive_view_url?: string | null;
}): string {
  return photo.drive_thumbnail_url || photo.drive_view_url || "";
}

export function workPhotoOpenUrl(photo: {
  drive_file_id?: string | null;
  drive_view_url?: string | null;
  drive_thumbnail_url?: string | null;
}): string {
  return photo.drive_view_url || photo.drive_thumbnail_url || "";
}

export function formatPhotoDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
