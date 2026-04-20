import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type GetFileUrlOptions = {
  signed?: boolean;
  expiresIn?: number;
};

export const getFileUrl = async (path: string, options?: GetFileUrlOptions) => {
  const supabase = createSupabaseBrowserClient();

  if (options?.signed) {
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, options.expiresIn ?? 3600);

    if (error) {
      throw error;
    }

    return data?.signedUrl ?? null;
  }

  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return data?.publicUrl ?? null;
};
