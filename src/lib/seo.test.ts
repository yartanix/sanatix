import { describe, it, expect } from "vitest";
import { jsonLd } from "./seo";

describe("jsonLd — stored XSS via JSON-LD <script> tag breakout", () => {
  it("round-trips an ordinary object unchanged (other than the escape no-op)", () => {
    const html = jsonLd({ "@type": "Event", name: "Gala Night" }).__html;
    expect(JSON.parse(html)).toEqual({ "@type": "Event", name: "Gala Night" });
  });

  it("neutralizes a literal </script> in user-controlled content so it can't close the real tag", () => {
    // An organizer's own event title/description, or their profile
    // full_name, lands directly in this data with no HTML-escaping
    // upstream — this is the actual attack shape.
    const malicious = '</script><script>alert(document.cookie)</script>';
    const html = jsonLd({ name: malicious }).__html;

    expect(html).not.toContain("</script>");
    expect(html).not.toContain("<script>");
    // ...but still carries the exact same string once JSON-parsed, so
    // legitimate titles containing "<" (e.g. "Sale: <50% off") still
    // round-trip correctly for real crawlers/schema.org consumers.
    expect(JSON.parse(html)).toEqual({ name: malicious });
  });

  it("escapes every '<', not just the one before 'script'", () => {
    const html = jsonLd({ name: "<b>bold</b> & <i>italic</i>" }).__html;
    expect(html).not.toContain("<");
    expect(JSON.parse(html).name).toBe("<b>bold</b> & <i>italic</i>");
  });
});
