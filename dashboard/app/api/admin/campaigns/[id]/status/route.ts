import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/lib/adminAuth";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

const ALLOWED_STATUSES = ["active", "paused", "completed"] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await params;
  if (!campaignId) {
    return NextResponse.json({ error: "campaign id required" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const status = body.status;
  if (!status || !ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
    return NextResponse.json(
      { error: "status must be one of: active, paused, completed" },
      { status: 400 }
    );
  }

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("campaigns")
    .select("id, status")
    .eq("id", campaignId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "campaign_not_found" }, { status: 404 });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("campaigns")
    .update({ status })
    .eq("id", campaignId);

  if (updateErr) {
    const msg = (updateErr as { message?: string }).message ?? "";
    if (msg.includes("insufficient_org_credit")) {
      return NextResponse.json({ error: "insufficient_org_credit" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "update_failed", message: msg },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, status });
}
