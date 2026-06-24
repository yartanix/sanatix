import type { PaymentConfig } from "@/types/payments";

// ─── HyperPay Configuration ───────────────────────────────────────────────────
export const HYPERPAY_CONFIG: PaymentConfig = {
  apiKey:
    process.env.HYPERPAY_API_KEY || "pk_test_hyperpay_placeholder_key",
  secretKey:
    process.env.HYPERPAY_SECRET_KEY || "sk_test_hyperpay_placeholder_secret",
  baseUrl:
    process.env.HYPERPAY_BASE_URL || "https://api.hyperpay.com/v1",
  webhookSecret:
    process.env.HYPERPAY_WEBHOOK_SECRET || "whsec_test_hyperpay_placeholder",
};

// ─── Tabby Configuration ──────────────────────────────────────────────────────
export const TABBY_CONFIG: PaymentConfig = {
  apiKey:
    process.env.TABBY_API_KEY || "pk_test_tabby_placeholder_key",
  secretKey:
    process.env.TABBY_SECRET_KEY || "sk_test_tabby_placeholder_secret",
  baseUrl:
    process.env.TABBY_BASE_URL || "https://api.tabby.ai/api/v2",
  webhookSecret:
    process.env.TABBY_WEBHOOK_SECRET || "whsec_test_tabby_placeholder",
};

// ─── Stripe Configuration ─────────────────────────────────────────────────────
export const STRIPE_CONFIG: PaymentConfig = {
  apiKey:
    process.env.STRIPE_API_KEY || "pk_test_stripe_placeholder_key",
  secretKey:
    process.env.STRIPE_SECRET_KEY || "sk_test_stripe_placeholder_secret",
  baseUrl: "https://api.stripe.com/v1",
  webhookSecret:
    process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_stripe_placeholder",
};

// ─── Global Payment Settings ──────────────────────────────────────────────────
export const PAYMENT_SETTINGS = {
  commissionRate: parseFloat(process.env.NEXT_PUBLIC_COMMISSION_RATE || "5") / 100,
  timeoutSeconds: parseInt(process.env.NEXT_PUBLIC_PAYMENT_TIMEOUT || "900", 10),
  defaultCurrency: "SAR" as const,
  supportedCurrencies: ["SAR", "AED", "KWD", "QAR", "USD"] as const,
};
