import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = "info@vuxsy.com";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }

  const normalizedEmail = data.user.email?.trim().toLowerCase();
  if (normalizedEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ count: 0 }, { status: 403 });
  }

  const adminClient = createSupabaseAdminClient();
  const { count, error: countError } = await adminClient
    .from("reports")
    .select("id", { count: "exact", head: true })
    .or("status.eq.pending,status.is.null");

  if (countError) {
    console.error("ADMIN REPORT COUNT ERROR", countError);
    return NextResponse.json(
      {
        error: countError.message,
        details: countError.details,
        hint: countError.hint,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ count: count ?? 0 });
}
