"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";
import { Phone, Info, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";

const isHomePage = (path: string) => path === "/";

export default function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isAbout = pathname === "/about";
  const [scrolled, setScrolled] = useState(false);

  const useLightHeader = !isHomePage(pathname) || scrolled;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const link = (href: string, label: string, Icon: React.ElementType, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
        useLightHeader
          ? active
            ? "bg-primary text-white shadow-lg shadow-primary/30"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          : active
            ? "bg-primary text-white shadow-lg shadow-primary/30"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${active ? "animate-pulse" : ""}`} />
      <span>{label}</span>
    </Link>
  );

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        useLightHeader
          ? "glass-panel shadow-md py-2"
          : "bg-transparent py-4"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-2 group cursor-pointer">
          <Image src="/logo.png" alt="Logo" width={160} height={160} />
          {/* <span className={`text-xl font-bold tracking-tight ${useLightHeader ? "text-slate-900" : "text-white"}`}>
            LOS MISMOS
          </span> */}
        </div>

        <nav className={`hidden md:flex items-center gap-2 rounded-full p-1 backdrop-blur-md ${
          useLightHeader ? "border border-slate-200/80 bg-white/60" : "border border-white/10 bg-slate-900/50"
        }`}>
          {link("/", t("buyTicket"), Ticket, pathname === "/" || pathname.startsWith("/buy-ticket"))}
          {link("/about", t("about"), Info, isAbout)}
          {link("/contact", t("contactUs"), Phone, pathname === "/contact")}
        </nav>

        <div className="flex items-center gap-4">
            <LanguageSwitcher variant={useLightHeader ? "dark" : "light"} />
        </div>
      </div>
    </header>
  );
}
