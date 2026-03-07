import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!webhookSecret || !stripeSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY missing");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
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

  if (event.type !== "checkout.session.completed") {
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

  if (!orgId || amountCents <= 0) {
    console.error("[webhook] metadata manquant", { orgId, amountCents });
    return NextResponse.json({ error: "Metadata invalide" }, { status: 400 });
  }

  if (!supabaseAdmin) {
    console.error("[webhook] supabaseAdmin non disponible");
    return NextResponse.json({ error: "Service indisponible" }, { status: 500 });
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
      return NextResponse.json({ received: true });
    }
    console.error("[webhook] insert org_topups", insertError);
    return NextResponse.json(
      { error: "Erreur base de données" },
      { status: 500 }
    );
  }

  if (!inserted) {
    return NextResponse.json({ received: true });
  }

  const { error: creditError } = await supabaseAdmin.rpc("org_credit_topup", {
    p_org_id: orgId,
    p_amount_cents: amountCents,
    p_reason: "topup_stripe",
  });

  if (creditError) {
    console.error("[webhook] org_credit_topup", creditError);
    return NextResponse.json(
      { error: "Erreur crédit org" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
