export interface PlanPricingConfig {
  planId: string;
  name: string;
  description: string;
  features: string[];
  pricingApproved: boolean;
  pricingStatus: "APPROVED" | "PENDING_OWNER_APPROVAL";
  pricing: {
    monthly: {
      price: number;
      currency: string;
      formatted: string;
      interval: "month";
    } | null;
    yearly: {
      price: number;
      currency: string;
      formatted: string;
      interval: "year";
      discount?: string;
    } | null;
  };
}

/**
 * Retrieves the canonical server-side pricing configuration for AMAHAS Student OS.
 * Strictly requires platform owner approval via environment configuration.
 * When unapproved, prices are withheld and checkout is blocked.
 */
export function getApprovedPlanPricing(): PlanPricingConfig {
  const monthlyPriceStr = process.env.STUDENT_OS_MONTHLY_PRICE;
  const yearlyPriceStr = process.env.STUDENT_OS_YEARLY_PRICE;
  const currency = process.env.STUDENT_OS_CURRENCY || "INR";
  const yearlyDiscount = process.env.STUDENT_OS_YEARLY_DISCOUNT || "Annual savings apply";

  const monthlyPrice = monthlyPriceStr ? parseFloat(monthlyPriceStr) : null;
  const yearlyPrice = yearlyPriceStr ? parseFloat(yearlyPriceStr) : null;

  const isApproved =
    monthlyPrice !== null &&
    !isNaN(monthlyPrice) &&
    monthlyPrice > 0 &&
    yearlyPrice !== null &&
    !isNaN(yearlyPrice) &&
    yearlyPrice > 0;

  return {
    planId: "student_os_all_access",
    name: "AMAHAS Student OS All-Access",
    description:
      "Complete autonomous intelligence, deep work, SM-2 retention, and research literature pipelines.",
    features: [
      "Autonomous Multi-Step AI Research Agent",
      "SuperMemo SM-2 Spaced Revision Engine",
      "Algorithmic Time-Blocking & Conflict Prevention",
      "Deep Work Soundscapes & Measured Focus XP",
      "GATE / ESE Syllabus Trackers & Quiz System",
      "Universal Data Export & Backup",
    ],
    pricingApproved: isApproved,
    pricingStatus: isApproved ? "APPROVED" : "PENDING_OWNER_APPROVAL",
    pricing: {
      monthly:
        isApproved && monthlyPrice !== null
          ? {
              price: monthlyPrice,
              currency,
              formatted: `${currency === "INR" ? "₹" : "$"}${monthlyPrice} / month`,
              interval: "month",
            }
          : null,
      yearly:
        isApproved && yearlyPrice !== null
          ? {
              price: yearlyPrice,
              currency,
              formatted: `${currency === "INR" ? "₹" : "$"}${yearlyPrice} / year`,
              interval: "year",
              discount: yearlyDiscount,
            }
          : null,
    },
  };
}

/**
 * Asserts that plan pricing is approved and configured before allowing checkout or billing mutations.
 * Throws 503 error if pricing is pending owner approval.
 */
export function assertPricingApproved(): PlanPricingConfig {
  const config = getApprovedPlanPricing();
  if (!config.pricingApproved) {
    const error: any = new Error(
      "Subscription plan pricing has not been finalized by the Platform Owner. Checkout is temporarily suspended."
    );
    error.status = 503;
    error.code = "PRICING_PENDING_APPROVAL";
    throw error;
  }
  return config;
}
