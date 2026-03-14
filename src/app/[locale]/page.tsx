import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import FindTicketsForm from "@/components/FindTicketsForm";
import Image from "next/image";
import { MapPin, Ticket, ShieldCheck, CreditCard } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();

  return (
    <div className="-mt-24 flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden bg-slate-900 pb-20 pt-24 lg:min-h-[800px]">
        {/* Background Image & Gradient */}
        <div className="absolute inset-0 z-0 h-full w-full">
          <Image
            src="/hero.jpeg"
            alt="Bus Travel in Mexico"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-slate-900/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-transparent" /> 
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12  lg:grid-cols-2 lg:items-center">
          {/* Hero Content */}
          {/* <div className="space-y-8 animate-slide-up">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              <span className="block">Discover Mexico</span>
              <span className="block text-gradient">with Comfort</span>
            </h1>
            <p className="max-w-xl text-lg text-slate-300 sm:text-xl">
              Travel safely and securely between major cities. Premium buses, professional drivers, and an unforgettable journey await.
            </p>
            
            Features/Stats
            <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-3">
              <div>
                <div className="text-3xl font-bold text-white">100+</div>
                <div className="text-sm text-slate-400">Destinations</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-sm text-slate-400">Support</div>
              </div>
              <div className="hidden sm:block">
                <div className="text-3xl font-bold text-white">5★</div>
                <div className="text-sm text-slate-400">Service</div>
              </div>
            </div>
          </div> */}

          {/* Booking Form Card */}
          <div className="mt-8 lg:mt-0 lg:pl-8 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <FindTicketsForm />
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t("newDestinations")}
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              {t("newDestinationsSubtitle")}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
            {[
              { 
                key: "destinations.rioverde", 
                image: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&q=80&w=1000",
                location: "San Luis Potosí"
              },
              { 
                key: "destinations.matehuala", 
                image: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&q=80&w=1000",
                location: "San Luis Potosí"
              },
            ].map((destination, idx) => (
              <div key={idx} className="group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <div className="aspect-[16/9] w-full relative">
                    <Image
                      src={destination.image}
                      alt={t(`${destination.key}.name`)}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-accent">
                    <MapPin className="h-4 w-4" />
                    {destination.location}
                  </div>
                  <h3 className="mt-2 text-2xl font-bold text-white">
                    {t(`${destination.key}.name`)}
                  </h3>
                   <div className="mt-4 flex flex-wrap gap-2">
                        {[0, 1, 2].map(line => (
                            <span key={line} className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                                {t(`${destination.key}.lines.${line}`)}
                            </span>
                        ))}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Information / Regulations */}
      <section className="bg-white py-24">
         <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-3">
                {/* Payments */}
                <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
                    <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-green-100 p-3 text-green-600">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-slate-900">{t("payments")}</h3>
                    <p className="mb-6 text-slate-600">Secure and flexible payment options for your convenience.</p>
                     <div className="flex flex-wrap gap-3">
                        {["PayPal", "VISA", "MasterCard", "Amex", "Discover"].map(card => (
                            <span key={card} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
                                {card}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Online Tickets */}
                <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
                    <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-blue-100 p-3 text-blue-600">
                        <Ticket className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-slate-900">{t("onlineTickets")}</h3>
                    <p className="text-slate-600">{t("onlineTicketsText")}</p>
                </div>

                {/* Regulations */}
                <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
                    <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-amber-100 p-3 text-amber-600">
                         <ShieldCheck className="h-6 w-6" />
                    </div>
                    <a 
                        href="https://i94.cbp.dhs.gov/I94/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mb-3 block text-xl font-bold text-slate-900 hover:text-primary"
                    >
                        {t("regulations.title")} →
                    </a>
                     <div className="space-y-2 text-sm text-slate-600">
                        <p>{t("regulations.p1")}</p>
                        <p className="line-clamp-3">{t("regulations.p2")}</p>
                     </div>
                </div>
            </div>
         </div>
      </section>
    </div>
  );
}
