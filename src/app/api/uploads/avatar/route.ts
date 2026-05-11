import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { processAvatarImage } from "@/lib/storage/imageProcessing";
import { validateImage } from "@/lib/images/imageValidation";

export const runtime = "nodejs";

const AVATAR_BUCKET = "uploads";

const getAvatarPath = (userId: string) => `avatars/${userId}/avatar.webp`;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");

    if (!(file instanceof File) || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing file or userId." }, { status: 400 });
    }

    if (user.id !== userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const validation = validateImage({ mimeType: file.type, size: file.size });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processAvatarImage(buffer);
    const path = getAvatarPath(user.id);

    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, processed, {
      contentType: "image/webp",
      upsert: true,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to upload avatar." },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

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

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const currentPath = getAvatarPath(user.id);
    const legacyPath = `avatars/${user.id}/250.webp`;

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([currentPath, legacyPath]);

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to remove avatar." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AVATAR_DELETE_FAILED:", error);
    const message = error instanceof Error ? error.message : "Avatar remove failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
