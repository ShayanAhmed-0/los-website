"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold text-xl">
                LM
              </div>
              <span className="text-xl font-bold text-white">Transportes Los Mismos</span>
            </div>
            <p className="text-sm text-gray-400 max-w-xs">
              Premium bus travel experience across major cities. Comfortable, reliable, and affordable.
            </p>
          </div>

          {/* Links - only app pages */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{t("links")}</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/" className="text-sm hover:text-white transition-colors">{tNav("buyTicket")}</Link>
              </li>
              <li>
                <Link href="/about" className="text-sm hover:text-white transition-colors">{tNav("about")}</Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm hover:text-white transition-colors">{tNav("contactUs")}</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Contact</h3>
            <ul className="mt-4 space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">{t("address")}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">support@losmismos.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-800 pt-8">
          <p className="text-sm text-gray-500 text-center md:text-left">
            &copy; {currentYear} {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
