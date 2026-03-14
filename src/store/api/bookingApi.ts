/**
 * Booking API – per BOOKING_FLOW.md
 * Endpoints: book-seats, hold-departure, hold-return, complete-round-trip,
 * confirm-stripe-payment, paypal create-order, paypal confirm-payment
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const stored =
    localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  if (stored?.trim()) return stored.trim();
  const defaultToken = process.env.NEXT_PUBLIC_DEFAULT_TOKEN;
  if (defaultToken?.trim()) {
    const token = defaultToken.startsWith("Bearer ")
      ? defaultToken.replace("Bearer ", "").trim()
      : defaultToken.trim();
    return token || null;
  }
  return "ec0f6e753587594cfa0ca440f95eb146096e753727d14c2bf326d655927f0f06";
}

// ============ Types (per BOOKING_FLOW.md) ============

export interface Passenger {
  seatLabel: string;
  fullName: string;
  surname: string;
  firstName: string;
  middleName: string;
  gender: "male" | "female" | "other" | "prefer_not_say";
  dob: string;
  contactNumber: string;
  email?: string;
  phone?: string;
  DocumentId: string;
  documentCode: string;
  documentNumber: string;
  documentIssuingCountry: string;
  documentExpiryDate: string;
  travelerNationality: string;
  countryOfResidence: string;
  travelerStatus: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  departureDate?: string;
}

export interface BookingRequest {
  routeId: string;
  busId: string;
  paymentType: "cash" | "stripe" | "paypal";
  tripType: "one_way" | "round_trip";
  passengers: Passenger[];
  bookedBy?: string;
  additionalBaggage?: string;
  roundTripDate?: string;
  departureDate?: string;
  currency?: "USD" | "MXN";
  email?: string;
  phone?: string;
  origin?: string;
  destination?: string;
}

export interface ReturnTripInfo {
  returnDate: string;
  originalOriginId: string;
  originalOriginName: string;
  originalDestinationId: string;
  originalDestinationName: string;
  passengerCount: number;
}

export interface PassengerWithQR extends Passenger {
  _id: string;
  user: string;
  bookedBy: string;
  busId: string;
  for: "self" | "family";
  ticketNumber: string;
  groupTicketSerial: string | null;
  type: "one_way" | "round_trip";
  From: string;
  To: string;
  origin?: string;
  destination?: string;
  DepartureDate: string;
  ReturnDate: string | null;
  qrCode: {
    data: string;
    bookingId: string;
    format: "base64";
  };
}

export interface BookingCashResponse {
  passengers: PassengerWithQR[];
  type: "cash";
  bookingsCount: number;
  groupTicketSerial: string | null;
  message: string;
  roundTripGroupId?: string;
  returnTripPending?: boolean;
  returnInfo?: ReturnTripInfo;
  isReturnTrip?: boolean;
}

export interface BookingStripeIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  bookingsCount: number;
}

export interface ConfirmStripePaymentRequest {
  paymentIntentId: string;
  departureDate?: string;
  passengersData?: Passenger[];
}

export interface BookingStripeConfirmResponse {
  passengers: PassengerWithQR[];
  type: "stripe";
  bookingsCount: number;
  groupTicketSerial: string | null;
  paymentIntentId: string;
  message: string;
  tripType?: string;
  roundTripGroupId?: string;
  returnTripPending?: boolean;
  returnInfo?: ReturnTripInfo;
  isReturnTrip?: boolean;
}

export interface HoldDepartureRequest {
  routeId: string;
  busId: string;
  tripType: "round_trip";
  returnDate: string;
  departureDate: string;
  passengers: { seatLabel: string }[];
  origin?: string;
  destination?: string;
  userId?: string;
}

export interface HoldDepartureResponse {
  roundTripGroupId: string;
  holdExpiresAt: string;
  returnInfo: ReturnTripInfo;
  heldSeats: string[];
  priceRoundTrip: number;
}

export interface HoldReturnRequest {
  roundTripGroupId: string;
  routeId: string;
  busId: string;
  departureDate?: string;
  returnDate: string;
  tripType: "round_trip";
  passengers: Passenger[];
  origin?: string;
  destination?: string;
  userId?: string;
}

export interface HoldReturnResponse {
  roundTripGroupId: string;
  bothHeld: boolean;
  totalAmount: number;
  taxFee?: number;
  departureSeats: string[];
  returnSeats: string[];
  holdExpiresAt: string;
}

export interface CompleteRoundTripRequest {
  roundTripGroupId: string;
  paymentType: "cash" | "stripe" | "paypal";
  additionalBaggage?: string;
  currency?: "USD" | "MXN";
}

export interface CompleteRoundTripCashResponse {
  departureBooking: {
    passengers: PassengerWithQR[];
    groupTicketSerial: string;
  };
  returnBooking: {
    passengers: PassengerWithQR[];
    groupTicketSerial: string;
  };
  roundTripGroupId: string;
  totalAmount: number;
  taxFee?: number;
  type: "cash";
  passengers: PassengerWithQR[];
}

export interface CompleteRoundTripStripeResponse {
  clientSecret: string;
  paymentIntentId: string;
  roundTripGroupId: string;
  amount: number;
  taxFee?: number;
}

export interface CompleteRoundTripPayPalResponse {
  paypalOrderId: string;
  roundTripGroupId: string;
  amount: number;
  taxFee?: number;
  approvalUrl?: string;
}

export type CompleteRoundTripResponse =
  | CompleteRoundTripCashResponse
  | CompleteRoundTripStripeResponse
  | CompleteRoundTripPayPalResponse;

export interface CreatePayPalOrderRequest {
  amount: number;
  passengersRedisKey: string;
  data: {
    routeId: string;
    busId: string;
    departureDate: string;
    tripType: "one_way" | "round_trip";
    roundTripDate?: string;
    additionalBaggage?: number;
    bookedBy?: string;
    office?: string;
    salesOffice?: string;
  };
}

export interface CreatePayPalOrderResponse {
  orderId: string;
  approvalUrl: string;
}

export interface ConfirmPayPalPaymentRequest {
  orderId: string;
  passengersRedisKey: string;
}

export interface BookingPayPalConfirmResponse {
  passengers: PassengerWithQR[];
  type: "paypal";
  bookingsCount: number;
  groupTicketSerial: string | null;
  message: string;
  tripType?: string;
  roundTripGroupId?: string;
  returnTripPending?: boolean;
  returnInfo?: ReturnTripInfo;
  isReturnTrip?: boolean;
}

// Search by ticket number - API returns { data: { ticket: {...} } }
export interface SearchByTicketResponse {
  passengers?: PassengerWithQR[];
  passenger?: PassengerWithQR;
  ticket?: PassengerWithQR & { qrCode?: string | { data?: string; bookingId?: string; format?: string } };
  [key: string]: unknown;
}

// ============ API ============

export const bookingApi = createApi({
  reducerPath: "bookingApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${baseUrl}/api/v1`,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Booking"],
  endpoints: (builder) => ({
    // One-way / first leg: Cash
    bookSeatsCash: builder.mutation<BookingCashResponse, BookingRequest>({
      query: (body) => ({
        url: "/public/book-seats",
        method: "POST",
        body: { ...body, paymentType: "cash", bookedBy: "web" },
      }),
      transformResponse: (res: { data?: BookingCashResponse }) =>
        res.data ?? (res as unknown as BookingCashResponse),
    }),

    // One-way / first leg: Stripe
    bookSeatsStripe: builder.mutation<
      BookingStripeIntentResponse,
      BookingRequest
    >({
      query: (body) => ({
        url: "/public/book-seats",
        method: "POST",
        body: { ...body, paymentType: "stripe", bookedBy: "web" },
      }),
      transformResponse: (res: { data?: BookingStripeIntentResponse }) =>
        res.data ?? (res as unknown as BookingStripeIntentResponse),
    }),

    confirmStripePayment: builder.mutation<
      BookingStripeConfirmResponse,
      ConfirmStripePaymentRequest
    >({
      query: (body) => ({
        url: "/public/confirm-stripe-payment",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data?: BookingStripeConfirmResponse }) =>
        res.data ?? (res as unknown as BookingStripeConfirmResponse),
    }),

    // One-way / first leg: PayPal prepare
    bookSeatsPayPal: builder.mutation<
      { passengersRedisKey: string; amount: number; bookingsCount: number; baseFare?: number },
      BookingRequest
    >({
      query: (body) => ({
        url: "/public/book-seats",
        method: "POST",
        body: { ...body, paymentType: "paypal", bookedBy: "web" },
      }),
      transformResponse: (res: {
        data?: {
          passengersRedisKey: string;
          amount: number;
          bookingsCount: number;
          baseFare?: number;
        };
      }) =>
        res.data ?? (res as unknown as { passengersRedisKey: string; amount: number; bookingsCount: number; baseFare?: number }),
    }),

    createPayPalOrder: builder.mutation<
      CreatePayPalOrderResponse,
      CreatePayPalOrderRequest
    >({
      query: (body) => ({
        url: "/public/create-order",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data?: CreatePayPalOrderResponse }) =>
        res.data ?? (res as unknown as CreatePayPalOrderResponse),
    }),

    confirmPayPalPayment: builder.mutation<
      BookingPayPalConfirmResponse,
      ConfirmPayPalPaymentRequest
    >({
      query: (body) => ({
        url: "/public/confirm-payment",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data?: BookingPayPalConfirmResponse }) =>
        res.data ?? (res as unknown as BookingPayPalConfirmResponse),
    }),

    // Round-trip
    holdDeparture: builder.mutation<HoldDepartureResponse, HoldDepartureRequest>(
      {
        query: (body) => ({
          url: "/public/hold-departure",
          method: "POST",
          body,
        }),
        transformResponse: (res: { data?: HoldDepartureResponse }) =>
          res.data ?? (res as unknown as HoldDepartureResponse),
      }
    ),

    holdReturn: builder.mutation<HoldReturnResponse, HoldReturnRequest>({
      query: (body) => ({
        url: "/public/hold-return",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data?: HoldReturnResponse }) =>
        res.data ?? (res as unknown as HoldReturnResponse),
    }),

    completeRoundTrip: builder.mutation<
      CompleteRoundTripResponse,
      CompleteRoundTripRequest
    >({
      query: (body) => ({
        url: "/public/complete-round-trip",
        method: "POST",
        body,
      }),
      transformResponse: (res: { data?: CompleteRoundTripResponse }) =>
        res.data ?? (res as unknown as CompleteRoundTripResponse),
    }),

    searchByTicketNumber: builder.query<SearchByTicketResponse, string>({
      query: (ticketNumber) => ({
        url: "/public/search/" + encodeURIComponent(ticketNumber),
      }),
      transformResponse: (res: { data?: SearchByTicketResponse }) =>
        res.data ?? (res as unknown as SearchByTicketResponse),
    }),
  }),
});

export const {
  useBookSeatsCashMutation,
  useBookSeatsStripeMutation,
  useConfirmStripePaymentMutation,
  useBookSeatsPayPalMutation,
  useCreatePayPalOrderMutation,
  useConfirmPayPalPaymentMutation,
  useHoldDepartureMutation,
  useHoldReturnMutation,
  useCompleteRoundTripMutation,
  useSearchByTicketNumberQuery,
} = bookingApi;
