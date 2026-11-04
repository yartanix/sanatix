import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { formatDateTime } from "@/lib/utils";

interface Params {
  params: Promise<{ id: string }>;
}

// Generates a printable PDF ticket for a confirmed booking: event details,
// a real scannable QR code (encodes the booking's qr_code, e.g.
// "SNX-AB12CD34EF56" — same code already shown as text on the confirmation
// page and in the organizer's attendee list), and the human-readable code
// as a fallback for manual check-in if the scanner can't read the QR.
//
// RLS on `bookings` (policy "bookings_own") already restricts selects to
// the booking's own user_id, so a plain authenticated client query is
// enough to make sure nobody can download someone else's ticket.
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id, quantity, total_amount, currency, qr_code, created_at,
      ticket_types ( name_ar, name_en ),
      events ( title_ar, title_en, starts_at, venue_name, venue_city )
    `
    )
    .eq("id", id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (!booking.qr_code) {
    return NextResponse.json({ error: "Ticket not ready yet" }, { status: 409 });
  }

  // The query builder can't infer these as single-row relations without a
  // generated Database type (this client is untyped, like the rest of the
  // codebase), so it widens them to arrays even though the FKs are 1:1.
  const event = booking.events as unknown as {
    title_ar: string | null;
    title_en: string | null;
    starts_at: string;
    venue_name: string | null;
    venue_city: string | null;
  };
  const ticketType = booking.ticket_types as unknown as {
    name_ar: string | null;
    name_en: string | null;
  };

  // The ticket itself is rendered in English regardless of the site locale
  // the booking was made in — pdf-lib's standard fonts don't support Arabic
  // shaping, and the printed code is what matters for door check-in either
  // way. The confirmation page stays fully bilingual as before.
  const eventTitle = event?.title_en || event?.title_ar || "Event";
  const ticketName = ticketType?.name_en || ticketType?.name_ar || "Ticket";

  const qrPng = await QRCode.toBuffer(booking.qr_code, {
    type: "png",
    width: 360,
    margin: 1,
    color: { dark: "#1C1A17", light: "#FFFFFF" },
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([360, 580]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrImage = await pdf.embedPng(qrPng);

  const gold = rgb(0.784, 0.6, 0.192); // brand-gold, approximated in RGB
  const midnight = rgb(0.11, 0.1, 0.09);
  const muted = rgb(0.42, 0.4, 0.35);

  let y = 540;

  page.drawText("SANATIX", {
    x: 24,
    y,
    size: 12,
    font: fontBold,
    color: gold,
  });
  y -= 28;

  const wrappedTitle = wrapText(eventTitle, 38);
  page.drawText(wrappedTitle, {
    x: 24,
    y,
    size: 16,
    font: fontBold,
    color: midnight,
    lineHeight: 20,
  });
  y -= 20 * wrappedTitle.split("\n").length;
  y -= 12;

  const rows: [string, string][] = [
    ["Date & time", formatDateTime(event?.starts_at ?? booking.created_at, "en-US")],
    ["Venue", [event?.venue_name, event?.venue_city].filter(Boolean).join(", ") || "—"],
    ["Ticket type", ticketName],
    ["Quantity", String(booking.quantity)],
    [
      "Total",
      booking.total_amount === 0
        ? "Free"
        : new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: booking.currency,
            minimumFractionDigits: 0,
          }).format(booking.total_amount),
    ],
  ];

  for (const [label, value] of rows) {
    page.drawText(label, { x: 24, y, size: 9, font, color: muted });
    page.drawText(value, { x: 140, y, size: 10, font: fontBold, color: midnight });
    y -= 20;
  }

  y -= 16;
  page.drawLine({
    start: { x: 24, y },
    end: { x: 336, y },
    thickness: 1,
    color: rgb(0.9, 0.88, 0.84),
  });
  y -= 24;

  const qrSize = 220;
  page.drawImage(qrImage, {
    x: (360 - qrSize) / 2,
    y: y - qrSize,
    width: qrSize,
    height: qrSize,
  });
  y -= qrSize + 16;

  const codeWidth = font.widthOfTextAtSize(booking.qr_code, 10);
  page.drawText(booking.qr_code, {
    x: (360 - codeWidth) / 2,
    y,
    size: 10,
    font,
    color: muted,
  });
  y -= 16;

  const footer = "Show this QR code at the door for check-in.";
  const footerWidth = font.widthOfTextAtSize(footer, 8);
  page.drawText(footer, {
    x: (360 - footerWidth) / 2,
    y,
    size: 8,
    font,
    color: muted,
  });

  const pdfBytes = await pdf.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sanatix-ticket-${booking.qr_code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

// pdf-lib doesn't wrap text for us — this is a simple greedy wrap used only
// for the (usually short) event title.
function wrapText(text: string, maxCharsPerLine: number): string {
  if (text.length <= maxCharsPerLine) return text;
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    if ((line + " " + word).trim().length > maxCharsPerLine) {
      lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`;
    }
  }
  if (line) lines.push(line.trim());
  return lines.join("\n");
}
