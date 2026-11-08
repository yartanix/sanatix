import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Mail, HelpCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Link } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "Support — Sanatix",
  description:
    "Get help with Sanatix: bookings, RSVPs, supplier listings, and your account.",
};

const FAQS: { ar: { q: string; a: string }; en: { q: string; a: string } }[] = [
  {
    en: {
      q: "How do I create an event or party?",
      a: "Sign in, then tap “Plan a Party” or “Create Event” from the home screen. You can set the date, venue, guest list, and invite guests with digital invitations in a few minutes.",
    },
    ar: {
      q: "كيف أنشئ فعالية أو حفلة؟",
      a: "سجّل الدخول، ثم اضغط على “خطط لحفلة” أو “إنشاء فعالية” من الشاشة الرئيسية. يمكنك تحديد التاريخ والمكان وقائمة الضيوف ودعوتهم عبر دعوات رقمية خلال دقائق.",
    },
  },
  {
    en: {
      q: "How do RSVPs and guest check-in work?",
      a: "Guests RSVP through the link you share with them. On the day of the event, you (or anyone you delegate) can scan guests in at the door from the app.",
    },
    ar: {
      q: "كيف تعمل تأكيدات الحضور وتسجيل الدخول للضيوف؟",
      a: "يؤكد الضيوف حضورهم عبر الرابط الذي تشاركه معهم. في يوم الفعالية، يمكنك أنت (أو أي شخص تفوّضه) تسجيل دخول الضيوف عند الباب من خلال التطبيق.",
    },
  },
  {
    en: {
      q: "Does Sanatix process payments?",
      a: "Not yet. Booking and contribution amounts (including naqout/cash gifts) are recorded in the app, but Sanatix does not currently charge cards or process live payments. This will be announced here and in-app when it changes.",
    },
    ar: {
      q: "هل تعالج سناتكس عمليات الدفع؟",
      a: "ليس حاليًا. يتم تسجيل مبالغ الحجوزات والمساهمات (بما فيها النقوط) داخل التطبيق، لكن سناتكس لا تقوم حاليًا بتحصيل المبالغ عبر البطاقات أو معالجة مدفوعات فعلية. سنعلن هنا وداخل التطبيق عند تفعيل ذلك.",
    },
  },
  {
    en: {
      q: "How do I list my business as a supplier?",
      a: "Create an account, choose the supplier/organizer option, and submit your business name, category, city, and listing details (photos, pricing, description) for review.",
    },
    ar: {
      q: "كيف أسجّل نشاطي التجاري كمورّد؟",
      a: "أنشئ حسابًا، اختر خيار المورّد/المنظّم، وقدّم اسم نشاطك التجاري وفئته ومدينته وتفاصيل الإعلان (الصور، الأسعار، الوصف) للمراجعة.",
    },
  },
  {
    en: {
      q: "How do I delete my account or data?",
      a: "Email support@sanatix.net from the address on your account and we will process your deletion request. See our Privacy Policy for details on what is deleted and how long it takes.",
    },
    ar: {
      q: "كيف أحذف حسابي أو بياناتي؟",
      a: "راسلنا على support@sanatix.net من البريد الإلكتروني المرتبط بحسابك وسنقوم بمعالجة طلب الحذف. راجع سياسة الخصوصية لمعرفة تفاصيل ما يتم حذفه والمدة التي يستغرقها ذلك.",
    },
  },
  {
    en: {
      q: "I found a bug or the app crashed — what should I do?",
      a: "Please email support@sanatix.net with your device model, app version, and a short description of what happened. This helps us reproduce and fix the issue quickly.",
    },
    ar: {
      q: "واجهت خللًا أو تعطّل التطبيق — ماذا أفعل؟",
      a: "يرجى مراسلتنا على support@sanatix.net مع ذكر طراز جهازك وإصدار التطبيق ووصف مختصر لما حدث. يساعدنا هذا في تشخيص المشكلة وإصلاحها بسرعة.",
    },
  },
];

export default async function SupportPage() {
  const locale = await getLocale();
  const isRTL = locale === "ar";

  return (
    <div className="min-h-screen bg-brand-warm-white flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-6 pt-14 pb-10 text-center">
          <h1 className="text-3xl font-medium text-brand-midnight mb-3">
            {isRTL ? "مركز الدعم" : "Support Center"}
          </h1>
          <p className="text-brand-ink/70 leading-relaxed max-w-xl mx-auto">
            {isRTL
              ? "نحن هنا للمساعدة في كل ما يخص تخطيط فعاليتك، إدارة الحجوزات، أو إعلان خدماتك على سناتكس."
              : "We're here to help with planning your event, managing bookings, or listing your services on Sanatix."}
          </p>

          <a
            href="mailto:support@sanatix.net"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full bg-brand-midnight text-brand-warm-white text-sm font-medium hover:bg-brand-ink transition-colors"
          >
            <Mail size={16} />
            support@sanatix.net
          </a>
        </section>

        <section className="max-w-2xl mx-auto px-6 pb-16">
          <h2 className="text-xl font-medium text-brand-midnight mb-6 flex items-center gap-2">
            <HelpCircle size={20} className="text-brand-gold" />
            {isRTL ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-6">
            {FAQS.map((faq, i) => {
              const content = isRTL ? faq.ar : faq.en;
              return (
                <div key={i} className="border-b border-brand-sand pb-6 last:border-0">
                  <h3 className="font-medium text-brand-midnight mb-2">{content.q}</h3>
                  <p className="text-brand-ink/70 leading-relaxed">{content.a}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-brand-ink/60 mb-4">
              {isRTL ? "لم تجد ما تبحث عنه؟ استكشف سناتكس أو تواصل معنا مباشرة." : "Didn't find what you needed? Explore Sanatix or reach out directly."}
            </p>
            <Link
              href="/"
              className="text-brand-gold hover:underline font-medium"
            >
              {isRTL ? "العودة إلى الرئيسية" : "Back to Home"}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
