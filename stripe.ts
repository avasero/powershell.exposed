import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Map your Stripe price IDs to your plans table IDs
const PRICE_TO_PLAN: Record<string, number> = {
  "price_1T43Q1HrWYWWTND8D326kbsW": 2,  // premium
};

const FREE_PLAN_ID = 1;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const priceId = session.metadata?.price_id;
      const customerId = session.customer as string;

      if (!userId || !priceId) {
        console.error("Missing metadata:", { userId, priceId });
        break;
      }

      const planId = PRICE_TO_PLAN[priceId];
      if (!planId) {
        console.error("Unknown price_id:", priceId);
        break;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          plan_id: planId,
          stripe_customer_id: customerId,
        })
        .eq("id", userId);

      if (error) {
        console.error("Failed to update profile:", error);
      } else {
        console.log(`Updated user ${userId} to plan ${planId}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { error } = await supabase
        .from("profiles")
        .update({ plan_id: FREE_PLAN_ID })
        .eq("stripe_customer_id", customerId);

      if (error) {
        console.error("Failed to reset plan:", error);
      } else {
        console.log(`Reset plan for customer ${customerId}`);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
