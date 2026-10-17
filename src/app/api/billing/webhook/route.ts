import { NextResponse } from "next/server";
import { recordPaymentEvent } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { verifyStripeSignature, verifyRazorpaySignature } from "@/lib/webhook-verification";
import { getApprovedPlanPricing } from "@/lib/pricing";
import {
  claimWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
} from "@/lib/webhook-idempotency";

export async function POST(req: Request) {
  try {
    const stripeSignature = req.headers.get("stripe-signature");
    const razorpaySignature = req.headers.get("x-razorpay-signature");

    const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const razorpaySecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const rawBody = await req.text();

    // 1. Stripe Webhook Verification
    if (stripeSignature) {
      if (!stripeSecret) {
        return NextResponse.json(
          { error: "STRIPE_WEBHOOK_SECRET is unconfigured on the server." },
          { status: 503 }
        );
      }

      const sigResult = verifyStripeSignature(rawBody, stripeSignature, stripeSecret);
      if (!sigResult.valid) {
        return NextResponse.json({ error: sigResult.error || "Invalid Stripe signature." }, { status: 400 });
      }

      const event = JSON.parse(rawBody);
      const eventId = event.id;

      if (!eventId) {
        return NextResponse.json({ error: "Missing Stripe event ID." }, { status: 400 });
      }

      // Environment verification: reject test events in live mode if configured
      if (
        process.env.NODE_ENV === "production" &&
        process.env.STRIPE_LIVE_MODE === "true" &&
        event.livemode === false
      ) {
        return NextResponse.json(
          { error: "Test-mode webhook rejected in live production environment." },
          { status: 403 }
        );
      }

      // Filter for handled payment event types
      const handledEvents = ["checkout.session.completed", "invoice.paid", "invoice.payment_failed"];
      if (!handledEvents.includes(event.type)) {
        return NextResponse.json({ received: true, ignored: true, eventType: event.type });
      }

      const session = event.data?.object;
      const userId = session?.client_reference_id || session?.metadata?.userId;

      // Authoritative database-level distributed idempotency claim
      const claim = await claimWebhookEvent("stripe", eventId, event.type, userId);
      if (!claim.claimed) {
        return NextResponse.json({
          received: true,
          duplicate: true,
          concurrent: claim.isConcurrent || false,
        });
      }

      try {
        if (!userId) {
          await markWebhookFailed("stripe", eventId, "Missing userId in event metadata.");
          return NextResponse.json({ error: "Missing userId in event metadata." }, { status: 400 });
        }

        // Verify target user actually exists in the database
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { subscription: true },
        });

        if (!targetUser) {
          await markWebhookFailed("stripe", eventId, "Target user not found.");
          return NextResponse.json({ error: "Target user not found." }, { status: 404 });
        }

        // Plan binding validation
        const planId = session?.metadata?.planId;
        if (planId && planId !== "student_os_all_access") {
          await markWebhookFailed("stripe", eventId, `Invalid planId: '${planId}'`);
          return NextResponse.json({ error: `Invalid planId: '${planId}'` }, { status: 400 });
        }

        // Amount & currency verification against approved server-side pricing
        const approvedPricing = getApprovedPlanPricing();
        const cycle = session?.metadata?.billingCycle === "yearly" ? "yearly" : "monthly";

        if (
          approvedPricing.pricingApproved &&
          (event.type === "checkout.session.completed" || event.type === "invoice.paid")
        ) {
          const expectedPlan = cycle === "yearly" ? approvedPricing.pricing.yearly! : approvedPricing.pricing.monthly!;
          const expectedSubunits = expectedPlan.price * 100;
          const approvedCurrency = expectedPlan.currency || "INR";
          const receivedAmount = session?.amount_total || session?.amount_paid;
          const receivedCurrency = (session?.currency || "").toUpperCase();

          if (receivedCurrency && receivedCurrency !== approvedCurrency.toUpperCase()) {
            await markWebhookFailed("stripe", eventId, "Payment currency does not match approved plan currency.");
            return NextResponse.json({ error: "Payment currency does not match approved plan currency." }, { status: 400 });
          }

          if (typeof receivedAmount === "number" && receivedAmount < expectedSubunits) {
            await markWebhookFailed("stripe", eventId, "Payment amount is less than approved plan price.");
            return NextResponse.json({ error: "Payment amount is less than approved plan price." }, { status: 400 });
          }
        }

        if (event.type === "checkout.session.completed") {
          if (session?.payment_status !== "paid") {
            return NextResponse.json({ received: true, paymentPending: true });
          }

          await recordPaymentEvent({
            userId,
            type: "PAYMENT_SUCCEEDED",
            billingCycle: cycle,
          });
        } else if (event.type === "invoice.paid") {
          await recordPaymentEvent({
            userId,
            type: "PAYMENT_SUCCEEDED",
            billingCycle: cycle,
          });
        } else if (event.type === "invoice.payment_failed") {
          await recordPaymentEvent({
            userId,
            type: "PAYMENT_FAILED",
          });
        }

        // Mark successfully PROCESSED in distributed ledger
        await markWebhookProcessed("stripe", eventId);

        // Record audit event
        await prisma.auditEvent.create({
          data: {
            userId,
            action: `PROCESSED_PAYMENT_WEBHOOK:${eventId}`,
            detailsJson: JSON.stringify({
              eventId,
              provider: "stripe",
              eventType: event.type,
              processedAt: new Date().toISOString(),
            }),
          },
        });

        return NextResponse.json({ received: true });
      } catch (processingErr: any) {
        await markWebhookFailed("stripe", eventId, processingErr.message || "Webhook processing failed");
        throw processingErr;
      }
    }

    // 2. Razorpay Webhook Verification
    if (razorpaySignature) {
      if (!razorpaySecret) {
        return NextResponse.json(
          { error: "RAZORPAY_WEBHOOK_SECRET is unconfigured on the server." },
          { status: 503 }
        );
      }

      const sigResult = verifyRazorpaySignature(rawBody, razorpaySignature, razorpaySecret);
      if (!sigResult.valid) {
        return NextResponse.json({ error: sigResult.error || "Invalid Razorpay signature." }, { status: 400 });
      }

      const event = JSON.parse(rawBody);
      const payment = event.payload?.payment?.entity;
      // Authoritative unique event ID: prefer header x-razorpay-event-id, then event.event_id, then payment?.id
      const eventId = req.headers.get("x-razorpay-event-id") || event.event_id || payment?.id;

      if (!eventId) {
        return NextResponse.json({ error: "Missing Razorpay event ID." }, { status: 400 });
      }

      const handledRazorpayEvents = ["payment.captured", "order.paid", "payment.failed"];
      if (!handledRazorpayEvents.includes(event.event)) {
        return NextResponse.json({ received: true, ignored: true, eventType: event.event });
      }

      const userId = payment?.notes?.userId;

      // Authoritative database-level distributed idempotency claim
      const claim = await claimWebhookEvent("razorpay", eventId, event.event, userId);
      if (!claim.claimed) {
        return NextResponse.json({
          received: true,
          duplicate: true,
          concurrent: claim.isConcurrent || false,
        });
      }

      try {
        if (!userId) {
          await markWebhookFailed("razorpay", eventId, "Missing userId in payment notes.");
          return NextResponse.json({ error: "Missing userId in payment notes." }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { subscription: true },
        });

        if (!targetUser) {
          await markWebhookFailed("razorpay", eventId, "Target user not found.");
          return NextResponse.json({ error: "Target user not found." }, { status: 404 });
        }

        const planId = payment?.notes?.planId;
        if (planId && planId !== "student_os_all_access") {
          await markWebhookFailed("razorpay", eventId, `Invalid planId: '${planId}'`);
          return NextResponse.json({ error: `Invalid planId: '${planId}'` }, { status: 400 });
        }

        const approvedPricing = getApprovedPlanPricing();
        const cycle = payment?.notes?.billingCycle === "yearly" ? "yearly" : "monthly";

        if (
          approvedPricing.pricingApproved &&
          (event.event === "payment.captured" || event.event === "order.paid")
        ) {
          const expectedPlan = cycle === "yearly" ? approvedPricing.pricing.yearly! : approvedPricing.pricing.monthly!;
          const expectedSubunits = expectedPlan.price * 100;
          const approvedCurrency = expectedPlan.currency || "INR";
          const receivedAmount = payment?.amount;
          const receivedCurrency = (payment?.currency || "").toUpperCase();

          if (receivedCurrency && receivedCurrency !== approvedCurrency.toUpperCase()) {
            await markWebhookFailed("razorpay", eventId, "Payment currency does not match approved plan currency.");
            return NextResponse.json({ error: "Payment currency does not match approved plan currency." }, { status: 400 });
          }

          if (typeof receivedAmount === "number" && receivedAmount < expectedSubunits) {
            await markWebhookFailed("razorpay", eventId, "Payment amount is less than approved plan price.");
            return NextResponse.json({ error: "Payment amount is less than approved plan price." }, { status: 400 });
          }
        }

        if (event.event === "payment.captured") {
          if (payment?.status !== "captured") {
            return NextResponse.json({ received: true, paymentPending: true });
          }

          await recordPaymentEvent({
            userId,
            type: "PAYMENT_SUCCEEDED",
            billingCycle: cycle,
          });
        } else if (event.event === "order.paid") {
          await recordPaymentEvent({
            userId,
            type: "PAYMENT_SUCCEEDED",
            billingCycle: cycle,
          });
        } else if (event.event === "payment.failed") {
          await recordPaymentEvent({
            userId,
            type: "PAYMENT_FAILED",
          });
        }

        // Mark successfully PROCESSED in distributed ledger
        await markWebhookProcessed("razorpay", eventId);

        // Record audit event
        await prisma.auditEvent.create({
          data: {
            userId,
            action: `PROCESSED_PAYMENT_WEBHOOK:${eventId}`,
            detailsJson: JSON.stringify({
              eventId,
              provider: "razorpay",
              eventType: event.event,
              processedAt: new Date().toISOString(),
            }),
          },
        });

        return NextResponse.json({ received: true });
      } catch (processingErr: any) {
        await markWebhookFailed("razorpay", eventId, processingErr.message || "Webhook processing failed");
        throw processingErr;
      }
    }

    // No recognized signature header provided
    return NextResponse.json(
      {
        error:
          "Missing provider signature. Payment webhooks must include a valid 'stripe-signature' or 'x-razorpay-signature' header.",
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process payment webhook." },
      { status: 500 }
    );
  }
}
