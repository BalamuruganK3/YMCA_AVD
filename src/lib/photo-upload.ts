import { supabase } from "@/integrations/supabase/client";

export const PHOTO_BUCKET = "work-photos";

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
}): Promise<void> {
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
}
