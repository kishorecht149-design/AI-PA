import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getWorkspaceAccessState } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

import { getApprovedPlanPricing, assertPricingApproved } from "@/lib/pricing";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessState = await getWorkspaceAccessState(user.id);
    const plan = getApprovedPlanPricing();

    return NextResponse.json({
      accessState,
      plan,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load subscription." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, autoRenew, billingCycle } = body;

    if (action === "CHECKOUT") {
      // 1. Strictly assert that plan pricing has been approved by the platform owner
      const planConfig = assertPricingApproved();

      // 2. Prevent client tampering: billing cycle must be monthly or yearly
      const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
      const targetPricing = planConfig.pricing[cycle];

      if (!targetPricing) {
        return NextResponse.json(
          { error: `Pricing for ${cycle} billing interval is not configured.`, code: "INTERVAL_PRICING_MISSING" },
          { status: 503 }
        );
      }

      // 3. Assert payment gateway provider is configured
      const isGatewayConfigured = Boolean(
        process.env.STRIPE_SECRET_KEY || (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
      );

      if (!isGatewayConfigured) {
        return NextResponse.json(
          {
            error:
              "Payment gateway provider (Stripe / Razorpay) is not configured on this deployment. Real transactions cannot be processed.",
            code: "PAYMENT_GATEWAY_NOT_CONFIGURED",
          },
          { status: 503 }
        );
      }

      // In production with credentials, create checkout session with targetPricing.price
      return NextResponse.json({
        success: true,
        message: "Payment gateway initialized.",
        approvedPrice: targetPricing.price,
        currency: targetPricing.currency,
        billingCycle: cycle,
      });
    }

    // Default: update subscription preferences (autoRenew, billingCycle)
    const updated = await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        ...(typeof autoRenew === "boolean" ? { autoRenew } : {}),
        ...(billingCycle && (billingCycle === "monthly" || billingCycle === "yearly")
          ? { billingCycle }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update subscription settings." },
      { status: err.status || 500 }
    );
  }
}
