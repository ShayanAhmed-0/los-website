import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Accordion from "@/components/Accordion";
import DestinationsList from "@/components/DestinationsList";
import slide4 from "../../../../public/slide4.jpg";
type Props = { params: Promise<{ locale: string }> };

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("aboutPage");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-3xl font-semibold text-[#2563eb]">
        {t("title")}
      </h1>

      <div className="space-y-4">
        <Accordion title={t("accordionAboutTitle")} defaultOpen>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative h-48 w-full shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100 sm:h-40 sm:w-56">
              <Image
                src={slide4}
                alt="San Luis Potosí"
                fill
                className="object-cover"
                sizes="224px"
              />
            </div>
            <p className="text-sm text-gray-700">{t("accordionAboutContent")}</p>
          </div>
        </Accordion>

        <Accordion title={t("accordionDestinationsTitle")}>
          <DestinationsList />
        </Accordion>
      </div>
    </div>
  );
}
