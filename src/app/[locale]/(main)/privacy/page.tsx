import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Sanatix",
  description:
    "How Sanatix collects, uses, and protects your information across the web and mobile app.",
};

const LAST_UPDATED = { ar: "8 نوفمبر 2026", en: "November 8, 2026" };

const SECTIONS: { ar: { h: string; p: string[] }; en: { h: string; p: string[] } }[] = [
  {
    en: {
      h: "1. Information We Collect",
      p: [
        "Account information. When you create an account, we collect your name, phone number or email address, and authentication credentials (via Supabase Auth). If you sign in with Google, we receive the basic profile information Google shares (name, email, profile photo).",
        "Event and booking information. Details you provide when creating or RSVPing to events — event names, dates, venues, guest lists, booking selections, and any notes you add.",
        "Supplier/business information. If you list a service, we collect your business name, category, city, contact details, and listing content (photos, pricing, descriptions) you submit for review.",
        "Push notification tokens. We use Expo push notifications to notify you about booking confirmations, RSVPs, and messages. This requires a device push token, which identifies your device for notification delivery only.",
        "Crash and error data. We use Sentry to monitor app stability. When the app crashes or errors, we collect technical diagnostic data: device model, OS version, app version, and the error stack trace. This data is used solely to fix bugs and does not include your event or personal content unless it happens to appear in an on-screen error message.",
        "We do not currently collect or process payment card information. Sanatix does not yet have a live payment gateway; booking and contribution amounts are recorded but not charged.",
      ],
    },
    ar: {
      h: "١. المعلومات التي نجمعها",
      p: [
        "معلومات الحساب: عند إنشاء حساب، نقوم بجمع اسمك، ورقم هاتفك أو بريدك الإلكتروني، وبيانات الدخول (عبر Supabase Auth). إذا سجّلت الدخول باستخدام حساب Google، نحصل على معلومات الملف الشخصي الأساسية التي تشاركها Google (الاسم، البريد الإلكتروني، صورة الملف الشخصي).",
        "معلومات الفعاليات والحجوزات: التفاصيل التي تقدّمها عند إنشاء فعالية أو تأكيد حضورك — أسماء الفعاليات، التواريخ، الأماكن، قوائم الضيوف، اختيارات الحجز، وأي ملاحظات تضيفها.",
        "معلومات المورّدين/الأعمال: إذا قمت بإدراج خدمة، نجمع اسم نشاطك التجاري، فئته، المدينة، بيانات التواصل، ومحتوى الإعلان (الصور، الأسعار، الأوصاف) الذي تقدّمه للمراجعة.",
        "رموز الإشعارات: نستخدم إشعارات Expo لإعلامك بتأكيدات الحجز، الحضور، والرسائل. يتطلب هذا رمز إشعار للجهاز، يُستخدم فقط لتوصيل الإشعارات إلى جهازك.",
        "بيانات الأعطال والأخطاء: نستخدم Sentry لمراقبة استقرار التطبيق. عند حدوث عطل أو خطأ، نجمع بيانات تشخيصية تقنية: طراز الجهاز، إصدار النظام، إصدار التطبيق، وتفاصيل الخطأ البرمجي. تُستخدم هذه البيانات حصرًا لإصلاح الأعطال ولا تشمل محتوى فعالياتك الشخصي إلا إذا ظهر عرضًا ضمن رسالة خطأ على الشاشة.",
        "لا نقوم حاليًا بجمع أو معالجة بيانات بطاقات الدفع. لا تملك Sanatix حاليًا بوابة دفع فعلية؛ يتم تسجيل مبالغ الحجوزات والمساهمات دون تحصيلها.",
      ],
    },
  },
  {
    en: {
      h: "2. How We Use Your Information",
      p: [
        "To operate the marketplace (matching hosts with suppliers, processing bookings and RSVPs), to send you transactional notifications, to moderate supplier listings, to diagnose and fix technical issues, and to improve the Service.",
      ],
    },
    ar: {
      h: "٢. كيف نستخدم معلوماتك",
      p: [
        "لتشغيل السوق (ربط المضيفين بالموردين، معالجة الحجوزات وتأكيدات الحضور)، لإرسال إشعارات تتعلق بالعمليات، لمراجعة إعلانات الموردين، لتشخيص المشاكل التقنية وإصلاحها، ولتحسين الخدمة.",
      ],
    },
  },
  {
    en: {
      h: "3. Sharing of Information",
      p: [
        "We share information with other users as necessary for the Service to function (e.g., a supplier sees a host's event details when a booking request is made; a host sees a guest's RSVP).",
        "We share information with service providers who process data on our behalf: Supabase (database and authentication hosting, Bahrain region), Expo (push notification delivery and app updates), Sentry (crash reporting).",
        "We do not sell your personal information to third parties.",
      ],
    },
    ar: {
      h: "٣. مشاركة المعلومات",
      p: [
        "نشارك المعلومات مع المستخدمين الآخرين بالقدر اللازم لعمل الخدمة (مثال: يرى المورّد تفاصيل فعالية المضيف عند تقديم طلب حجز؛ ويرى المضيف تأكيد حضور الضيف).",
        "نشارك المعلومات مع مزوّدي خدمات يعالجون البيانات نيابةً عنا: Supabase (استضافة قاعدة البيانات والمصادقة، منطقة البحرين)، Expo (توصيل الإشعارات وتحديثات التطبيق)، Sentry (تقارير الأعطال).",
        "نحن لا نبيع معلوماتك الشخصية لأطراف ثالثة.",
      ],
    },
  },
  {
    en: {
      h: "4. Data Retention",
      p: [
        "We retain account and event data for as long as your account is active, or as needed to provide the Service. You may request deletion of your account and associated data by contacting us (see Section 7).",
      ],
    },
    ar: {
      h: "٤. الاحتفاظ بالبيانات",
      p: [
        "نحتفظ ببيانات الحساب والفعاليات طوال فترة نشاط حسابك، أو بالقدر اللازم لتقديم الخدمة. يمكنك طلب حذف حسابك والبيانات المرتبطة به عبر التواصل معنا (انظر القسم ٧).",
      ],
    },
  },
  {
    en: {
      h: "5. Your Rights",
      p: [
        "Depending on your location, you may have the right to access, correct, or delete your personal information, and to object to or restrict certain processing. Contact us using the details below to exercise these rights.",
      ],
    },
    ar: {
      h: "٥. حقوقك",
      p: [
        "بحسب موقعك، قد يكون لديك الحق في الوصول إلى معلوماتك الشخصية أو تصحيحها أو حذفها، والاعتراض على بعض عمليات المعالجة أو تقييدها. تواصل معنا عبر البيانات أدناه لممارسة هذه الحقوق.",
      ],
    },
  },
  {
    en: {
      h: "6. Children's Privacy",
      p: [
        "Sanatix is not directed at children under 13 (or the minimum age required in your jurisdiction), and we do not knowingly collect personal information from children.",
      ],
    },
    ar: {
      h: "٦. خصوصية الأطفال",
      p: [
        "لا تستهدف Sanatix الأطفال دون سن ١٣ عامًا (أو الحد الأدنى للسن المطلوب في نطاقك القانوني)، ولا نقوم عن علم بجمع معلومات شخصية من الأطفال.",
      ],
    },
  },
  {
    en: {
      h: "7. Contact Us",
      p: ["For privacy questions or data requests, contact: support@sanatix.net"],
    },
    ar: {
      h: "٧. تواصل معنا",
      p: ["لأي استفسارات تتعلق بالخصوصية أو طلبات البيانات، تواصل معنا عبر: support@sanatix.net"],
    },
  },
  {
    en: {
      h: "8. Changes to This Policy",
      p: [
        'We may update this policy from time to time. Material changes will be reflected by updating the "Last updated" date above.',
      ],
    },
    ar: {
      h: "٨. تعديلات على هذه السياسة",
      p: [
        'قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم توثيق أي تغييرات جوهرية من خلال تحديث تاريخ "آخر تحديث" أعلاه.',
      ],
    },
  },
];

