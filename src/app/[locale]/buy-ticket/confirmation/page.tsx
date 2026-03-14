"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Tag,
  MapPin,
  Calendar,
  QrCode,
  Download,
  CheckCircle,
  Home,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useSearchByTicketNumberQuery } from "@/store/api/bookingApi";
import { downloadTicketPdf } from "@/lib/print-ticket";

interface TicketPassenger {
  _id: string;
  ticketNumber: string;
  fullName?: string;
  firstName?: string;
  surname?: string;
  middleName?: string;
  seatLabel: string;
  From?: string;
  To?: string;
  DepartureDate?: string;
  contactNumber?: string;
  email?: string;
  documentCode?: string;
  documentNumber?: string;
  documentIssuingCountry?: string;
  documentExpiryDate?: string;
  travelerNationality?: string;
  countryOfResidence?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  price?: number;
  totalSpent?: number;
  paymentType?: string;
  type?: string;
  qrCode?: { data?: string | null; bookingId?: string; format?: string } | string;
  createdAt?: string;
  [key: string]: unknown;
}

function formatDateFull(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Show exact time from ISO string without localizing (use UTC as stored). */
function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const am = h < 12;
    const hour12 = h % 12 || 12;
    const min = String(m).padStart(2, "0");
    return `${hour12}:${min} ${am ? "AM" : "PM"}`;
  } catch {
    return dateStr;
  }
}

const DISCLAIMER_EN = [
  "Ticket good for one month from date of purchase, cancelling 24 hours in advance.",
  "Any ticket lost or stolen will not be refunded or replaced. Paid ticket holder.",
  "70 pounds of luggage per person. Any excessive pound will have a charge of $1.",
  "We won't be accepting change of dates during vacational seasons.",
  "No pets allowed.",
];

