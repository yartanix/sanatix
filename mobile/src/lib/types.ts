// Mirrors the shapes in the web app's src/types/index.ts (Party,
// PartyGuest) — kept as a separate copy since this is a standalone
// Expo project, not sharing a build pipeline with the Next.js app.

export type RsvpStatus = "pending" | "yes" | "no" | "maybe";
export type InviteChannel = "none" | "whatsapp" | "sms";
export type InviteStatus = "pending" | "sent" | "failed";

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
  allow_plus_ones: boolean;
  custom_question: string | null;
  require_entry_code: boolean;
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
  custom_answer: string | null;
  checked_in_at: string | null;
}
