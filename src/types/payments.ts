// ─── Payment Gateway Types ────────────────────────────────────────────────────

export type PaymentGateway = "hyperpay" | "tabby" | "stripe";

export type PaymentMethodType =
  | "hyperpay"
  | "tabby"
  | "stripe"
  | "tamara"
  | "stc_pay";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded"
  | "cancelled";

export type SupportedCurrency = "SAR" | "AED" | "KWD" | "QAR" | "USD";

// ─── Database Models ──────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: PaymentMethodType;
  provider: string;
  token: string | null;
  last_four: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: SupportedCurrency;
  payment_method: PaymentMethodType;
  provider: string;
  provider_transaction_id: string | null;
  status: PaymentStatus;
  payment_details: Record<string, unknown> | null;
  error_message: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWebhook {
  id: string;
  provider: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

// ─── Service Interfaces ───────────────────────────────────────────────────────

export interface PaymentConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  webhookSecret: string;
}

export interface InitializePaymentParams {
  bookingId: string;
  userId: string;
  amount: number;
  currency: SupportedCurrency;
  paymentMethod: PaymentGateway;
  returnUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
}

export interface InitializePaymentResult {
  success: boolean;
  paymentUrl?: string;
  sessionId?: string;
  transactionId?: string;
  error?: string;
}

export interface VerifyPaymentParams {
  sessionId: string;
  transactionId?: string;
  provider: PaymentGateway;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: PaymentStatus;
  providerTransactionId?: string;
  error?: string;
}

export interface RefundPaymentParams {
  transactionId: string;
  amount?: number;
  reason: string;
}

export interface RefundPaymentResult {
  success: boolean;
  refundId?: string;
  status?: string;
  error?: string;
}

export interface WebhookPayload {
  provider: PaymentGateway;
  eventType: string;
  rawBody: string;
  signature: string;
  payload: Record<string, unknown>;
}

export interface WebhookProcessResult {
  success: boolean;
  transactionId?: string;
  status?: PaymentStatus;
  error?: string;
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export interface PaymentMethodOption {
  id: PaymentGateway;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  supportedCurrencies: SupportedCurrency[];
  isBNPL: boolean;
  isAvailable: boolean;
}

export interface CheckoutSummary {
  bookingId: string;
  eventTitleEn: string;
  eventTitleAr: string;
  ticketNameEn: string;
  ticketNameAr: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  commissionAmount: number;
  grandTotal: number;
  currency: SupportedCurrency;
}

export interface PaymentHistoryFilters {
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  provider?: PaymentGateway;
  page?: number;
  limit?: number;
}
