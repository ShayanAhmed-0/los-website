"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

type Props = { variant?: "light" | "dark" };

export default function LanguageSwitcher({ variant = "light" }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isDark = variant === "dark";

  return (
    <select
      value={locale}
      onChange={(e) => {
        const next = e.target.value as "en" | "es";
        router.replace(pathname, { locale: next });
      }}
      className={`cursor-pointer appearance-none rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
        isDark
          ? "border-slate-300 bg-white/80 text-slate-700 focus:ring-primary"
          : "border-white/30 bg-transparent text-white focus:ring-white"
      }`}
      aria-label={t("language")}
    >
      <option value="en" className="text-black">English</option>
      <option value="es" className="text-black">Español</option>
    </select>
  );
}
