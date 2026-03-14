/**
 * Booking session storage – persists booking data between seats and payment pages.
 */

import type { PassengerFormData } from "@/components/PassengerForm";

const KEY = "booking_draft";

export interface BookingDraft {
  routeId: string;
  busId: string;
  date: string;
  origin: string;
  destination: string;
  tripType: "one_way" | "round_trip";
  returnDate?: string;
  selectedSeats: string[];
  passengers: PassengerFormData[];
  baseFare: number;
}

export function saveBookingDraft(draft: BookingDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function loadBookingDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BookingDraft;
  } catch {
    return null;
  }
}

export function clearBookingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// PayPal pending state (before redirect to PayPal)
const PAYPAL_PENDING_KEY = "paypal_pending";

export interface PayPalPending {
  orderId: string;
  passengersRedisKey: string;
}

export function savePayPalPending(data: PayPalPending): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PAYPAL_PENDING_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadPayPalPending(): PayPalPending | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PAYPAL_PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PayPalPending;
  } catch {
    return null;
  }
}

export function clearPayPalPending(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PAYPAL_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

// Stripe pending (for 3DS return flow)
const STRIPE_PENDING_KEY = "stripe_pending";

export interface StripePending {
  paymentIntentId: string;
  passengers: PassengerFormData[];
  selectedSeats: string[];
  date: string;
}

export function saveStripePending(data: StripePending): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STRIPE_PENDING_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadStripePending(): StripePending | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STRIPE_PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StripePending;
  } catch {
    return null;
  }
}

export function clearStripePending(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STRIPE_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

// Booking confirmation (after successful payment)
const CONFIRMATION_KEY = "booking_confirmation";

export interface ConfirmationPassenger {
  _id: string;
  ticketNumber: string;
  fullName: string;
  firstName: string;
  surname: string;
  middleName?: string;
  seatLabel: string;
  From: string;
  To: string;
  DepartureDate: string;
  ReturnDate: string | null;
  contactNumber?: string;
  email?: string;
  documentCode?: string;
  documentNumber?: string;
  documentIssuingCountry?: string;
  documentExpiryDate?: string;
  travelerNationality?: string;
  countryOfResidence?: string;
  travelerStatus?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  price?: number;
  currency?: string;
  totalSpent?: number;
  paymentType?: string;
  type?: string;
  qrCode?: { data: string | null; bookingId: string; format: string };
  createdAt?: string;
  [key: string]: unknown;
}

export interface BookingConfirmation {
  passengers: ConfirmationPassenger[];
  type: "cash" | "stripe" | "paypal";
  bookingsCount: number;
  groupTicketSerial: string | null;
  paymentIntentId?: string;
  message?: string;
  tripType?: string;
}

export function saveBookingConfirmation(data: BookingConfirmation): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadBookingConfirmation(): BookingConfirmation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CONFIRMATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BookingConfirmation;
  } catch {
    return null;
  }
}

export function clearBookingConfirmation(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CONFIRMATION_KEY);
  } catch {
    /* ignore */
  }
}
