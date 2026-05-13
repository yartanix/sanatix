import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EventPage({ params }: PageProps) {
  const { id, locale } = await params;
  if (!id) notFound();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Event {id} — coming soon</p>
    </div>
  );
}
