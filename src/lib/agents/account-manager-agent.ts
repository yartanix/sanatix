import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/constants";

/*
 * ─── Ali, the Account Manager agent ────────────────────────────────────
 *
 * Fahoood's instruction (Nov 25 2026): build an automated "account
 * manager" who reaches out to every vendor on Sanatix inviting them to
 * verify and complete their listing, in a warm, genuine, sales-style
 * voice — and who does this systematically, with zero manual steps once
 * it's wired up (per the earlier "no manual transactions, all systematic
 * and seamless" instruction, which applies here too: no one should have
 * to send these by hand).
 *
 * How it runs: triggered by Vercel Cron (src/app/api/cron/account-manager-agent/route.ts),
 * same CRON_SECRET pattern as content-agent. Each run:
 *   1. Selects up to BATCH_SIZE vendors where contact_email is set and
 *      outreach_sent_at is still null (see migration 024_vendor_outreach.sql).
 *   2. Sends each one a single invitation email via Resend, from
 *      support@sanatix.net, signed "Ali — Account Manager, Sanatix".
 *   3. Marks outreach_sent_at / outreach_status so the same vendor is
 *      never emailed twice by this agent.
 *
 * THE REAL BLOCKER (as of this run): vendors.contact_email is only
 * populated going forward — content-agent's vendor-discovery prompt was
 * updated alongside this file to capture a public contact email when one
 * is genuinely listed (never invented). All 202 vendors in the database
 * today predate that change and have contact_email = null, so Ali
 * currently has nothing to send. This agent will start working the
 * moment either (a) new vendors come in with an email attached, or (b)
 * someone runs a one-off enrichment pass to backfill contact_email for
 * the existing 202 from their public websites/Instagram bios — a
 * reasonable next build, not done here to avoid guessing contact details
 * for real businesses without verifying each one.
 *
 * Also blocked until configured (see .env.local.example):
 *   - SENDGRID_API_KEY — already a placeholder var in .env.local.example
 *     (never wired to any code path until now); needs a real SendGrid
 *     account + API key.
 *   - A verified sending domain for sanatix.net on that SendGrid account
 *     (domain authentication, so mail from support@sanatix.net doesn't
 *     land in spam), with support@sanatix.net as the From address.
 *   - CRON_SECRET (already required by content-agent; reused here)
 * None of these can be created on Fahoood's behalf — account creation and
 * domain verification need his own access. Until they're set, GET on the
 * cron route below returns a clear "not configured" response instead of
 * silently failing.
 */

const BATCH_SIZE = 25; // keep outbound volume modest and deliverability-friendly
const FROM_EMAIL = "support@sanatix.net";
const FROM_NAME = "Ali from Sanatix";

type Admin = ReturnType<typeof createAdminClient>;

interface OutreachVendor {
  id: string;
  name_en: string;
  name_ar: string;
  category: string;
  city: string;
  contact_email: string;
}

async function loadPendingVendors(db: Admin): Promise<OutreachVendor[]> {
  const { data, error } = await db
    .from("vendors")
    .select("id, name_en, name_ar, category, city, contact_email")
    .not("contact_email", "is", null)
    .is("outreach_sent_at", null)
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[account-manager-agent] failed to load pending vendors:", error.message);
    return [];
  }
  return (data ?? []) as OutreachVendor[];
}

