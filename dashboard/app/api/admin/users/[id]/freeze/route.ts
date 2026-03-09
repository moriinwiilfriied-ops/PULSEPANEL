import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/lib/adminAuth";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

const ADMIN_BY = "admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "user id required" }, { status: 400 });
  }

  let body: { freeze?: boolean; reason?: string; admin_note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const freeze = body.freeze === true;
  const admin_note = typeof body.admin_note === "string" ? body.admin_note.trim() : "";
  if (!admin_note) {
    return NextResponse.json({ error: "admin_note_required" }, { status: 400 });
  }

  if (freeze) {
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      return NextResponse.json({ error: "reason_required when freeze is true" }, { status: 400 });
    }
  }

  const now = new Date().toISOString();

  if (freeze) {
    const reason = (body.reason ?? "").trim();
    const { error: upsertErr } = await supabaseAdmin.from("user_risk_controls").upsert(
      {
        user_id: userId,
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
    return NextResponse.json({ ok: true, withdrawals_frozen: true });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("user_risk_controls")
    .update({
      withdrawals_frozen: false,
      withdrawals_frozen_reason: null,
      withdrawals_frozen_at: null,
      withdrawals_frozen_by: null,
      admin_note,
      updated_at: now,
    })
    .eq("user_id", userId);

  if (updateErr) {
    const code = (updateErr as { code?: string }).code;
    if (code === "PGRST116" || (updateErr as { message?: string }).message?.includes("0 rows")) {
      return NextResponse.json({ ok: true, withdrawals_frozen: false });
    }
    return NextResponse.json(
      { error: "unfreeze_failed", message: (updateErr as { message?: string }).message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, withdrawals_frozen: false });
}