function TicketCard({
  passenger,
  paymentType,
}: {
  passenger: TicketPassenger;
  paymentType: string;
  createdAt?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadTicketPdf(passenger.ticketNumber);
    } catch (err) {
      alert((err as Error)?.message ?? "Failed to download ticket");
    } finally {
      setDownloading(false);
    }
  };

  const fullName =
    passenger.fullName ||
    [passenger.firstName, passenger.middleName, passenger.surname]
      .filter(Boolean)
      .join(" ");
  const amount = passenger.totalSpent ?? passenger.price ?? 0;
  const qrCodeRaw = passenger.qrCode;
  const qrData =
    typeof qrCodeRaw === "string"
      ? qrCodeRaw
      : (qrCodeRaw as { data?: string | null })?.data;
  const hasValidQrData =
    qrData &&
    typeof qrData === "string" &&
    qrData.trim().length > 50 &&
    qrData !== "null";
  const qrPayload =
    (typeof qrCodeRaw === "object" && qrCodeRaw?.bookingId) ||
    passenger.ticketNumber ||
    passenger._id;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-all hover:shadow-xl">
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4">
        <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-bold text-green-800">Confirmed Booking</span>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-900 shadow-sm border border-gray-200">
          Ticket #{passenger.ticketNumber}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-8">
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <User className="h-5 w-5 text-primary" />
              Passenger Information
            </h3>
            <div className="rounded-xl bg-gray-50 p-4">
                <dl className="grid gap-y-3 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <dt className="text-xs text-gray-500 uppercase font-semibold">Full Name</dt>
                    <dd className="font-bold text-gray-900 text-lg">{fullName}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500 uppercase font-semibold">Document</dt>
                    <dd className="text-gray-700">{passenger.documentCode} - {passenger.documentNumber}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500 uppercase font-semibold">Nationality</dt>
                    <dd className="text-gray-700">{passenger.travelerNationality}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500 uppercase font-semibold">Seat</dt>
                    <dd className="font-bold text-primary text-base">{passenger.seatLabel}</dd>
                </div>
                 <div>
                    <dt className="text-xs text-gray-500 uppercase font-semibold">Status</dt>
                    <dd className="text-green-600 font-medium">Active</dd>
                </div>
                </dl>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-gray-900">Important Information</h3>
            <ul className="space-y-1 text-xs text-gray-500 list-disc list-inside bg-gray-50 p-4 rounded-xl">
              {DISCLAIMER_EN.slice(0, 3).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <MapPin className="h-5 w-5 text-primary" />
              Trip Details
            </h3>
             <div className="rounded-xl border border-gray-100 bg-white p-0 shadow-sm overflow-hidden">
                <div className="flex flex-col">
                     <div className="p-4 bg-gray-50 border-b border-gray-100">
                        <div className="text-xs text-gray-500 uppercase font-semibold">Route</div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-gray-900">{passenger.From}</span>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <span className="font-bold text-gray-900">{passenger.To}</span>
                        </div>
                     </div>
                     <div className="p-4 grid grid-cols-2 gap-4">
                        <div>
                             <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Calendar className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase">Date</span>
                             </div>
                             <div className="font-medium text-gray-900">{formatDateFull(passenger.DepartureDate)}</div>
                        </div>
                        <div>
                             <div className="flex items-center gap-2 text-gray-500 mb-1">
                                <Tag className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase">Time</span>
                             </div>
                             <div className="font-medium text-gray-900">{formatTime(passenger.DepartureDate)}</div>
                        </div>
                     </div>
                </div>
             </div>
          </div>

          <div>
             <div className="flex items-end justify-between border-t border-gray-100 pt-4">
                <div>
                     <p className="text-sm text-gray-500">Total Paid</p>
                     <p className="text-xs text-gray-400">via {paymentType}</p>
                </div>
                <div className="text-3xl font-bold text-primary">${amount.toFixed(2)}</div>
             </div>
          </div>

        </div>
      </div>

      {/* Ticket Validation - QR code */}
      <div className="border-t border-gray-200 bg-gray-50 p-6 sm:p-8">
        <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
          <QrCode className="h-5 w-5 text-gray-700" />
          Boarding Pass
        </h3>
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            {hasValidQrData ? (
                <Image
                src={qrData.startsWith("data:") ? qrData : `data:image/png;base64,${qrData}`}
                alt="Ticket QR code"
                width={160}
                height={160}
                className="h-40 w-40"
                unoptimized={qrData.startsWith("data:")}
                />
            ) : (
                <QRCodeSVG
                    value={qrPayload}
                    size={160}
                    level="M"
                    includeMargin={false}
                />
            )}
          </div>
          <div className="flex-1 space-y-4 text-center sm:text-left">
             <div>
                <h4 className="font-bold text-gray-900">Ready to Board?</h4>
                <p className="text-sm text-gray-600 mt-1">Please show this QR code to the driver upon boarding. You may also print this ticket for your records.</p>
             </div>
             <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                 <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-70 hover:bg-black"
                >
                    <Download className="h-4 w-4" />
                    {downloading ? "Generating PDF..." : "Download PDF"}
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketNumber = searchParams.get("ticketNumber");

  const { data, isLoading, error } = useSearchByTicketNumberQuery(
    ticketNumber ?? "",
    { skip: !ticketNumber }
  );

  const passengers: TicketPassenger[] = data?.passengers
    ? (data.passengers as unknown as TicketPassenger[])
    : data?.passenger
      ? [data.passenger as unknown as TicketPassenger]
      : data?.ticket
        ? [data.ticket as unknown as TicketPassenger]
        : [];

  const handleBackHome = () => router.push("/");
  
  if (!ticketNumber) return null; // Or redirect

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || passengers.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
            <User className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Ticket Not Found</h2>
        <p className="mb-6 text-gray-600">We couldn&apos;t retrieve the details for ticket #{ticketNumber}.</p>
        <button
          onClick={() => router.push("/buy-ticket")}
          className="rounded-lg bg-primary px-6 py-2 font-medium text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  const paymentType = (passengers[0]?.paymentType as string) || "cash";

  return (
      <div className="min-h-screen bg-gray-100 pb-20">
         <div className="bg-primary pb-32 pt-12">
             <div className="mx-auto max-w-7xl px-4">
                 <div className="flex items-center justify-between text-white">
                     <div>
                        <h1 className="text-3xl font-bold">Booking Confirmed!</h1>
                        <p className="mt-2 text-blue-100">Thank you for traveling with us. Your journey is set.</p>
                     </div>
                     <button onClick={handleBackHome} className="hidden sm:flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 font-medium hover:bg-white/20 transition-colors">
                        <Home className="h-4 w-4" />
                        Back Home
                     </button>
                 </div>
             </div>
         </div>

         <div className="mx-auto max-w-4xl px-4 -mt-20 space-y-8">
            {passengers.map((p) => (
                <TicketCard
                key={p._id}
                passenger={p}
                paymentType={paymentType}
                createdAt={p.createdAt}
                />
            ))}
            
            <div className="flex justify-center pt-8">
                 <button onClick={handleBackHome} className="sm:hidden flex items-center gap-2 text-gray-500 hover:text-gray-900">
                    <Home className="h-4 w-4" />
                    Return to Home
                 </button>
            </div>
         </div>
      </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