function buildEmail(vendor: OutreachVendor) {
  const dashboardUrl = `${SITE_URL}/vendors/${vendor.id}`;
  const registerUrl = `${SITE_URL}/en/register?role=supplier`;

  const subject = `${vendor.name_en} — let's get you verified on Sanatix 🎉`;

  // Warm, genuine-sounding, sales-voiced invitation — bilingual in one
  // email (EN first, AR below), since Sanatix's own vendors span both.
  // Signed as a person ("Ali"), not "The Sanatix Team" — Fahoood asked
  // for it to read like a real account manager reaching out, not an
  // automated notice.
  const text = `Hi there,

I'm Ali, your account manager at Sanatix (sanatix.net) — the events and party-services marketplace for the GCC.

I came across ${vendor.name_en} while building out our ${vendor.category} directory for ${vendor.city}, and I think you'd be a great fit for our verified vendors. Right now your listing is live on the site, but it's marked "Not yet verified" — which means you're not getting the full visibility (or the trust boost) that a verified badge gives you with parents and event organizers browsing Sanatix.

It takes two minutes to claim your listing and get verified:
${registerUrl}

Once you're verified, you'll be able to:
  • Respond directly to inquiries from people planning events
  • Keep your photos, pricing, and contact details up to date yourself
  • Show up higher in search and filter results, with a "Verified" badge

Here's your current listing, so you can see exactly what people see today:
${dashboardUrl}

Happy to answer any questions — just reply to this email.

Warm regards,
Ali
Account Manager, Sanatix
support@sanatix.net

---

مرحباً،

أنا علي، مدير الحسابات لدى سناتيكس (sanatix.net) — منصة الفعاليات وخدمات الحفلات في الخليج.

وجدت "${vendor.name_ar}" أثناء بنائنا لدليل ${vendor.category} في ${vendor.city}، وأعتقد أنكم إضافة رائعة لقائمة مورّدينا الموثقين. ملفكم ظاهر حالياً على الموقع، لكنه لا يزال بعلامة "لم يتم التحقق بعد" — مما يعني أنكم لا تحصلون بعد على الظهور الكامل أو الثقة التي تمنحها العلامة الموثقة للأهالي والمنظمين المتصفحين للموقع.

التحقق من حسابكم يستغرق دقيقتين فقط:
${registerUrl}

بعد التحقق، ستتمكنون من:
  • الرد مباشرة على استفسارات الأشخاص الذين يخططون لفعالياتهم
  • تحديث صوركم وأسعاركم وبيانات التواصل بأنفسكم
  • الظهور في مرتبة أعلى ضمن نتائج البحث والتصفية، مع علامة "موثّق"

هذا رابط ملفكم الحالي لتروا ما يراه الزوار الآن:
${dashboardUrl}

يسعدني الإجابة على أي استفسار — فقط ردّوا على هذا البريد.

مع خالص التحية،
علي
مدير الحسابات، سناتيكس
support@sanatix.net`;

  return { subject, text };
}

async function sendViaSendGrid(to: string, subject: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { ok: false, error: "SENDGRID_API_KEY not set" };

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [{ type: "text/plain", value: text }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `SendGrid ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export interface AccountManagerRunResult {
  configured: boolean;
  candidates: number;
  sent: number;
  failed: number;
  errors: string[];
}

export async function runAccountManagerAgent(): Promise<AccountManagerRunResult> {
  const result: AccountManagerRunResult = { configured: true, candidates: 0, sent: 0, failed: 0, errors: [] };

  if (!process.env.SENDGRID_API_KEY) {
    result.configured = false;
    return result;
  }

  const db = createAdminClient();
  const vendors = await loadPendingVendors(db);
  result.candidates = vendors.length;

  for (const vendor of vendors) {
    const { subject, text } = buildEmail(vendor);
    const outcome = await sendViaSendGrid(vendor.contact_email, subject, text);

    const { error: updateError } = await db
      .from("vendors")
      .update({
        outreach_sent_at: new Date().toISOString(),
        outreach_status: outcome.ok ? "sent" : "failed",
      })
      .eq("id", vendor.id);

    if (updateError) {
      result.errors.push(`${vendor.name_en}: outreach sent but failed to record status — ${updateError.message}`);
    }

    if (outcome.ok) {
      result.sent++;
    } else {
      result.failed++;
      result.errors.push(`${vendor.name_en} <${vendor.contact_email}>: ${outcome.error}`);
    }
  }

  return result;
}
