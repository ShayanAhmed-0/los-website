import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000";

export interface DayTime {
  day: string;
  time: string;
}

export interface RouteDestination {
  _id: string;
  name: string;
  description?: string;
  MinutesOfDifference?: number;
  priceToDFW?: number;
  priceFromDFW?: number;
  priceRoundTrip?: number;
  taxAmount?: number;
}

export interface RouteBus {
  _id: string;
  code: string;
  capacity: number;
}

export interface Route {
  _id: string;
  name: string;
  origin: RouteDestination;
  destination: RouteDestination;
  bus: RouteBus;
  dayTime: DayTime[];
  baseFare?: number;
  seatAvailability: { available: number; total?: number };
  taxFee?: number;
}

export interface RoutesResponse {
  success: boolean;
  message: string;
  data: {
    routes: Route[];
    pagination: {
      page: number;
      limit: number;
      totalDocs: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface GetRoutesParams {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  tripType?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface RouteByIdSeat {
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
  departureDateBookings?: Array<{
    departureDate: string;
    status: string;
    userId?: string | null;
    expiresAt?: string | null;
  }>;
}

export interface RouteByIdResponse {
  route: Route & {
    bus: RouteBus & {
      seatLayout?: {
        type?: string;
        seats: RouteByIdSeat[];
      };
    };
  };
}

export interface GetRouteByIdParams {
  routeId: string;
  date?: string;
  origin?: string;
  destination?: string;
}

export const routesApi = createApi({
  reducerPath: "routesApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${baseUrl}/api/v1/public`,
  }),
  endpoints: (builder) => ({
    getRoutes: builder.query<RoutesResponse["data"], GetRoutesParams | void>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params?.origin) searchParams.set("origin", params.origin);
        if (params?.destination) searchParams.set("destination", params.destination);
        if (params?.departureDate) searchParams.set("departureDate", params.departureDate);
        if (params?.returnDate) searchParams.set("returnDate", params.returnDate);
        if (params?.tripType) searchParams.set("tripType", params.tripType);
        if (params?.page) searchParams.set("page", String(params.page));
        if (params?.limit) searchParams.set("limit", String(params.limit));
        if (params?.isActive) searchParams.set("isActive", String(params.isActive));
        return `/routes?${searchParams.toString()}`;
      },
      transformResponse: (response: RoutesResponse) => response.data,
    }),
    getRouteById: builder.query<RouteByIdResponse, GetRouteByIdParams>({
      query: ({ routeId, date, origin, destination }) => {
        const params = new URLSearchParams();
        if (date) params.set("date", date);
        if (origin) params.set("origin", origin);
        if (destination) params.set("destination", destination);
        return `/routes/id/${routeId}?${params.toString()}`;
      },
      transformResponse: (response: { data: unknown }) =>
        response.data as RouteByIdResponse,
    }),
  }),
});

export const {
  useGetRoutesQuery,
  useLazyGetRoutesQuery,
  useGetRouteByIdQuery,
} = routesApi;
