import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const SOURCE_ROUTE = "/api/stripe/webhook";

function buildAuditRow(event: Stripe.Event): Record<string, unknown> {
  const objectId =
    event.data?.object && typeof event.data.object === "object" && "id" in event.data.object
      ? String((event.data.object as { id?: string }).id)
      : null;
  return {
    provider: "stripe",
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode ?? null,
    api_version: event.api_version ?? null,
    created_ts: event.created ? new Date(event.created * 1000).toISOString() : null,
    received_at: new Date().toISOString(),
    processing_status: "received",
    payload_summary: { object_id: objectId, type: event.type },
    source_route: SOURCE_ROUTE,
  };
}

async function updateWebhookEventStatus(
  eventId: string,
  status: string,
  processingError?: string | null
) {
  await supabaseAdmin
    .from("webhook_events")
    .update({
      processing_status: status,
      processed_at: new Date().toISOString(),
      ...(processingError != null ? { processing_error: processingError } : {}),
    })
    .eq("provider", "stripe")
    .eq("event_id", eventId);
}

export async function POST(request: Request) {
  if (!webhookSecret || !stripeSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY missing");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[webhook] SUPABASE_SERVICE_ROLE_KEY missing");
    return NextResponse.json({ error: "Service indisponible" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeSecret);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature invalide", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const auditRow = buildAuditRow(event);
  await supabaseAdmin.from("webhook_events").upsert(auditRow, {
    onConflict: "provider,event_id",
    ignoreDuplicates: false,
  });

  if (event.type !== "checkout.session.completed") {
    await updateWebhookEventStatus(event.id, "ignored");
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  const orgId = session.metadata?.org_id ?? null;
  const amountCents = parseInt(session.metadata?.amount_cents ?? "0", 10);

  await supabaseAdmin
    .from("webhook_events")
    .update({
      stripe_checkout_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
      org_id: orgId || null,
    })
    .eq("provider", "stripe")
    .eq("event_id", event.id);

  if (!orgId || amountCents <= 0) {
    console.error("[webhook] metadata manquant", { orgId, amountCents });
    await updateWebhookEventStatus(event.id, "error", "metadata manquant");
    return NextResponse.json({ error: "Metadata invalide" }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("org_topups")
    .insert({
      org_id: orgId,
      stripe_checkout_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
      amount_cents: amountCents,
      currency: "eur",
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    if (insertError.code === "23505") {
      console.log("[webhook] duplicate org_topups (23505), returning 200 without crediting");
      await updateWebhookEventStatus(event.id, "processed");
      return NextResponse.json({ received: true });
    }
    console.error("[webhook] insert org_topups", insertError);
    await updateWebhookEventStatus(
      event.id,
      "error",
      (insertError as { message?: string }).message ?? "insert org_topups"
    );
    return NextResponse.json(
      { error: "Erreur base de données" },
      { status: 500 }
    );
  }

  if (!inserted) {
    await updateWebhookEventStatus(event.id, "processed");
    return NextResponse.json({ received: true });
  }

  const { error: creditError } = await supabaseAdmin.rpc("org_credit_topup", {
    p_org_id: orgId,
    p_amount_cents: amountCents,
    p_reason: "stripe_checkout",
  });

  if (creditError) {
    console.error("[webhook] org_credit_topup", creditError);
    await updateWebhookEventStatus(
      event.id,
      "error",
      (creditError as { message?: string }).message ?? "org_credit_topup"
    );
    return NextResponse.json(
      { error: "Erreur crédit org" },
      { status: 500 }
    );
  }

  console.log("[webhook] credited org", { orgId, amountCents });
  await updateWebhookEventStatus(event.id, "processed");
  return NextResponse.json({ received: true });
}

/*
 * QA — Webhook Stripe (service role)
 * 1. Redémarrer le serveur Next dev après modification de .env.local
 * 2. Lancer: stripe listen --forward-to http://localhost:3000/api/stripe/webhook
 * 3. Déclencher une recharge 10/50/200 et vérifier que stripe listen affiche 200 pour checkout.session.completed
 * 4. Supabase SQL:
 *    select * from org_topups order by created_at desc limit 5;
 *    select * from webhook_events order by received_at desc limit 10;
 *    select * from org_balances order by updated_at desc limit 5;
 * 5. Vérifier que le crédit du header dashboard augmente après refresh
 */
