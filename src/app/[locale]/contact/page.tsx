"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Home, MapPin, Mail, Send, CheckCircle2 } from "lucide-react";
import { useGetAboutUsQuery } from "@/store/api/miscApi";
import type { AboutUsOffice } from "@/store/api/miscApi";

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 focus:shadow-sm";

function getMapEmbedUrl(office: AboutUsOffice): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${office.latitude},${office.longitude}&zoom=15`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(office.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

function OfficeSection({ offices }: { offices: AboutUsOffice[] }) {
  const [selected, setSelected] = useState<AboutUsOffice | null>(offices[0] ?? null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="max-h-[400px] space-y-4 overflow-y-auto pr-2">
        {offices.map((office, i) => (
          <div
            key={office.name}
            onClick={() => setSelected(office)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSelected(office)}
            className={`cursor-pointer rounded-xl border-2 bg-white p-4 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              selected?.name === office.name
                ? "border-primary shadow-md ring-2 ring-primary/20"
                : "border-gray-200"
            }`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <h4 className="font-semibold text-gray-900">{office.name}</h4>
            <p className="mt-1 text-sm text-gray-600">{office.address}</p>
            <p className="mt-1 text-sm text-gray-600">
              P: <span className="font-medium">{office.phone}</span>
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(office);
              }}
              className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-primary-dark hover:shadow active:scale-[0.98]"
            >
              <MapPin className="h-4 w-4" />
              Map
            </button>
          </div>
        ))}
      </div>
      <div className="min-h-[300px] overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        {selected ? (
          <iframe
            key={selected.name}
            title="Office location"
            src={getMapEmbedUrl(selected)}
            width="100%"
            height="100%"
            style={{ minHeight: "350px", border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[350px] w-full animate-fade-in-scale"
          />
        ) : (
          <div className="flex h-[350px] items-center justify-center text-gray-500">
            Select an office to view on map
          </div>
        )}
      </div>
    </div>
  );
}

function EmailForm() {
  const t = useTranslations("contactPage");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    // TODO: wire to contact API when available
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    setSuccess(true);
    (e.target as HTMLFormElement).reset();
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <p className="text-sm text-gray-600">
        {t("emailIntro")}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t("firstName")} *
          </label>
          <input
            type="text"
            name="firstName"
            className={INPUT_CLASS}
            placeholder={t("firstName")}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t("lastName")} *
          </label>
          <input
            type="text"
            name="lastName"
            className={INPUT_CLASS}
            placeholder={t("lastName")}
            required
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {t("email")} *
        </label>
        <input
          type="email"
          name="email"
          className={INPUT_CLASS}
          placeholder={t("email")}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {t("telephone")}
        </label>
        <input
          type="tel"
          name="telephone"
          className={INPUT_CLASS}
          placeholder={t("telephone")}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {t("subject")} *
        </label>
        <input
          type="text"
          name="subject"
          className={INPUT_CLASS}
          placeholder={t("subject")}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {t("message")} *
        </label>
        <textarea
          name="message"
          rows={5}
          className={INPUT_CLASS}
          placeholder={t("message")}
          required
        />
      </div>
      <p className="text-xs text-gray-500">* {t("requiredFields")}</p>
      {success && (
        <div
          role="alert"
          className="flex animate-fade-in-scale items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          {t("successMessage")}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-primary-dark hover:shadow active:scale-[0.98] disabled:scale-100 disabled:opacity-70"
      >
        <Send className={`h-4 w-4 ${submitting ? "animate-pulse" : ""}`} />
        {submitting ? t("sending") : t("send")}
      </button>
    </form>
  );
}

function ContactAccordion({
  title,
  icon: Icon,
  children,
  defaultOpen,
  index,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  index?: number;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
      style={{ animationDelay: index != null ? `${index * 100}ms` : undefined }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-2 px-4 py-3 text-left text-base font-semibold text-primary transition-all duration-200 hover:bg-gray-50"
      >
        <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
        {title}
        <span
          className={`ml-auto text-lg font-light text-gray-400 transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
          aria-hidden
        >
          +
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-gray-200 px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const t = useTranslations("contactPage");
  const { data: offices = [], isLoading } = useGetAboutUsQuery();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1
        className="mb-2 text-3xl font-bold text-primary animate-slide-up"
        style={{ animationFillMode: "both" }}
      >
        {t("title")}
      </h1>
      <p
        className="mb-8 text-gray-600 animate-slide-up"
        style={{ animationDelay: "0.1s", animationFillMode: "both" }}
      >
        {t("intro")}
      </p>

      <div className="space-y-4">
        <ContactAccordion
          title={t("office")}
          icon={Home}
          defaultOpen
          index={0}
        >
          {isLoading ? (
            <p className="py-8 text-center text-gray-500">{t("loading")}</p>
          ) : offices.length > 0 ? (
            <OfficeSection offices={offices} />
          ) : (
            <p className="py-8 text-center text-gray-500">{t("noOffices")}</p>
          )}
        </ContactAccordion>

        <ContactAccordion title={t("emailUs")} icon={Mail} index={1}>
          <EmailForm />
        </ContactAccordion>
      </div>
    </div>
  );
}
