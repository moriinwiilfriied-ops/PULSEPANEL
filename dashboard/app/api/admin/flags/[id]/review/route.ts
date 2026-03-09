import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/lib/adminAuth";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

const REVIEW_ACTIONS = ["legit", "watch", "actioned", "freeze"] as const;
const ADMIN_BY = "admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: flagId } = await params;
  if (!flagId) {
    return NextResponse.json({ error: "flag id required" }, { status: 400 });
  }

  let body: { action?: string; admin_note?: string; withdrawals_frozen_reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const action = body.action;
  if (!action || !REVIEW_ACTIONS.includes(action as (typeof REVIEW_ACTIONS)[number])) {
    return NextResponse.json(
      { error: "action must be one of: legit, watch, actioned, freeze" },
      { status: 400 }
    );
  }

  const admin_note = typeof body.admin_note === "string" ? body.admin_note.trim() : "";
  if (!admin_note) {
    return NextResponse.json({ error: "admin_note_required" }, { status: 400 });
  }

  if (action === "freeze") {
    const reason = typeof body.withdrawals_frozen_reason === "string" ? body.withdrawals_frozen_reason.trim() : "";
    if (!reason) {
      return NextResponse.json({ error: "withdrawals_frozen_reason_required for freeze" }, { status: 400 });
    }
  }

  const { data: flag, error: flagErr } = await supabaseAdmin
    .from("flags")
    .select("id, user_id")
    .eq("id", flagId)
    .maybeSingle();

  if (flagErr || !flag) {
    return NextResponse.json({ error: "flag_not_found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const status = action === "freeze" ? "actioned" : action;

  const { error: updateFlagErr } = await supabaseAdmin
    .from("flags")
    .update({
      status,
      admin_note,
      reviewed_at: now,
      reviewed_by: ADMIN_BY,
    })
    .eq("id", flagId);

  if (updateFlagErr) {
    return NextResponse.json(
      { error: "update_flag_failed", message: (updateFlagErr as { message?: string }).message },
      { status: 500 }
    );
  }

  if (action === "freeze" && flag.user_id) {
    const reason = (body.withdrawals_frozen_reason ?? "").trim();
    const { error: upsertErr } = await supabaseAdmin.from("user_risk_controls").upsert(
      {
        user_id: flag.user_id,
        withdrawals_frozen: true,
        withdrawals_frozen_reason: reason,
        withdrawals_frozen_at: now,
        withdrawals_frozen_by: ADMIN_BY,
        admin_note,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    if (upsertErr) {
      return NextResponse.json(
        { error: "freeze_failed", message: (upsertErr as { message?: string }).message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, status });
}
