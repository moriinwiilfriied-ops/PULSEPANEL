import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { error: "Non authentifié." },
      { status: 401 }
    );
  }

  let body: { orgId?: string; amountCents?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 }
    );
  }

  const orgId = body.orgId;
  const amountCents = body.amountCents;
  if (!orgId || typeof amountCents !== "number" || amountCents < 100) {
    return NextResponse.json(
      { error: "orgId et amountCents (min 1€) requis." },
      { status: 400 }
    );
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: member, error: memberError } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json(
      { error: "Organisation introuvable ou accès refusé." },
      { status: 403 }
    );
  }

  const role = (member as { role?: string }).role ?? "";
  if (role !== "owner" && role !== "editor") {
    return NextResponse.json(
      { error: "Seuls owner et editor peuvent recharger." },
      { status: 403 }
    );
  }

  if (!stripeSecret) {
    return NextResponse.json(
      { error: "Paiement non configuré." },
      { status: 503 }
    );
  }

  const stripe = new Stripe(stripeSecret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            product_data: {
              name: "Crédits PulsePanel",
              description: "Recharge du compte entreprise",
            },
            unit_amount: amountCents,
          },
        },
      ],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancel`,
      metadata: {
        org_id: orgId,
        amount_cents: String(amountCents),
      },
    });

    const redirectUrl = session.url ?? null;
    if (!redirectUrl) {
      return NextResponse.json(
        { error: "Impossible de créer la session de paiement." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: redirectUrl });
  } catch (err) {
    console.error("[create-checkout]", err);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement." },
      { status: 500 }
    );
  }
}
