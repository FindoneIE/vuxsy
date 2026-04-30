import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("ADMIN REPORT COUNT PROFILE ERROR", profileError);
  }
  if (profileError || profile?.role !== "admin") {
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
