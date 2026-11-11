import { getLocale } from "next-intl/server";
import CampaignForm from "@/components/organizer/CampaignForm";

export const metadata = { title: "New Campaign - Sanatix" };

export default async function NewCampaignPage() {
  const locale = await getLocale();
  return <CampaignForm isRTL={locale === "ar"} />;
}
