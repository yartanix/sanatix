"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

interface OutboundLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  kind: "event_ticket" | "venue_website" | "vendor_website";
  eventId?: string;
  venueId?: string;
  vendorId?: string;
  locale?: string;
  href: string;
}

/**
 * A plain <a> that also logs the click for referral/monetization
 * analytics — e.g. clicks on an external "Get tickets" link. The ping is
 * fire-and-forget and never blocks or can break the actual navigation:
 * if the tracking request fails, the user still reaches their tickets.
 */
export default function OutboundLink({
  kind,
  eventId,
  venueId,
  vendorId,
  locale,
  onClick,
  href,
  ...rest
}: OutboundLinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    try {
      fetch("/api/track/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, targetUrl: href, eventId, venueId, vendorId, locale }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Tracking must never prevent the user from reaching their tickets.
    }
    onClick?.(e);
  }

  return <a href={href} onClick={handleClick} {...rest} />;
}
