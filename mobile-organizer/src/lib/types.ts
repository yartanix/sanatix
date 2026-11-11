// Mirrors the relevant shapes in the web app's src/types/index.ts —
// kept as a separate copy since this is a standalone Expo project,
// not sharing a build pipeline with the Next.js app.

export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type TicketStatus = "available" | "sold_out" | "reserved";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "refunded";
export type CampaignStatus = "active" | "funded" | "expired" | "cancelled";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "customer" | "supplier" | "organizer" | "admin" | "influencer";
}

export interface SanatixEvent {
  id: string;
  organizer_id: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  cover_image: string | null;
  venue_name: string | null;
  venue_city: string;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
  is_free: boolean;
  category: string;
  created_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name_ar: string;
  name_en: string;
  price: number;
  currency: string;
  total_quantity: number;
  sold_quantity: number;
  status: TicketStatus;
}

export interface Attendee {
  id: string;
  quantity: number;
  total_amount: number;
  currency: string;
  status: BookingStatus;
  qr_code: string | null;
  checked_in_at: string | null;
  created_at: string;
  profiles: { full_name: string | null; phone: string | null } | null;
  ticket_types: { name_ar: string; name_en: string } | null;
}

export interface CrowdfundingCampaign {
  id: string;
  organizer_id: string;
  event_id: string | null;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  cover_image: string | null;
  goal_amount: number;
  raised_amount: number;
  currency: string;
  deadline: string;
  status: CampaignStatus;
  backer_count: number;
  created_at: string;
}
