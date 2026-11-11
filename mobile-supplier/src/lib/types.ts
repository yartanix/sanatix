// Mirrors the relevant shapes in the web app's src/types/index.ts —
// kept as a separate copy since this is a standalone Expo project.

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "customer" | "supplier" | "organizer" | "admin" | "influencer";
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
  created_at: string;
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

export interface Review {
  id: string;
  user_id: string;
  vendor_id: string | null;
  rating: number;
  comment_ar: string | null;
  comment_en: string | null;
  created_at: string;
  vendor_response: string | null;
  vendor_response_at: string | null;
  profiles?: { full_name: string | null } | null;
}
