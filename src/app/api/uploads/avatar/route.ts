import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { processAvatarImage } from "@/lib/storage/imageProcessing";
import { validateImage } from "@/lib/images/imageValidation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");

    if (!(file instanceof File) || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing file or userId." }, { status: 400 });
    }

    const validation = validateImage({ mimeType: file.type, size: file.size });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processAvatarImage(buffer);
    const path = `avatars/${userId}/250.webp`;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from("uploads").upload(path, processed, {
      contentType: "image/webp",
      upsert: true,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to upload avatar." },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from("uploads").getPublicUrl(path);

    return NextResponse.json({
      path,
      publicUrl: data?.publicUrl ?? null,
    });
  } catch (error) {
    console.error("AVATAR UPLOAD FAILED:", error);
    const message = error instanceof Error ? error.message : "Avatar upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
