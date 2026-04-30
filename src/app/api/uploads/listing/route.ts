import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { processListingImage } from "@/lib/storage/imageProcessing";
import { validateImage } from "@/lib/images/imageValidation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const listingId = formData.get("listingId");

    if (!(file instanceof File) || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Missing file or listingId." },
        { status: 400 }
      );
    }

    const validation = validateImage({ mimeType: file.type, size: file.size });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { image1800, image600 } = await processListingImage(buffer);
    const imageId = randomUUID();
    const largePath = `listings/${listingId}/${imageId}_1800.webp`;
    const mediumPath = `listings/${listingId}/${imageId}_600.webp`;

    const supabase = await createSupabaseServerClient();
    const bucket = supabase.storage.from("uploads");
    const { error: largeError } = await supabase.storage
      .from("uploads")
      .upload(largePath, image1800, {
        contentType: "image/webp",
        upsert: false,
      });

    if (largeError) {
      console.error("LISTING_UPLOAD_ERROR", largeError);
      return NextResponse.json(
        { error: largeError.message ?? "Failed to upload large image." },
        { status: 500 }
      );
    }

    const { error: mediumError } = await supabase.storage
      .from("uploads")
      .upload(mediumPath, image600, {
        contentType: "image/webp",
        upsert: false,
      });

    if (mediumError) {
      console.error("LISTING_UPLOAD_ERROR", mediumError);
      await supabase.storage.from("uploads").remove([largePath]);
      return NextResponse.json(
        { error: mediumError.message ?? "Failed to upload medium image." },
        { status: 500 }
      );
    }

    let sortOrder = 0;
    const { data: latestImage, error: latestError } = await supabase
      .from("listing_images")
      .select("sort_order")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      console.error("LISTING_UPLOAD_ERROR", latestError);
    } else if (typeof latestImage?.sort_order === "number") {
      sortOrder = latestImage.sort_order + 1;
    }

    const { data: listingImage, error: listingImageError } = await supabase
      .from("listing_images")
      .insert({
        listing_id: listingId,
        storage_path_1800: largePath,
        storage_path_600: mediumPath,
        sort_order: sortOrder,
      })
      .select("id, listing_id, storage_path_1800, storage_path_600, sort_order, created_at")
      .maybeSingle();

    if (listingImageError) {
      console.error("LISTING_UPLOAD_ERROR", listingImageError);
      await bucket.remove([largePath, mediumPath]);
      return NextResponse.json(
        {
          error: listingImageError.message ?? "Failed to save listing image.",
        },
        { status: 500 }
      );
    }

    const { data: largeUrl } = supabase.storage
      .from("uploads")
      .getPublicUrl(largePath);
    const { data: mediumUrl } = supabase.storage
      .from("uploads")
      .getPublicUrl(mediumPath);

    return NextResponse.json({
      imageId,
      path: mediumPath,
      publicUrl: mediumUrl?.publicUrl ?? null,
      largePath,
      largeUrl: largeUrl?.publicUrl ?? null,
      listingImage: listingImage ?? null,
    });
  } catch (error) {
    console.error("LISTING_UPLOAD_ERROR", error);
    const message = error instanceof Error ? error.message : "Listing upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
