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
