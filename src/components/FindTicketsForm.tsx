"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetDestinationsQuery } from "@/store/api/destinationsApi";
import { MapPin, Calendar, Search, ArrowRight, ArrowLeftRight } from "lucide-react";

const inputBaseClass =
  "w-full rounded-xl border-0 bg-input-bg px-4 py-3 pl-11 text-sm font-medium text-foreground transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400";

const labelClass = "mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500";

function SearchableSelectDestination({
  value,
  onChange,
  placeholder,
  destinations,
  isLoading,
  "aria-label": ariaLabel,
  icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  destinations: { _id: string; name: string }[];
  isLoading: boolean;
  "aria-label": string;
  icon: React.ElementType;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDest = value ? destinations.find((d) => d._id === value) : null;
  const selectedName = selectedDest ? selectedDest.name : "";
  const searchLower = search.trim().toLowerCase();
  const filtered = searchLower
    ? destinations.filter((d) => d.name.toLowerCase().includes(searchLower))
    : destinations;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        role="combobox"
        aria-expanded={open}
        aria-controls="destination-listbox"
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => !isLoading && setOpen((o) => !o)}
        className={`relative flex cursor-pointer items-center ${inputBaseClass} ${isLoading ? "opacity-70" : ""}`}
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon className="h-5 w-5" />
        </div>
        <span className={value ? "text-foreground" : "text-gray-400"}>
          {isLoading ? t("bookingJourney.common.loading") : value ? selectedName : placeholder}
        </span>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {open && (
        <div
          id="destination-listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
          role="listbox"
        >
          <div className="border-b border-gray-100 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-input-bg px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchLocation")}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                autoFocus
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto p-1">
            {value && (
              <li
                role="option"
                aria-selected={false}
                onClick={() => handleSelect("")}
                className="cursor-pointer rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-100"
              >
                {t("clearSelection")}
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">{t("noLocationsFound")}</li>
            ) : (
              filtered.map((d) => (
                <li
                  key={d._id}
                  role="option"
                  aria-selected={value === d._id}
                  onClick={() => handleSelect(d._id)}
                  className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-primary/10 ${
                    value === d._id ? "bg-primary/10 font-medium text-primary" : "text-gray-700"
                  }`}
                >
                  {d.name}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function todayYYYYMMDD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(yyyyMmDd: string, days: number): string {
  const d = new Date(yyyyMmDd + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface FindTicketsFormProps {
  onSearch?: (filters: {
    origin: string;
    destination: string;
    date: string;
    tripType: "one-way" | "round-trip";
    returnDate?: string;
  }) => void;
  initialValues?: {
    origin?: string;
    destination?: string;
    date?: string;
    tripType?: "one-way" | "round-trip";
    returnDate?: string;
  };
}

export default function FindTicketsForm({
  onSearch,
  initialValues,
}: FindTicketsFormProps = {}) {
  const t = useTranslations();
  const router = useRouter();
  const [tripType, setTripType] = useState<"oneWay" | "roundTrip">(
    initialValues?.tripType === "round-trip" ? "roundTrip" : "oneWay"
  );
  const [leavingFrom, setLeavingFrom] = useState(initialValues?.origin ?? "");
  const [arrivingTo, setArrivingTo] = useState(
    initialValues?.destination ?? ""
  );
  const [departureDate, setDepartureDate] = useState(initialValues?.date ?? "");
  const [returnDate, setReturnDate] = useState(
    initialValues?.returnDate ?? ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const { data, isLoading } = useGetDestinationsQuery();
  const destinations = data?.destinations?.destinations ?? [];
  const today = todayYYYYMMDD();
  const returnMin = departureDate ? addDays(departureDate, 1) : today;

  // Dallas is the hub: one of Leaving From / Arriving To must always be Dallas
  const dallasId = destinations.find((d) => d.name.toLowerCase().includes("dallas"))?._id ?? null;
  // When the other field is empty, show ALL (including Dallas). When other is Dallas, show all except Dallas. When other is non-Dallas, show only Dallas.
  const leavingFromOptions = dallasId
    ? !arrivingTo
      ? destinations
      : arrivingTo === dallasId
        ? destinations.filter((d) => d._id !== dallasId)
        : destinations.filter((d) => d._id === dallasId)
    : destinations;

  const arrivingToOptions = dallasId
    ? !leavingFrom
      ? destinations
      : leavingFrom === dallasId
        ? destinations.filter((d) => d._id !== dallasId)
        : destinations.filter((d) => d._id === dallasId)
    : destinations;

  const handleLeavingFromChange = (value: string) => {
    setLeavingFrom(value);
    if (!dallasId) return;
    if (value && value !== dallasId) {
      setArrivingTo(dallasId);
    } else if (value === dallasId && arrivingTo === dallasId) {
      setArrivingTo("");
    }
  };

  const handleArrivingToChange = (value: string) => {
    setArrivingTo(value);
    if (!dallasId) return;
    if (value && value !== dallasId) {
      setLeavingFrom(dallasId);
    } else if (value === dallasId && leavingFrom === dallasId) {
      setLeavingFrom("");
    }
  };

  // Enforce hub rule when destinations load with invalid initial values (both non-Dallas)
  useEffect(() => {
    if (!dallasId || !leavingFrom || !arrivingTo) return;
    if (leavingFrom !== dallasId && arrivingTo !== dallasId) {
      setArrivingTo(dallasId);
    }
  }, [dallasId, leavingFrom, arrivingTo]);

  const handleFindTrip = () => {
    setValidationError(null);
    if (!leavingFrom) {
      setValidationError(t("validationOrigin"));
      return;
    }
    if (!arrivingTo) {
      setValidationError(t("validationDestination"));
      return;
    }
    if (!departureDate) {
      setValidationError(t("validationDepartureDate"));
      return;
    }
    if (tripType === "roundTrip" && !returnDate) {
      setValidationError(t("validationReturnDate"));
      return;
    }
    
    // Animate button press or show loading state here if needed
    
    const tripTypeParam = tripType === "oneWay" ? "one-way" : "round-trip";
    const filters = {
      origin: leavingFrom,
      destination: arrivingTo,
      date: departureDate,
      tripType: tripTypeParam as "one-way" | "round-trip",
      returnDate: tripType === "roundTrip" ? returnDate : undefined,
    };
    if (onSearch) {
      onSearch(filters);
    } else {
      const params = new URLSearchParams({
        origin: leavingFrom,
        destination: arrivingTo,
        date: departureDate,
        tripType: tripTypeParam,
      });
      if (tripType === "roundTrip" && returnDate) {
        params.set("returnDate", returnDate);
      }
      router.push(`/buy-ticket?${params.toString()}`);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Decorative top gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-full bg-slate-100 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setTripType("oneWay")}
            className={`flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-all duration-300 ${
              tripType === "oneWay"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <ArrowRight className="h-4 w-4" />
            {t("oneWay")}
          </button>
          <button
            type="button"
            onClick={() => setTripType("roundTrip")}
            className={`flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-all duration-300 ${
              tripType === "roundTrip"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            {t("roundTrip")}
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t("leavingFrom")}</label>
            <SearchableSelectDestination
              value={leavingFrom}
              onChange={handleLeavingFromChange}
              placeholder={t("selectCityFrom")}
              destinations={leavingFromOptions}
              isLoading={isLoading}
              aria-label={t("selectCityFrom")}
              icon={MapPin}
            />
          </div>
          <div>
            <label className={labelClass}>{t("arrivingTo")}</label>
            <SearchableSelectDestination
              value={arrivingTo}
              onChange={handleArrivingToChange}
              placeholder={t("selectCityTo")}
              destinations={arrivingToOptions}
              isLoading={isLoading}
              aria-label={t("selectCityTo")}
              icon={MapPin}
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{t("departureDate")}</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <input
                type="date"
                min={today}
                value={departureDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setDepartureDate(v);
                  if (returnDate && v && returnDate <= v) setReturnDate("");
                }}
                aria-label={t("departureDate")}
                className={inputBaseClass}
              />
            </div>
          </div>
          
          <div className={`transition-all duration-300 ${tripType === "roundTrip" ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
           {tripType === "roundTrip" && (
             <>
                <label className={labelClass}>{t("returnDate")}</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <input
                    type="date"
                    min={returnMin}
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    aria-label={t("returnDate")}
                    className={inputBaseClass}
                  />
                </div>
             </>
           )}
          </div>
        </div>
      </div>

      {validationError && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 animate-fade-in flex items-center gap-2" role="alert">
           <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          {validationError}
        </div>
      )}

      <button
        type="button"
        onClick={handleFindTrip}
        className="group mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-8 py-4 text-base font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
      >
        <Search className="h-5 w-5 transition-transform group-hover:rotate-12" />
        {t("findTrip")}
      </button>
    </div>
  );
}
