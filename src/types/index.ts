export type UserRole = "customer" | "supplier" | "organizer" | "admin" | "influencer";

export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export type TicketStatus = "available" | "sold_out" | "reserved";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  locale: "ar" | "en";
  city: string | null;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  cover_image: string | null;
  venue_name: string | null;
  venue_city: string;
  venue_lat: number | null;
  venue_lng: number | null;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
  is_featured: boolean;
  is_free: boolean;
  category: string;
  tags: string[];
  created_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name_ar: string;
  name_en: string;
  price: number;
  currency: "SAR" | "AED" | "KWD" | "QAR";
  total_quantity: number;
  sold_quantity: number;
  status: TicketStatus;
}

export interface Vendor {
  id: string;
  owner_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  logo_url: string | null;
  category: string;
  city: string;
  country: string;
  is_verified: boolean;
  is_featured: boolean;
  rating: number | null;
  review_count: number;
  created_at: string;
}

export interface CrowdfundingCampaign {
  id: string;
  organizer_id: string;
  event_id: string | null;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  goal_amount: number;
  raised_amount: number;
  currency: "SAR" | "AED";
  deadline: string;
  status: "active" | "funded" | "expired" | "cancelled";
  created_at: string;
}

// ─── Admin Types ──────────────────────────────────────────────

export type AdminRoleType = "super_admin" | "moderator" | "analyst";

export interface AdminRole {
  id: string;
  user_id: string;
  role: AdminRoleType;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  reported_entity_type: string;
  reported_entity_id: string;
  reason: string;
  description: string | null;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type AdminEventStatus = "pending" | "approved" | "rejected" | "suspended";
