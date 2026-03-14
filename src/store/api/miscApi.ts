import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000";

// ============ User by email (for booking form prefill) ============

export interface UserByEmailAddress {
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  nationality?: string;
}

export interface UserByEmailDocuments {
  documentCode?: string;
  documentNumber?: string;
  documentIssuingCountry?: string;
  documentExpiryDate?: string;
  driverLicenseExpiryDate?: string;
}

export interface UserByEmailProfile {
  firstName?: string;
  secondName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  phoneNumber?: string;
  pictureUrl?: string;
  address?: UserByEmailAddress;
  documents?: UserByEmailDocuments;
}

export interface UserByEmailUser {
  _id: string;
  email?: string;
  role?: string;
  isVerified?: boolean;
  isProfileCompleted?: boolean;
  isActive?: boolean;
  profile?: UserByEmailProfile;
  linkedToAuthId?: { email?: string };
}

export interface UserByEmailResponse {
  status: number;
  success: boolean;
  message: string;
  data: {
    user: UserByEmailUser;
  };
}

// ============ About Us (for Contact page) ============

export interface AboutUsOffice {
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

export interface AboutUsResponse {
  status: number;
  data: { aboutUs: AboutUsOffice[] };
  success: boolean;
  message: string;
}

export const miscApi = createApi({
  reducerPath: "miscApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${baseUrl}/api/v1`,
  }),
  endpoints: (builder) => ({
    getUserByEmail: builder.query<UserByEmailResponse["data"], string>({
      query: (email) => ({
        url: "/misc/user-by-email",
        params: { email: email.trim().toLowerCase() },
      }),
      transformResponse: (response: UserByEmailResponse) => response.data,
    }),
    getAboutUs: builder.query<AboutUsOffice[], void>({
      query: () => ({ url: "/public/about-us" }),
      transformResponse: (response: AboutUsResponse) =>
        response.data?.aboutUs ?? [],
    }),
  }),
});

export const { useLazyGetUserByEmailQuery, useGetAboutUsQuery } = miscApi;
