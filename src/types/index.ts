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
  venue_country?: string;
  venue_id?: string | null;
  ticket_url?: string | null;
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

export interface Venue {
  id: string;
  name_ar: string;
  name_en: string;
  aliases: string[];
  description_ar: string | null;
  description_en: string | null;
  venue_type: string;
  city: string;
  country: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  capacity_min: number | null;
  capacity_max: number | null;
  cover_image: string | null;
  images: string[];
  amenities: string[];
  website_url: string | null;
  instagram_url: string | null;
  google_maps_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  price_range: string | null;
  is_published: boolean;
  is_featured: boolean;
  rating: number | null;
  review_count: number;
  source_url: string | null;
  agent_generated: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  owner_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  logo_url: string | null;
  cover_url: string | null;
  category: string;
  city: string;
  country: string;
  is_verified: boolean;
  is_featured: boolean;
  is_premium: boolean;
  rating: number | null;
  review_count: number;
  instagram_url: string | null;
  whatsapp: string | null;
  website_url: string | null;
  source_url?: string | null;
  agent_generated?: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  vendor_id: string | null;
  event_id: string | null;
  rating: number;
  comment_ar: string | null;
  comment_en: string | null;
  created_at: string;
  vendor_response: string | null;
  vendor_response_at: string | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

export type VendorInquiryStatus = "new" | "responded" | "closed";

export interface VendorInquiry {
  id: string;
  vendor_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  event_date: string | null;
  message: string;
  status: VendorInquiryStatus;
  vendor_response: string | null;
  vendor_response_at: string | null;
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
  cover_image: string | null;
  goal_amount: number;
  raised_amount: number;
  currency: "SAR" | "AED" | "KWD" | "QAR" | "USD";
  deadline: string;
  status: "active" | "funded" | "expired" | "cancelled";
  backer_count: number;
  created_at: string;
}

export interface Contribution {
  id: string;
  campaign_id: string;
  user_id: string;
  amount: number;
  currency: string;
  is_anonymous: boolean;
  payment_ref: string | null;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

export type RsvpStatus = "pending" | "yes" | "no" | "maybe";

export type InviteChannel = "none" | "whatsapp" | "sms";
export type InviteStatus = "pending" | "sent" | "failed";

export interface InvitationTemplate {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  accent_color: string;
  is_premium: boolean;
  sort_order: number;
}

export interface Party {
  id: string;
  host_id: string;
  title: string;
  starts_at: string;
  location_name: string | null;
  location_address: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  cover_image: string | null;
  created_at: string;
  template_id: string | null;
  allow_plus_ones: boolean;
  custom_question: string | null;
  require_entry_code: boolean;
  entry_code: string | null;
  auto_send_channel: InviteChannel;
  door_pass_token: string;
}

export interface PartyGuest {
  id: string;
  party_id: string;
  name: string;
  phone: string | null;
  rsvp_token: string;
  rsvp_status: RsvpStatus;
  guest_count: number;
  responded_at: string | null;
  created_at: string;
  invite_channel: InviteChannel;
  invite_status: InviteStatus;
  invite_sent_at: string | null;
  last_reminder_sent_at: string | null;
  custom_answer: string | null;
  checked_in_at: string | null;
  checked_in_via: "door-pass" | "host" | null;
  /** Set once this guest is linked to an actual Sanatix account -- either
   * they RSVP'd while signed in and called link_rsvp_to_self(), or the
   * host added them straight from the directory via add_party_guest_by_user().
   * Unlocks the party's group chat and DMs with the host (migration 021). */
  user_id: string | null;
}

export interface RsvpDetails {
  party_id: string;
  title: string;
  starts_at: string;
  location_name: string | null;
  location_address: string | null;
  notes: string | null;
  cover_image: string | null;
  guest_name: string;
  guest_rsvp_status: RsvpStatus;
  guest_count: number;
  allow_plus_ones: boolean;
  custom_question: string | null;
  custom_answer: string | null;
  require_entry_code: boolean;
  entry_code: string | null;
  template_accent: string;
  checked_in_at: string | null;
}

// ─── Community messaging (migration 021) ────────────────────────────

/** A narrow, always-safe view over profiles for the open directory --
 * never carries phone, even though profiles itself is publicly readable. */
export interface DirectoryProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  role: UserRole;
  created_at: string;
}

export type ConversationKind = "dm" | "event_group" | "party_group";

export interface Conversation {
  id: string;
  kind: ConversationKind;
  /** event_id or party_id for a group conversation; null for a dm. */
  source_id: string | null;
  /** dm only, sorted so the pair is unique regardless of who started it. */
  dm_user_a: string | null;
  dm_user_b: string | null;
  created_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  /** Object path in the chat-media storage bucket, if any. */
  image_path: string | null;
  created_at: string;
}

export interface Block {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export type ReportTargetType = "user" | "message";
export type ReportStatus = "open" | "reviewed" | "dismissed";

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
}

/** A lightweight, non-ticket invite: an organizer inviting a Sanatix
 * user straight to an event (grants "shared event" status for DMs/group
 * chat), separate from booking a ticket. */
export interface EventInvite {
  event_id: string;
  invited_user_id: string;
  invited_by: string;
  created_at: string;
}
