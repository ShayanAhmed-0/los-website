import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import BookingJourney from "@/components/BookingJourney";
import { Suspense } from "react";

type Props = { params: Promise<{ locale: string }> };

export default async function BuyTicketPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-primary pb-20 pt-24">
         <div className="mx-auto max-w-7xl px-4 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">{t("bookingJourney.title")}</h1>
            <p className="text-white/80">{t("bookingJourney.subtitle")}</p>
         </div>
      </div>
      
      <div className="-mt-10">
        <Suspense fallback={<div className="p-12 text-center">Loading booking experience...</div>}>
            <BookingJourney />
        </Suspense>
      </div>
    </div>
  );
}
