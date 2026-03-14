import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000";

export interface SalesOffice {
  _id: string;
  name: string;
  description: string;
}

export interface TerminalOfReference {
  _id: string;
  name: string;
  description: string;
}

export interface Destination {
  _id: string;
  name: string;
  description: string;
  priceToDFW: number;
  priceFromDFW: number;
  priceRoundTrip: number;
  salesOffice: SalesOffice[];
  MinutesOfDifference: number;
  TerminalOfReference: TerminalOfReference;
  isTerminal: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  location?: {
    type: string;
    coordinates: number[];
  };
}

export interface DestinationsResponse {
  status: number;
  data: {
    destinations: {
      totalDocs: number;
      destinations: Destination[];
      currentPage: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
  success: boolean;
  message: string;
}

export const destinationsApi = createApi({
  reducerPath: "destinationsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${baseUrl}/api/v1/public`,
  }),
  endpoints: (builder) => ({
    getDestinations: builder.query<DestinationsResponse["data"], void>({
      query: () => "/destinations",
      transformResponse: (response: DestinationsResponse) => response.data,
    }),
  }),
});

export const { useGetDestinationsQuery } = destinationsApi;
