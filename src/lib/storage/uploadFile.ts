import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UploadResult = {
  path: string;
  publicUrl: string | null;
};

const sanitizeFileName = (fileName: string) =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, "-");

export const uploadFile = async (file: File | Blob, userId: string) => {
  const supabase = createSupabaseBrowserClient();
  const fileName = file instanceof File ? file.name : "upload";
  const safeName = sanitizeFileName(fileName);
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("uploads")
    .upload(path, file, { upsert: false });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("uploads").getPublicUrl(path);

  return {
    path,
    publicUrl: data?.publicUrl ?? null,
  } satisfies UploadResult;
};
