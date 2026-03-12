import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/lib/adminAuth";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";
import { sendWithdrawalDecidedPush } from "@/src/lib/sendExpoPush";

const PAYMENT_CHANNELS = ["bank_transfer", "paypal", "other"] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: withdrawalId } = await params;
  if (!withdrawalId) {
    return NextResponse.json({ error: "withdrawal id required" }, { status: 400 });
  }

  let body: {
    decision?: string;
    rejection_reason?: string;
    external_reference?: string;
    payment_channel?: string;
    admin_note?: string;
    confirmation_paid?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const decision = body.decision;
  if (decision !== "paid" && decision !== "rejected") {
    return NextResponse.json(
      { error: "decision must be 'paid' or 'rejected'" },
      { status: 400 }
    );
  }

  const rejection_reason = typeof body.rejection_reason === "string" ? body.rejection_reason.trim() : "";
  const external_reference = typeof body.external_reference === "string" ? body.external_reference.trim() : "";
  const payment_channel = typeof body.payment_channel === "string" ? body.payment_channel.trim() : "";
  const admin_note = typeof body.admin_note === "string" ? body.admin_note.trim() : "";

  if (decision === "rejected") {
    if (!rejection_reason) {
      return NextResponse.json(
        { error: "rejection_reason_required" },
        { status: 400 }
      );
    }
    if (!admin_note) {
      return NextResponse.json(
        { error: "admin_note_required" },
        { status: 400 }
      );
    }
  } else {
    if (!external_reference) {
      return NextResponse.json(
        { error: "external_reference_required" },
        { status: 400 }
      );
    }
    if (!payment_channel || !PAYMENT_CHANNELS.includes(payment_channel as (typeof PAYMENT_CHANNELS)[number])) {
      return NextResponse.json(
        { error: "payment_channel_required" },
        { status: 400 }
      );
    }
    if (!admin_note) {
      return NextResponse.json(
        { error: "admin_note_required" },
        { status: 400 }
      );
    }
    if (body.confirmation_paid !== true) {
      return NextResponse.json(
        { error: "confirmation_paid_required" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabaseAdmin.rpc("admin_decide_withdrawal", {
    _withdrawal_id: withdrawalId,
    _decision: decision,
    _rejection_reason: decision === "rejected" ? rejection_reason : null,
    _external_reference: decision === "paid" ? external_reference : null,
    _payment_channel: decision === "paid" ? payment_channel : null,
    _admin_note: admin_note,
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? "";
    if (msg.includes("withdrawal_not_found")) {
      return NextResponse.json({ error: "withdrawal_not_found" }, { status: 404 });
    }
    if (msg.includes("withdrawal_not_pending")) {
      return NextResponse.json({ error: "withdrawal_not_pending" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "decide_failed", message: msg },
      { status: 500 }
    );
  }

  const result = data as {
    error?: string;
    ok?: boolean;
    user_id?: string;
    amount_cents?: number;
    status?: string;
  } | null;
  if (result?.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  if (result?.user_id != null && result?.amount_cents != null && (decision === "paid" || decision === "rejected")) {
    sendWithdrawalDecidedPush({
      userId: result.user_id,
      decision,
      amountCents: result.amount_cents,
    }).catch((e) => {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[decide withdrawal] push notification failed", e);
      }
    });
  }

  return NextResponse.json(result ?? { ok: true });
}
