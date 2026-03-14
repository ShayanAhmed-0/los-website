"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useConfirmStripePaymentMutation, type Passenger } from "@/store/api/bookingApi";
import { loadStripePending, clearStripePending, clearBookingDraft } from "@/lib/booking-session";
import { passengerFormToApi } from "@/components/PassengerForm";

function StripeReturnContent() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [confirmStripe] = useConfirmStripePaymentMutation();

  useEffect(() => {
    const paymentIntentId = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");

    if (!paymentIntentId || !redirectStatus) {
       setStatus("error");
       setErrorMessage("Invalid return parameters.");
       return;
    }

    if (redirectStatus !== "succeeded") {
        setStatus("error");
        setErrorMessage(t("bookingJourney.stripe.paymentFailed"));
        return;
    }

    let isMounted = true;

    const processPayment = async () => {
        const pendingData = loadStripePending();
        
        // Prepare payload
        const payload: { paymentIntentId: string; departureDate?: string; passengersData?: Passenger[] } = { paymentIntentId };
        
        if (pendingData && pendingData.paymentIntentId === paymentIntentId) {
             const passengersApi = pendingData.passengers.map((p, i) =>
                passengerFormToApi(p, pendingData.selectedSeats[i] ?? "", pendingData.date)
            );
            payload.departureDate = pendingData.date;
            payload.passengersData = passengersApi;
        } else {
            console.warn("No pending session data found matching intent, attempting confirmation without local data.");
        }

        try {
            const res = await confirmStripe(payload).unwrap();

            if (!isMounted) return;

            clearStripePending();
            clearBookingDraft();
            
            const ticketNumber = res.passengers[0]?.ticketNumber;
            router.push(ticketNumber ? `/buy-ticket/confirmation?ticketNumber=${encodeURIComponent(ticketNumber)}` : "/buy-ticket/confirmation");

        } catch (err: unknown) {
            console.error("Confirmation failed", err);
             if (!isMounted) return;
             const message = (err as { data?: { message?: string } })?.data?.message ?? "Failed to finalize booking.";
             setErrorMessage(message);
             setStatus("error");
        }
    };

    processPayment();
    
    return () => { isMounted = false; };
  }, [searchParams, confirmStripe, router, t]);

  if (status === "loading") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <h2 className="text-xl font-semibold text-gray-900">{t("bookingJourney.payment.processing")}</h2>
                <p className="text-gray-500">Please wait while we confirm your ticket...</p>
            </div>
        </div>
      );
  }

  if (status === "error") {
      return (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900">Payment Issue</h1>
                <p className="mb-6 text-gray-600">{errorMessage}</p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => router.push("/buy-ticket")} 
                        className="w-full rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-lg transition-transform active:scale-95"
                    >
                        Return to Booking
                    </button>
                    <button 
                        onClick={() => router.push("/")} 
                        className="w-full rounded-xl border border-gray-300 bg-white px-6 py-3 font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-transform active:scale-95"
                    >
                        Go Home
                    </button>
                </div>
            </div>
          </div>
      );
  }

  return null;
}

export default function StripeReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <StripeReturnContent />
    </Suspense>
  );
}
