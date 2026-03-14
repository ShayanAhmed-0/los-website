"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useGetRoutesQuery, useGetRouteByIdQuery } from "@/store/api/routesApi";
import type { Route } from "@/store/api/routesApi";
import {
  useSocket,
  useRouteRoom,
  useSeatManagement,
  useSeatStatusListener,
} from "@/hooks/useSocket";
import {
  PassengerFormFields,
  createEmptyPassenger,
  validatePassenger,
  passengerFormToApi,
  type PassengerFormData,
} from "@/components/PassengerForm";
import { clearBookingDraft, savePayPalPending } from "@/lib/booking-session";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StripePaymentForm } from "@/components/StripePaymentForm";
import { WizardStepper } from "@/components/WizardStepper";
import {
    useBookSeatsCashMutation,
    useBookSeatsStripeMutation,
    useBookSeatsPayPalMutation,
    useCreatePayPalOrderMutation,
    useConfirmStripePaymentMutation,
    useHoldDepartureMutation,
    useHoldReturnMutation,
    useCompleteRoundTripMutation,
    type Passenger,
} from "@/store/api/bookingApi";

// --- Helper Types & Functions ---

interface SearchFilters {
  origin: string;
  destination: string;
  date: string;
  tripType: "one-way" | "round-trip";
  returnDate?: string;
}

interface Seat {
  _id: string;
  seatLabel: string;
  seatIndex: number;
  status: string;
  isAvailable: boolean;
  meta?: {
    seatNumber: number;
    row: number;
    column: number;
    position: string;
    section: string;
  };
}

function formatTime(time: string, minsOffset = 0): string {
  if (!time) return "N/A";
  const [h, m] = time.split(":").map(Number);
  const totalMins = h * 60 + m + minsOffset;
  const nh = Math.floor(totalMins / 60) % 24;
  const nm = totalMins % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function getDayTimeForDate(
  dayTime: { day: string; time: string }[] | undefined,
  date: string
): { day: string; time: string } | undefined {
  if (!dayTime?.length || !date) return undefined;
  const d = new Date(date + "T12:00:00");
  const dayNum = d.getDay();
  const dayMap: Record<number, string> = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };
  const dayStr = dayMap[dayNum];
  return dayTime.find((dt) => dt.day?.toLowerCase() === dayStr);
}

/** baseFare + tax; taxFee 0.1 = 10%. */
function priceWithTax(baseFare: number, taxFee?: number): number {
  return baseFare * (1 + (taxFee ?? 0));
}

function buildSeatGrid(seats: Seat[]) {
  const byRow = new Map<number, { left: Seat[]; right: Seat[] }>();
  for (const seat of seats) {
    const row = seat.meta?.row ?? 1;
    if (!byRow.has(row)) byRow.set(row, { left: [], right: [] });
    const bucket = byRow.get(row)!;
    if (seat.meta?.position === "left" || seat.meta?.section === "left") {
      bucket.left.push(seat);
    } else {
      bucket.right.push(seat);
    }
  }
  const maxRow = Math.max(...byRow.keys(), 0);
  const grid: { row: number; left: Seat[]; right: Seat[] }[] = [];
  for (let r = 1; r <= maxRow; r++) {
    const bucket = byRow.get(r) ?? { left: [], right: [] };
    bucket.left.sort((a, b) => (b.meta?.column ?? 0) - (a.meta?.column ?? 0));
    bucket.right.sort((a, b) => (b.meta?.column ?? 0) - (a.meta?.column ?? 0));
    grid.push({ row: r, left: bucket.left, right: bucket.right });
  }
  return grid;
}

// --- Component ---