export default async function PrivacyPolicyPage() {
  const locale = await getLocale();
  const isRTL = locale === "ar";

  return (
    <div className="min-h-screen bg-brand-warm-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-medium text-brand-midnight mb-2">
          {isRTL ? "سياسة الخصوصية" : "Privacy Policy"}
        </h1>
        <p className="text-sm text-brand-ink/50 mb-10">
          {isRTL ? "آخر تحديث: " : "Last updated: "}
          {isRTL ? LAST_UPDATED.ar : LAST_UPDATED.en}
        </p>

        <p className="text-brand-ink/80 leading-relaxed mb-10">
          {isRTL
            ? 'تقوم "سناتكس" ("نحن") بتشغيل تطبيق سناتكس للهواتف الذكية وموقع sanatix.net ("الخدمة")، وهو سوق ثنائي اللغة للفعاليات يربط بين المنظّمين والحضور والموردين في منطقة الخليج. توضح هذه السياسة المعلومات التي نجمعها، وكيفية استخدامها، وحقوقك تجاهها.'
            : 'Sanatix ("we," "us," "our") operates the Sanatix mobile application and sanatix.net (the "Service"), a bilingual event marketplace connecting hosts, attendees, and suppliers across the GCC region. This policy explains what information we collect, how we use it, and your rights.'}
        </p>

        <div className="space-y-10">
          {SECTIONS.map((section, i) => {
            const content = isRTL ? section.ar : section.en;
            return (
              <section key={i}>
                <h2 className="text-lg font-medium text-brand-midnight mb-3">{content.h}</h2>
                <div className="space-y-3">
                  {content.p.map((para, j) => (
                    <p key={j} className="text-brand-ink/80 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
