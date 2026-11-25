import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Delete Your Account — Sanatix",
  description:
    "How to request deletion of your Sanatix account and data, and what we may retain.",
};

const STEPS = {
  en: [
    "Email support@sanatix.net from the address or phone number registered on your account, with the subject line \"Account Deletion Request.\"",
    "Tell us your name (or business/vendor name, if you have a supplier listing) so we can find your account.",
    "We'll confirm your identity and process the request within 30 days.",
  ],
  ar: [
    "راسلنا على support@sanatix.net من البريد الإلكتروني أو رقم الهاتف المسجّل في حسابك، مع كتابة \"طلب حذف الحساب\" في عنوان الرسالة.",
    "أخبرنا باسمك (أو اسم نشاطك التجاري/المورّد، إذا كان لديك إعلان كمورّد) حتى نتمكن من العثور على حسابك.",
    "سنقوم بتأكيد هويتك ومعالجة الطلب خلال ٣٠ يومًا.",
  ],
};

const DELETED = {
  en: [
    "Your profile, including name, contact details, and authentication credentials",
    "Events, parties, and bookings you created or RSVPed to",
    "Supplier or vendor listing content (photos, pricing, descriptions), if applicable",
    "Push notification tokens, saved favorites, and in-app messages",
  ],
  ar: [
    "ملفك الشخصي، بما في ذلك الاسم وبيانات التواصل وبيانات الدخول",
    "الفعاليات والحفلات والحجوزات التي أنشأتها أو أكدت حضورك لها",
    "محتوى إعلانك كمورّد (الصور، الأسعار، الأوصاف)، إن وجد",
    "رموز الإشعارات، المفضلة المحفوظة، والرسائل داخل التطبيق",
  ],
};

const RETAINED = [
  {
    en: {
      data: "Booking and contribution records tied to your account",
      why: "Required for financial record-keeping, tax, and resolving disputes with other users",
      how: "Up to 7 years, as required by applicable law",
    },
    ar: {
      data: "سجلات الحجوزات والمساهمات المرتبطة بحسابك",
      why: "مطلوبة لحفظ السجلات المالية والضريبية وتسوية النزاعات مع مستخدمين آخرين",
      how: "حتى ٧ سنوات، وفقًا للقانون المعمول به",
    },
  },
  {
    en: {
      data: "Fraud-prevention and security logs",
      why: "Protecting the platform and other users from abuse",
      how: "Up to 90 days after deletion",
    },
    ar: {
      data: "سجلات منع الاحتيال والأمان",
      why: "لحماية المنصة والمستخدمين الآخرين من إساءة الاستخدام",
      how: "حتى ٩٠ يومًا بعد الحذف",
    },
  },
];

export default async function DeleteAccountPage() {
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const steps = isRTL ? STEPS.ar : STEPS.en;
  const deleted = isRTL ? DELETED.ar : DELETED.en;

  return (
    <div className="min-h-screen bg-brand-warm-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-medium text-brand-midnight mb-2">
          {isRTL ? "حذف حسابك وبياناتك" : "Delete your account and data"}
        </h1>
        <p className="text-brand-ink/80 leading-relaxed mb-10 max-w-2xl">
          {isRTL
            ? "إذا كنت تستخدم تطبيق أو موقع سناتكس وترغب في حذف حسابك والبيانات المرتبطة به، إليك طريقة تقديم الطلب وما سيحدث بعد ذلك."
            : "If you use the Sanatix app or website and want your account and associated data removed, here's how to request it and what happens next."}
        </p>

        <section className="mb-10">
          <h2 className="text-lg font-medium text-brand-midnight mb-4">
            {isRTL ? "كيفية طلب الحذف" : "How to request deletion"}
          </h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-brand-ink/80 leading-relaxed">
                <span className="font-medium text-brand-gold shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-medium text-brand-midnight mb-3">
            {isRTL ? "ما الذي يتم حذفه" : "What gets deleted"}
          </h2>
          <ul className="space-y-2 list-disc list-inside text-brand-ink/80">
            {deleted.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-medium text-brand-midnight mb-3">
            {isRTL ? "ما قد نحتفظ به" : "What we may keep"}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-brand-sand text-brand-ink/50 text-xs uppercase tracking-wide">
                  <th className="text-start py-2 pe-4 font-medium">
                    {isRTL ? "البيانات" : "Data"}
                  </th>
                  <th className="text-start py-2 pe-4 font-medium">
                    {isRTL ? "سبب الاحتفاظ بها" : "Why we keep it"}
                  </th>
                  <th className="text-start py-2 font-medium">
                    {isRTL ? "المدة" : "How long"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {RETAINED.map((row, i) => {
                  const r = isRTL ? row.ar : row.en;
                  return (
                    <tr key={i} className="border-b border-brand-sand/60 align-top">
                      <td className="py-3 pe-4 text-brand-ink/80">{r.data}</td>
                      <td className="py-3 pe-4 text-brand-ink/80">{r.why}</td>
                      <td className="py-3 text-brand-ink/80 whitespace-nowrap">{r.how}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-brand-ink/50 mt-4">
            {isRTL
              ? "باستثناء ما ذُكر أعلاه، تتم إزالة بياناتك الشخصية من أنظمتنا النشطة خلال ٣٠ يومًا من تأكيد الطلب."
              : "Outside of the records above, your personal data is removed from our active systems within 30 days of a verified request."}
          </p>
        </section>

        <p className="text-brand-ink/80 leading-relaxed">
          {isRTL ? "لأي استفسار حول هذه العملية، تواصل معنا عبر " : "Questions about this process? Contact us at "}
          <a
            href="mailto:support@sanatix.net"
            className="text-brand-gold hover:underline"
          >
            support@sanatix.net
          </a>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
