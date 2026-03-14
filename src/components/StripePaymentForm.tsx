"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { Passenger } from "@/store/api/bookingApi";
import type { PassengerFormData } from "@/components/PassengerForm";
import { useTranslations } from "next-intl";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? ""
);

interface StripePaymentFormInnerProps {
  clientSecret: string;
  paymentIntentId: string;
  passengers: Passenger[];
  passengersFormData: PassengerFormData[];
  selectedSeats: string[];
  date: string;
  amount: number;
  tax: number;
  onSuccess: (groupId: string, count: number) => void;
  onPaymentSucceededNoRedirect?: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

function StripePaymentFormInner(props: StripePaymentFormInnerProps) {
  const {
    clientSecret,
    paymentIntentId,
    passengers,
    passengersFormData,
    selectedSeats,
    date,
    amount,
    onPaymentSucceededNoRedirect,
    onError,
    onCancel,
    t,
  } = props;
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsSubmitting(true);

    // Call elements.submit() first, prior to any async work (per Stripe docs)
    const { error: submitError } = await elements.submit();
    if (submitError) {
      onError(submitError.message ?? t("bookingJourney.stripe.validationFailed"));
      setIsSubmitting(false);
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const locale =
      typeof window !== "undefined"
        ? (window.location.pathname.split("/")[1] || "en")
        : "en";
    const returnUrl = `${origin}/${locale}/buy-ticket/payment/stripe-return`;

    // Save pending for 3DS return flow
    const { saveStripePending } = await import("@/lib/booking-session");
    saveStripePending({
      paymentIntentId,
      passengers: passengersFormData,
      selectedSeats,
      date,
    });

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl,
          receipt_email: passengers[0]?.email ?? undefined,
          payment_method_data: {
            billing_details: {
              name: passengers[0]
                ? [passengers[0].firstName, passengers[0].surname].filter(Boolean).join(" ")
                : undefined,
              email: passengers[0]?.email,
              phone: passengers[0]?.contactNumber,
              address: passengers[0]
                ? {
                    line1: passengers[0].streetAddress,
                    city: passengers[0].city,
                    state: passengers[0].state,
                    postal_code: passengers[0].postalCode,
                    country: passengers[0].documentIssuingCountry,
                  }
                : undefined,
            },
          },
        },
      });

      if (error) {
        onError(error.message ?? t("bookingJourney.stripe.paymentFailed"));
        setIsSubmitting(false);
        return;
      }

      // Payment succeeded without redirect (e.g. saved card, Link)
      onPaymentSucceededNoRedirect?.();
    } catch (err) {
      onError((err as Error)?.message ?? t("bookingJourney.stripe.paymentFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t("bookingJourney.common.cancel")}
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isSubmitting}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-70"
        >
          {isSubmitting ? t("bookingJourney.payment.processing") : `${t("bookingJourney.payment.pay")} $${(amount ?? 0).toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

interface StripePaymentFormProps {
  tax: number;
  clientSecret: string;
  paymentIntentId: string;
  passengers: Passenger[];
  passengersFormData: PassengerFormData[];
  selectedSeats: string[];
  date: string;
  amount: number;
  onSuccess: (groupId: string, count: number) => void;
  onPaymentSucceededNoRedirect?: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

export function StripePaymentForm({
  tax,
  clientSecret,
  paymentIntentId,
  passengers,
  passengersFormData,
  selectedSeats,
  date,
  amount,
  onSuccess,
  onPaymentSucceededNoRedirect,
  onError,
  onCancel,
}: StripePaymentFormProps) {
  const t = useTranslations();
  
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
        {t("bookingJourney.stripe.notConfigured")}
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#16a34a",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentFormInner
        tax={tax}
        clientSecret={clientSecret}
        paymentIntentId={paymentIntentId}
        passengers={passengers}
        passengersFormData={passengersFormData}
        selectedSeats={selectedSeats}
        date={date}
        amount={amount}
        onSuccess={onSuccess}
        onPaymentSucceededNoRedirect={onPaymentSucceededNoRedirect}
        onError={onError}
        onCancel={onCancel}
        t={t}
      />
    </Elements>
  );
}