export default function BookingJourney() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search State
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  
  // Round Trip State
  const [roundTripGroupId, setRoundTripGroupId] = useState<string | null>(null);
  const [departureRoute, setDepartureRoute] = useState<Route | null>(null);
  const [returnRoute, setReturnRoute] = useState<Route | null>(null);
  const [departureSeats, setDepartureSeats] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- setReturnSeats used in return leg; value kept for parity with departureSeats
  const [returnSeats, setReturnSeats] = useState<string[]>([]);

  // One-Way State (legacy)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  
  // Seat State
  const [seatStates, setSeatStates] = useState<Record<string, { status: string; isAvailable: boolean; userId?: string }>>({});
  const [localSelectedSeats, setLocalSelectedSeats] = useState<string[]>([]);
  
  // Passenger State
  const [passengers, setPassengers] = useState<PassengerFormData[]>([]);
  
  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "stripe" | "paypal">("cash");
  const [stripeIntent, setStripeIntent] = useState<{ clientSecret: string; paymentIntentId: string; amount: number } | null>(null);

  // Mutations
  const [bookCash, { isLoading: isBookingCash }] = useBookSeatsCashMutation();
  const [bookStripe, { isLoading: isBookingStripe }] = useBookSeatsStripeMutation();
  const [bookPayPal, { isLoading: isBookingPayPal }] = useBookSeatsPayPalMutation();
  const [createPayPalOrder, { isLoading: isCreatingPayPalOrder }] = useCreatePayPalOrderMutation();
  const [confirmStripe] = useConfirmStripePaymentMutation();
  const [holdDeparture] = useHoldDepartureMutation();
  const [holdReturn] = useHoldReturnMutation();
  const [completeRoundTrip] = useCompleteRoundTripMutation();

  // UI State
  const [activeStep, setActiveStep] = useState<number>(1);

  // Initialize Search
  useEffect(() => {
    const origin = searchParams.get("origin");
    const destination = searchParams.get("destination");
    const date = searchParams.get("date");
    const paramTripType = searchParams.get("tripType");
    const returnDate = searchParams.get("returnDate");

    console.log("[BookingJourney] Params:", { origin, destination, date, paramTripType });

    if (origin && destination && date) {
      const normalizedTripType = (!paramTripType || paramTripType === "one-way" || paramTripType === "one_way")
        ? "one-way"
        : "round-trip";

      setSearchFilters({
        origin,
        destination,
        date,
        tripType: normalizedTripType,
        returnDate: returnDate || undefined,
      });
    } else {
        console.warn("[BookingJourney] Missing params, skipping searchFilters init");
    }
  }, [searchParams]);

  const isRoundTrip = searchFilters?.tripType === "round-trip";

  // Queries - Departure routes
  const { data: departureSearchResults, isLoading: isDepartureSearchLoading } = useGetRoutesQuery(
    searchFilters ? {
        origin: searchFilters.origin,
        destination: searchFilters.destination,
        departureDate: searchFilters.date,
        tripType: "one_way",
        isActive: true,
      } : undefined,
    { skip: !searchFilters }
  );
  
  // Queries - Return routes (reversed origin/destination)
  const { data: returnSearchResults, isLoading: isReturnSearchLoading } = useGetRoutesQuery(
    searchFilters && isRoundTrip && searchFilters.returnDate ? {
        origin: searchFilters.destination, // Reversed
        destination: searchFilters.origin, // Reversed
        departureDate: searchFilters.returnDate,
        tripType: "one_way",
        isActive: true,
      } : undefined,
    { skip: !searchFilters || !isRoundTrip || !searchFilters.returnDate }
  );
  
  // Get route details for seat selection
  const currentRouteForSeats = isRoundTrip 
    ? (activeStep === 2 ? departureRoute : activeStep === 4 ? returnRoute : null)
    : selectedRoute;
    
  const currentDateForSeats = isRoundTrip
    ? (activeStep === 2 ? searchFilters?.date : activeStep === 4 ? searchFilters?.returnDate : "")
    : searchFilters?.date;

  const { data: routeData } = useGetRouteByIdQuery(
    currentRouteForSeats && currentDateForSeats ? {
        routeId: currentRouteForSeats._id,
        date: currentDateForSeats,
        origin: activeStep === 4 && isRoundTrip ? searchFilters?.destination : searchFilters?.origin,
        destination: activeStep === 4 && isRoundTrip ? searchFilters?.origin : searchFilters?.destination,
    } : { routeId: "", date: "" },
    { skip: !currentRouteForSeats || !currentDateForSeats }
  );

  // Socket Hook Setup
  useSocket();
  const routeId = currentRouteForSeats?._id;
  const busId = currentRouteForSeats?.bus?._id;

  const { isJoined: routeRoomJoined, userId: currentUserId } = useRouteRoom(routeId ?? null, currentDateForSeats ?? undefined);
  const {
    selectedSeats: socketSelectedSeats,
    heldSeats,
    toggleSeat,
    removeSeatFromSelection,
  } = useSeatManagement(routeId ?? "", busId ?? "");

  const effectiveIsJoined = routeRoomJoined;
  const currentSelectedSeats = effectiveIsJoined ? socketSelectedSeats : localSelectedSeats;

  // -- Seat Logic --
  
  const seatGrid = useMemo(
    () => buildSeatGrid((routeData?.route?.bus?.seatLayout?.seats ?? []) as Seat[]),
    [routeData?.route?.bus?.seatLayout?.seats]
  );
  
  // Initialize seat states
  useEffect(() => {
    if (routeData?.route?.bus?.seatLayout?.seats) {
      const initial: Record<string, { status: string; isAvailable: boolean }> = {};
      for (const seat of routeData.route.bus.seatLayout.seats) {
        initial[seat.seatLabel] = {
            status: seat.status,
            isAvailable: seat.isAvailable,
        };
      }
      setSeatStates(initial);
    }
  }, [routeData?.route?.bus?.seatLayout?.seats]);

  // Listen for seat updates
   useSeatStatusListener(
    useCallback(
      (data: { seatLabel: string; status: string; userId?: string }) => {
        if (!effectiveIsJoined) return;
        setSeatStates((prev) => ({
          ...prev,
          [data.seatLabel]: {
            status: data.status,
            isAvailable: data.status === "available",
            userId: data.userId,
          },
        }));
        if (heldSeats.includes(data.seatLabel)) {
           if (data.status === "booked" || (data.status === "held" && data.userId !== currentUserId)) {
               removeSeatFromSelection(data.seatLabel);
           }
        }
      },
      [effectiveIsJoined, heldSeats, currentUserId, removeSeatFromSelection]
    )
  );

  const handleSeatClick = useCallback(async (seat: Seat) => {
    const state = seatStates[seat.seatLabel] ?? seat;
    if (state.status === "booked") return;
    
    if (effectiveIsJoined) {
         try { await toggleSeat(seat.seatLabel, currentDateForSeats ?? undefined); } catch(e) { console.error(e); }
    } else {
         setLocalSelectedSeats(prev => prev.includes(seat.seatLabel) ? prev.filter(s => s !== seat.seatLabel) : [...prev, seat.seatLabel]);
    }
  }, [seatStates, effectiveIsJoined, toggleSeat, currentDateForSeats]);

  // Sync passengers with seats
  useEffect(() => {
    const seatCount = isRoundTrip ? departureSeats.length : currentSelectedSeats.length;
    setPassengers(prev => {
        if (seatCount === 0) return [];
        const next = prev.slice(0, seatCount);
        while(next.length < seatCount) next.push(createEmptyPassenger());
        return next;
    });
  }, [isRoundTrip, departureSeats.length, currentSelectedSeats.length]);


  // -- Payment Logic --
  
  const passengersApiData: Passenger[] = useMemo(() => {
    if (isRoundTrip) {
      // For round trip, use departure seats for passenger mapping
      return passengers.map((p, i) =>
        passengerFormToApi(p, departureSeats[i] ?? String(i + 1), searchFilters?.date ?? "")
      );
    }
    return passengers.map((p, i) =>
      passengerFormToApi(p, currentSelectedSeats[i] ?? String(i + 1), searchFilters?.date ?? "")
    );
  }, [passengers, isRoundTrip, departureSeats, currentSelectedSeats, searchFilters?.date]);

  const handlePay = async () => {
    if (!searchFilters) return;

    const primaryEmail = passengers[0]?.email;
    const primaryPhone = passengers[0]?.contactNumber;

    if (isRoundTrip) {
      // Round trip payment flow
      if (!roundTripGroupId) {
        alert("Round trip group ID missing");
        return;
      }

      try {
        const response = await completeRoundTrip({
          roundTripGroupId,
          paymentType: paymentMethod,
          additionalBaggage: "0",
          currency: "USD",
        }).unwrap();

        if (paymentMethod === "cash") {
          clearBookingDraft();
          const cashResponse = response as { departureBooking?: { passengers?: { ticketNumber?: string }[] } };
          const ticketNumber = cashResponse.departureBooking?.passengers?.[0]?.ticketNumber;
          router.push(ticketNumber ? `/buy-ticket/confirmation?ticketNumber=${encodeURIComponent(ticketNumber)}` : "/buy-ticket/confirmation");
        } else if (paymentMethod === "stripe") {
          const stripeResponse = response as { clientSecret?: string; paymentIntentId?: string; amount?: number };
          setStripeIntent({
            clientSecret: stripeResponse.clientSecret ?? "",
            paymentIntentId: stripeResponse.paymentIntentId ?? "",
            amount: stripeResponse.amount ?? 0,
          });
        } else if (paymentMethod === "paypal") {
          const paypalResponse = response as { approvalUrl?: string };
          if (paypalResponse.approvalUrl) {
            window.location.href = paypalResponse.approvalUrl;
          }
        }
      } catch (err: unknown) {
        alert((err as { data?: { message?: string } })?.data?.message ?? "Round trip payment failed");
      }
    } else {
      // One-way payment flow (existing logic)
      if (!selectedRoute) return;
      const tripTypeApi = "one_way";

      if (paymentMethod === "cash") {
          try {
              const res = await bookCash({
                  routeId: selectedRoute._id,
                  busId: selectedRoute.bus?._id ?? "",
                  paymentType: "cash",
                  tripType: tripTypeApi,
                  passengers: passengersApiData,
                  departureDate: searchFilters.date,
                  origin: searchFilters.origin,
                  destination: searchFilters.destination,
                  email: primaryEmail || undefined,
                  phone: primaryPhone || undefined,
              }).unwrap();
              clearBookingDraft();
              const ticketNumber = res.passengers[0]?.ticketNumber;
              router.push(ticketNumber ? `/buy-ticket/confirmation?ticketNumber=${encodeURIComponent(ticketNumber)}` : "/buy-ticket/confirmation");
          } catch (err: unknown) {
              alert((err as { data?: { message?: string } })?.data?.message ?? "Booking failed");
          }
      } else if (paymentMethod === "stripe") {
          try {
              const intent = await bookStripe({
                  routeId: selectedRoute._id,
                  busId: selectedRoute.bus?._id ?? "",
                  paymentType: "stripe",
                  tripType: tripTypeApi,
                  passengers: passengersApiData,
                  departureDate: searchFilters.date,
                  origin: searchFilters.origin,
                  destination: searchFilters.destination,
                  email: primaryEmail || undefined,
                  phone: primaryPhone || undefined,
              }).unwrap();
              setStripeIntent({
                  clientSecret: intent.clientSecret,
                  paymentIntentId: intent.paymentIntentId,
                  amount: intent.amount ?? 0,
              });
          } catch (err: unknown) {
              alert((err as { data?: { message?: string } })?.data?.message ?? "Stripe setup failed");
          }
      } else if (paymentMethod === "paypal") {
          try {
               const { passengersRedisKey, amount, baseFare } = await bookPayPal({
                  routeId: selectedRoute._id,
                  busId: selectedRoute.bus?._id ?? "",
                  paymentType: "paypal",
                  tripType: tripTypeApi,
                  passengers: passengersApiData,
                  departureDate: searchFilters.date,
                  origin: searchFilters.origin,
                  destination: searchFilters.destination,
                  email: primaryEmail || undefined,
                  phone: primaryPhone || undefined,
               }).unwrap();
               // create-order expects amount without tax; backend calculates tax
               const amountWithoutTax = baseFare ?? amount;
               const { approvalUrl, orderId } = await createPayPalOrder({
                    amount: amountWithoutTax,
                    passengersRedisKey,
                    data: {
                        routeId: selectedRoute._id,
                        busId: selectedRoute.bus?._id ?? "",
                        departureDate: searchFilters.date,
                        tripType: tripTypeApi,
                        bookedBy: "web",
                    }
               }).unwrap();
               savePayPalPending({ orderId, passengersRedisKey });
               window.location.href = approvalUrl;
          } catch (err: unknown) {
              alert((err as { data?: { message?: string } })?.data?.message ?? "PayPal failed");
          }
      }
    }
  };

  const handleStripeSuccess = () => {
       setStripeIntent(null);
  };
  
  const handleStripeSucceededNoRedirect = async () => {
      if (!stripeIntent) return;
       try {
            const res = await confirmStripe({
                paymentIntentId: stripeIntent.paymentIntentId,
                departureDate: searchFilters?.date ?? "",
                passengersData: passengersApiData,
            }).unwrap();
            setStripeIntent(null);
            clearBookingDraft();
            const ticketNumber = res.passengers[0]?.ticketNumber;
            router.push(ticketNumber ? `/buy-ticket/confirmation?ticketNumber=${encodeURIComponent(ticketNumber)}` : "/buy-ticket/confirmation");
       } catch (err: unknown) {
           alert((err as { data?: { message?: string } })?.data?.message ?? "Confirmation failed");
       }
  }


  // -- Render Helpers --

  const wizardSteps = isRoundTrip ? [
    { id: 1, title: t("wizard.departure") + " " + t("wizard.bus") },
    { id: 2, title: t("wizard.departure") + " " + t("wizard.selectSeats") },
    { id: 3, title: t("wizard.return") + " " + t("wizard.bus") },
    { id: 4, title: t("wizard.return") + " " + t("wizard.selectSeats") },
    { id: 5, title: t("wizard.passengerDetails") },
    { id: 6, title: t("bookingJourney.payment.stepTitle") },
  ] : [
    { id: 1, title: t("wizard.bus") },
    { id: 2, title: t("wizard.selectSeats") },
    { id: 3, title: t("wizard.passengerDetails") },
    { id: 4, title: t("bookingJourney.payment.stepTitle") },
  ];

  const renderRouteSelection = (isReturn = false) => {
    const isLoading = isReturn ? isReturnSearchLoading : isDepartureSearchLoading;
    const routes = isReturn ? (returnSearchResults?.routes ?? []) : (departureSearchResults?.routes ?? []);
    const dateForRoutes = isReturn ? searchFilters?.returnDate : searchFilters?.date;
    
    if (isLoading) return <div className="p-8 text-center text-gray-500">Searching routes...</div>;
    if (routes.length === 0) return <div className="p-8 text-center text-gray-500">No routes found.</div>;
    
    // Sort logic
    const sortedRoutes = [...routes].sort((a, b) => {
        const tA = getDayTimeForDate(a.dayTime, dateForRoutes ?? "")?.time ?? "";
        const tB = getDayTimeForDate(b.dayTime, dateForRoutes ?? "")?.time ?? "";
        return tA.localeCompare(tB);
    });

    return (
        <div className="mt-4 grid gap-4 p-2">
            {sortedRoutes.map(route => {
                 const departureTime = getDayTimeForDate(route.dayTime, dateForRoutes ?? "")?.time 
                    ? formatTime(getDayTimeForDate(route.dayTime, dateForRoutes ?? "")!.time, route.origin?.MinutesOfDifference) 
                    : "N/A";
                 const baseFare = route.baseFare ?? route.destination?.priceFromDFW ?? 0;
                 const price = priceWithTax(baseFare, route.taxFee ?? 0.1);
                 const selectedRouteId = isReturn ? returnRoute?._id : isRoundTrip ? departureRoute?._id : selectedRoute?._id;
                 
                 return (
                     <div 
                        key={route._id}
                        onClick={() => {
                          if (isReturn) {
                            setReturnRoute(route);
                            setActiveStep(4);
                          } else if (isRoundTrip) {
                            setDepartureRoute(route);
                            setActiveStep(2);
                          } else {
                            setSelectedRoute(route);
                            setActiveStep(2);
                          }
                        }}
                        className={`cursor-pointer rounded-lg border p-4 transition-all hover:border-primary hover:shadow-md ${selectedRouteId === route._id ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}
                     >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="text-xl font-bold text-gray-900">{departureTime}</div>
                                <div className="text-sm text-gray-500">{route.origin?.name} → {route.destination?.name}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-primary">${price.toFixed(2)}</div>
                                <div className="text-xs text-gray-500">{route.seatAvailability?.available} seats left</div>
                            </div>
                        </div>
                     </div>
                 );
            })}
        </div>
    );
  };

  const renderSeatSelection = (isReturn = false) => {
      if (!currentRouteForSeats) return null;
      
      const handleContinue = async () => {
        if (currentSelectedSeats.length === 0) return;
        
        if (isReturn) {
          // Validate same number of seats
          if (currentSelectedSeats.length !== departureSeats.length) {
            alert(`Please select ${departureSeats.length} seat(s) for return trip (same as departure)`);
            return;
          }
          
          // Hold return seats
          if (!roundTripGroupId || !returnRoute || !searchFilters) return;
          
          try {
            // Create passengers with return seat labels
            const returnPassengers = passengers.map((p, i) => ({
              ...passengerFormToApi(p, currentSelectedSeats[i] ?? String(i + 1), searchFilters.returnDate ?? ""),
            }));
            
            await holdReturn({
              roundTripGroupId,
              routeId: returnRoute._id,
              busId: returnRoute.bus?._id ?? "",
              departureDate: searchFilters.returnDate ?? "",
              returnDate: searchFilters.returnDate ?? "",
              tripType: "round_trip",
              passengers: returnPassengers,
              origin: searchFilters.destination, // Reversed
              destination: searchFilters.origin, // Reversed
              userId: currentUserId || undefined,
            }).unwrap();
            
            setReturnSeats([...currentSelectedSeats]);
            setLocalSelectedSeats([]); // Clear local selection after return leg
            setActiveStep(5);
          } catch (err: unknown) {
            alert((err as { data?: { message?: string } })?.data?.message ?? "Failed to hold return seats");
          }
        } else {
          // Hold departure when clicking continue on seat selection
          if (!departureRoute || !searchFilters || !searchFilters.returnDate) return;
          try {
            const response = await holdDeparture({
              routeId: departureRoute._id,
              busId: departureRoute.bus?._id ?? "",
              tripType: "round_trip",
              returnDate: searchFilters.returnDate,
              departureDate: searchFilters.date,
              passengers: currentSelectedSeats.map(seat => ({ seatLabel: seat })),
              origin: searchFilters.origin,
              destination: searchFilters.destination,
              userId: currentUserId || undefined,
            }).unwrap();
            
            setRoundTripGroupId(response.roundTripGroupId);
            setDepartureSeats([...currentSelectedSeats]);
            setLocalSelectedSeats([]); // Clear local selection after departure leg
            setActiveStep(3);
          } catch (err: unknown) {
            alert((err as { data?: { message?: string } })?.data?.message ?? "Failed to hold departure");
          }
        }
      };
      
      return (
          <div className="rounded-xl bg-gray-50 p-6">
              <div className="mx-auto space-y-3" style={{ width: "fit-content" }}>
                    {seatGrid.map(({ row, left, right }) => (
                      <div key={row} className="flex min-h-16 items-center gap-8">
                        <div className="flex gap-3 justify-end">
                          {left.map((seat) => {
                             const state = seatStates[seat.seatLabel] ?? seat;
                             const isSelected = currentSelectedSeats.includes(seat.seatLabel);
                             
                             return (
                                <button
                                    key={seat._id}
                                    type="button"
                                    onClick={() => handleSeatClick(seat)}
                                    className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                                        state.status === 'booked' ? 'bg-gray-300 border-gray-400 text-gray-500' :
                                        isSelected ? 'bg-primary border-primary text-white' :
                                        'bg-white border-green-500 text-green-700 hover:bg-green-50'
                                    }`}
                                    disabled={state.status === 'booked'}
                                >
                                    {seat.seatLabel}
                                </button>
                             );
                          })}
                        </div>
                        <div className="w-4" />
                        <div className="flex gap-3">
                           {right.map((seat) => (
                               <button
                                    key={seat._id}
                                    type="button"
                                    onClick={() => handleSeatClick(seat)}
                                    className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                                        seatStates[seat.seatLabel]?.status === 'booked' ? 'bg-gray-300 border-gray-400 text-gray-500' :
                                        currentSelectedSeats.includes(seat.seatLabel) ? 'bg-primary border-primary text-white' :
                                        'bg-white border-green-500 text-green-700 hover:bg-green-50'
                                    }`}
                                    disabled={seatStates[seat.seatLabel]?.status === 'booked'}
                                >
                                    {seat.seatLabel}
                                </button>
                           ))}
                        </div>
                      </div>
                    ))}
              </div>
              
              <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleContinue}
                    disabled={currentSelectedSeats.length === 0}
                    className="rounded-lg bg-primary px-6 py-2 text-white shadow-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                      Continue
                  </button>
              </div>
          </div>
      );
  };

  const renderPassengerDetails = () => {
       return (
           <div className="space-y-4">
               {passengers.map((p, idx) => (
                   <PassengerFormFields
                      key={idx}
                      passenger={p}
                      index={idx}
                      seatLabel={isRoundTrip ? departureSeats[idx] : currentSelectedSeats[idx] ?? String(idx + 1)}
                      onChange={(field, value) => {
                          setPassengers(prev => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], [field]: value };
                              return next;
                          });
                      }}
                   />
               ))}
               <div className="flex justify-end pt-4">
                   <button 
                        onClick={() => {
                            const allMissing: string[] = [];
                            passengers.forEach((p, i) => {
                                const seatLabel = isRoundTrip ? departureSeats[i] : currentSelectedSeats[i];
                                const { valid, missing } = validatePassenger(p, seatLabel);
                                if (!valid) allMissing.push(...missing);
                            });
                            if (allMissing.length > 0) {
                                alert("Please fill all fields");
                                return;
                            }
                            setActiveStep(isRoundTrip ? 6 : 4);
                        }}
                        className="rounded-lg bg-primary px-6 py-2 text-white shadow-lg hover:bg-primary-dark"
                    >
                        Proceed to Payment
                    </button>
               </div>
           </div>
       );
  };
  
  const renderPayment = () => {
      // Price per seat including tax (taxFee 0.1 = 10%; default 10% when API omits taxFee)
      const taxDefault = 0.1;
      const pricePerSeat = isRoundTrip
        ? priceWithTax(departureRoute?.baseFare ?? 0, departureRoute?.taxFee ?? taxDefault) + priceWithTax(returnRoute?.baseFare ?? 0, returnRoute?.taxFee ?? taxDefault)
        : (selectedRoute ? priceWithTax(selectedRoute.baseFare ?? selectedRoute.destination?.priceFromDFW ?? 0, selectedRoute.taxFee ?? taxDefault) : 0);
      const seatCount = isRoundTrip ? departureSeats.length : currentSelectedSeats.length;
      const totalAmount = pricePerSeat * seatCount;
      const tax = departureRoute?.taxFee ?? returnRoute?.taxFee ?? selectedRoute?.taxFee ?? 0;
      if (stripeIntent) {
          const stripePayAmount = stripeIntent.amount ?? totalAmount;
          return (
              <div className="mt-4 rounded-xl bg-gray-50 p-6">
                <StripePaymentForm 
                    tax={tax}
                    clientSecret={stripeIntent.clientSecret} 
                    paymentIntentId={stripeIntent.paymentIntentId}
                    amount={stripePayAmount}
                    passengers={passengersApiData}
                    passengersFormData={passengers}
                    selectedSeats={isRoundTrip ? departureSeats : currentSelectedSeats}
                    date={searchFilters?.date ?? ""}
                    onSuccess={handleStripeSuccess}
                    onPaymentSucceededNoRedirect={handleStripeSucceededNoRedirect}
                    onError={(msg) => alert(msg)}
                    onCancel={() => setStripeIntent(null)}
                />
              </div>
          );
      }

      return (
          <div className="mt-4 rounded-xl bg-gray-50 p-6">
              <div className="mb-6 flex items-center justify-between border-b pb-4">
                  <h3 className="text-lg font-bold">{t("bookingJourney.payment.totalAmount")}</h3>
                  <p className="text-2xl font-bold text-primary">${totalAmount.toFixed(2)}</p>
              </div>
          
              <h3 className="mb-4 text-lg font-bold">{t("bookingJourney.payment.selectMethod")}</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                  {/* <label className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="hidden" />
                      <span className="font-bold">{t("bookingJourney.payment.methods.cash")}</span>
                  </label> */}
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${paymentMethod === 'stripe' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="payment" value="stripe" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} className="hidden" />
                      <span className="font-bold">{t("bookingJourney.payment.methods.stripe")}</span>
                  </label>
                  <label className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${paymentMethod === 'paypal' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="payment" value="paypal" checked={paymentMethod === 'paypal'} onChange={() => setPaymentMethod('paypal')} className="hidden" />
                      <span className="font-bold">{t("bookingJourney.payment.methods.paypal")}</span>
                  </label>
              </div>
              
              <div className="mt-6 flex justify-end">
                   <button 
                        onClick={handlePay}
                        disabled={isBookingCash || isBookingStripe || isBookingPayPal || isCreatingPayPalOrder}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-8 py-3 text-white shadow-lg hover:bg-green-700 disabled:opacity-50"
                   >
                        {isBookingCash || isBookingStripe || isBookingPayPal ? t("bookingJourney.payment.processing") : t("bookingJourney.payment.payAndBook")}
                        {!(isBookingCash || isBookingStripe || isBookingPayPal) && <ArrowRight className="h-4 w-4" />}
                   </button>
              </div>
          </div>
      )
  }

  if (!searchFilters) return <div>Loading...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Wizard Stepper */}
      <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg">
        <WizardStepper 
          steps={wizardSteps} 
          currentStep={activeStep} 
          onStepClick={(stepId) => {
            if (stepId < activeStep) {
              setActiveStep(stepId);
            }
          }}
        />
      </div>

      {/* Step Content */}
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        {/* ROUND TRIP FLOW */}
        {isRoundTrip && (
          <>
            {/* Step 1: Departure Route Selection */}
            {activeStep === 1 && (
              <div className="animate-fade-in">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  {t("wizard.selectDepartureRoute")}
                </h2>
                {renderRouteSelection(false)}
              </div>
            )}

            {/* Step 2: Departure Seat Selection */}
            {activeStep === 2 && (
              <div className="animate-fade-in">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t("wizard.selectDepartureSeats")}
                  </h2>
                  {departureRoute && (
                    <p className="text-sm text-gray-600">
                      {departureRoute.origin?.name} → {departureRoute.destination?.name}
                    </p>
                  )}
                </div>
                {renderSeatSelection(false)}
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setActiveStep(1)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Return Route Selection */}
            {activeStep === 3 && (
              <div className="animate-fade-in">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  {t("wizard.selectReturnRoute")}
                </h2>
                {renderRouteSelection(true)}
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setActiveStep(2)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Return Seat Selection */}
            {activeStep === 4 && (
              <div className="animate-fade-in">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t("wizard.selectReturnSeats")} ({departureSeats.length} {departureSeats.length !== 1 ? t("wizard.seats") : t("wizard.seat")})
                  </h2>
                  {returnRoute && (
                    <p className="text-sm text-gray-600">
                      {returnRoute.origin?.name} → {returnRoute.destination?.name}
                    </p>
                  )}
                </div>
                {renderSeatSelection(true)}
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setActiveStep(3)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Passenger Details */}
            {activeStep === 5 && (
              <div className="animate-fade-in">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  {t("wizard.passengerDetails")}
                </h2>
                {renderPassengerDetails()}
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setActiveStep(4)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 6: Payment */}
            {activeStep === 6 && (
              <div className="animate-fade-in">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  {t("bookingJourney.payment.stepTitle")}
                </h2>
                {renderPayment()}
                {!stripeIntent && (
                  <div className="mt-6 flex justify-between">
                    <button
                      onClick={() => setActiveStep(5)}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ONE-WAY FLOW (existing) */}
        {!isRoundTrip && (
          <>
            {/* Step 1: Route Selection */}
            {activeStep === 1 && (
              <div className="animate-fade-in">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  {t("wizard.step1SelectBus")}
                </h2>
                {renderRouteSelection(false)}
              </div>
            )}

            {/* Step 2: Seat Selection */}
            {activeStep === 2 && (
              <div className="animate-fade-in">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t("wizard.step2SelectSeats")}
                  </h2>
                  {selectedRoute && (
                    <p className="text-sm text-gray-600">
                      {selectedRoute.origin?.name} → {selectedRoute.destination?.name}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-gray-50 p-6">
                  <div className="mx-auto space-y-3" style={{ width: "fit-content" }}>
                        {seatGrid.map(({ row, left, right }) => (
                          <div key={row} className="flex min-h-16 items-center gap-8">
                            <div className="flex gap-3 justify-end">
                              {left.map((seat) => {
                                 const state = seatStates[seat.seatLabel] ?? seat;
                                 const isSelected = currentSelectedSeats.includes(seat.seatLabel);
                                 
                                 return (
                                    <button
                                        key={seat._id}
                                        type="button"
                                        onClick={() => handleSeatClick(seat)}
                                        className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                                            state.status === 'booked' ? 'bg-gray-300 border-gray-400 text-gray-500' :
                                            isSelected ? 'bg-primary border-primary text-white' :
                                            'bg-white border-green-500 text-green-700 hover:bg-green-50'
                                        }`}
                                        disabled={state.status === 'booked'}
                                    >
                                        {seat.seatLabel}
                                    </button>
                                 );
                              })}
                            </div>
                            <div className="w-4" />
                            <div className="flex gap-3">
                               {right.map((seat) => (
                                   <button
                                        key={seat._id}
                                        type="button"
                                        onClick={() => handleSeatClick(seat)}
                                        className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                                            seatStates[seat.seatLabel]?.status === 'booked' ? 'bg-gray-300 border-gray-400 text-gray-500' :
                                            currentSelectedSeats.includes(seat.seatLabel) ? 'bg-primary border-primary text-white' :
                                            'bg-white border-green-500 text-green-700 hover:bg-green-50'
                                        }`}
                                        disabled={seatStates[seat.seatLabel]?.status === 'booked'}
                                    >
                                        {seat.seatLabel}
                                    </button>
                               ))}
                            </div>
                          </div>
                        ))}
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                      <button 
                        onClick={() => { if(currentSelectedSeats.length > 0) setActiveStep(3); }}
                        disabled={currentSelectedSeats.length === 0}
                        className="rounded-lg bg-primary px-6 py-2 text-white shadow-lg hover:bg-primary-dark disabled:opacity-50"
                      >
                          Continue
                      </button>
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setActiveStep(1)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Passenger Details */}
            {activeStep === 3 && (
              <div className="animate-fade-in">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  {t("wizard.passengerDetails")}
                </h2>
                {renderPassengerDetails()}
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setActiveStep(2)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Payment */}
            {activeStep === 4 && (
              <div className="animate-fade-in">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  {t("bookingJourney.payment.stepTitle")}
                </h2>
                {renderPayment()}
                {!stripeIntent && (
                  <div className="mt-6 flex justify-between">
                    <button
                      onClick={() => setActiveStep(3)}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
