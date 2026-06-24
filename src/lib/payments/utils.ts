import type { SupportedCurrency, PaymentTransaction } from "@/types/payments";
import { PAYMENT_SETTINGS } from "./config";

// ─── Currency Formatting ──────────────────────────────────────────────────────

export function formatPaymentCurrency(
  amount: number,
  currency: SupportedCurrency = "SAR",
  locale: string = "ar-SA"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Commission Calculation ───────────────────────────────────────────────────

export function calculateCommission(amount: number): number {
  return parseFloat((amount * PAYMENT_SETTINGS.commissionRate).toFixed(2));
}

export function calculateGrandTotal(amount: number): number {
  return parseFloat((amount + calculateCommission(amount)).toFixed(2));
}

// ─── Transaction ID Generation ────────────────────────────────────────────────

export function generateTransactionRef(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `SNX-${timestamp}-${random}`;
}

// ─── Payment Data Validation ──────────────────────────────────────────────────

export function validatePaymentAmount(amount: number): boolean {
  return amount > 0 && isFinite(amount) && amount <= 999999.99;
}

export function validateCurrency(currency: string): currency is SupportedCurrency {
  return PAYMENT_SETTINGS.supportedCurrencies.includes(
    currency as SupportedCurrency
  );
}

// ─── Webhook Signature Verification ──────────────────────────────────────────

export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = hexToBytes(signature.replace(/^sha256=/, ""));
    return await crypto.subtle.verify("HMAC", cryptoKey, signatureBytes, messageData);
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// ─── Invoice Generation ───────────────────────────────────────────────────────

export interface InvoiceData {
  invoiceNumber: string;
  transactionId: string;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  eventTitle: string;
  ticketName: string;
  quantity: number;
  unitPrice: number;
  commission: number;
  total: number;
  currency: SupportedCurrency;
  paymentMethod: string;
  paidAt: string;
}

export function generateInvoiceNumber(transactionId: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const shortId = transactionId.slice(-6).toUpperCase();
  return `INV-${year}${month}-${shortId}`;
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

export function isTerminalStatus(status: string): boolean {
  return ["completed", "failed", "refunded", "cancelled"].includes(status);
}

export function canRefund(transaction: PaymentTransaction): boolean {
  return (
    transaction.status === "completed" &&
    transaction.refund_amount === null
  );
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatTransactionDate(
  dateString: string,
  locale: string = "ar-SA"
): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}
