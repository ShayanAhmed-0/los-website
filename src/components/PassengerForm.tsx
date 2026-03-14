"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Passenger } from "@/store/api/bookingApi";
import {
  DOCUMENT_CODES,
  COUNTRIES,
  MIXED_STATES,
  TRAVELER_STATUSES,
  GENDERS,
} from "@/lib/booking-constants";
import { useLazyGetUserByEmailQuery } from "@/store/api/miscApi";
import type { UserByEmailProfile } from "@/store/api/miscApi";

export type PassengerFormData = Omit<
  Passenger,
  "fullName" | "DocumentId"
> & {
  firstName: string;
  middleName: string;
  email?: string;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const DEBOUNCE_MS = 400;

function toFullName(p: PassengerFormData): string {
  const parts = [p.firstName, p.middleName, p.surname].filter(Boolean);
  return parts.join(" ");
}

export function passengerFormToApi(
  p: PassengerFormData,
  seatLabel: string,
  departureDate?: string
): Passenger {
  return {
    ...p,
    seatLabel,
    fullName: toFullName(p),
    DocumentId: p.documentNumber,
    departureDate,
  };
}

const emptyPassenger = (): PassengerFormData => ({
  seatLabel: "",
  firstName: "",
  surname: "",
  middleName: "",
  email: "",
  gender: "male",
  dob: "",
  contactNumber: "",
  documentCode: DOCUMENT_CODES[0].value,
  documentNumber: "",
  documentIssuingCountry: COUNTRIES[0].value,
  documentExpiryDate: "",
  travelerNationality: COUNTRIES[0].value,
  countryOfResidence: COUNTRIES[0].value,
  travelerStatus: TRAVELER_STATUSES[0].value,
  streetAddress: "",
  city: "",
  state: MIXED_STATES[0].value,
  postalCode: "",
});

function formatDobForInput(dob: string | undefined): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function isExpired(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d < new Date();
}

function mapProfileToForm(
  profile: UserByEmailProfile | undefined,
  onChange: (field: keyof PassengerFormData, value: string) => void
): void {
  if (!profile) return;
  if (profile.firstName) onChange("firstName", profile.firstName);
  if (profile.secondName != null) onChange("middleName", profile.secondName);
  if (profile.lastName) onChange("surname", profile.lastName);
  if (profile.dob) onChange("dob", formatDobForInput(profile.dob));
  if (
    profile.gender &&
    ["male", "female", "other", "prefer_not_say"].includes(profile.gender)
  ) {
    onChange("gender", profile.gender);
  }
  if (profile.phoneNumber) onChange("contactNumber", profile.phoneNumber);
  const addr = profile.address;
  if (addr) {
    if (addr.streetAddress) onChange("streetAddress", addr.streetAddress);
    if (addr.city) onChange("city", addr.city);
    if (addr.state) onChange("state", addr.state);
    if (addr.postalCode) onChange("postalCode", addr.postalCode);
    if (addr.nationality) onChange("travelerNationality", addr.nationality);
    if (addr.country) onChange("countryOfResidence", addr.country);
  }
  const docs = profile.documents;
  if (docs) {
    if (docs.documentCode) onChange("documentCode", docs.documentCode);
    if (docs.documentNumber) onChange("documentNumber", docs.documentNumber);
    if (docs.documentIssuingCountry)
      onChange("documentIssuingCountry", docs.documentIssuingCountry);
    const expiry =
      docs.documentExpiryDate ?? docs.driverLicenseExpiryDate;
    if (expiry) {
      if (isExpired(expiry)) {
        onChange("documentExpiryDate", "");
        alert(
          "The document on file has expired. Please enter a valid document expiry date."
        );
      } else {
        onChange("documentExpiryDate", formatDobForInput(expiry));
      }
    }
  }
}

export function createEmptyPassenger(): PassengerFormData {
  return emptyPassenger();
}

const REQUIRED_FIELDS: (keyof PassengerFormData)[] = [
  "firstName",
  "surname",
  "dob",
  "gender",
  "contactNumber",
  "documentCode",
  "documentNumber",
  "documentIssuingCountry",
  "documentExpiryDate",
  "travelerNationality",
  "countryOfResidence",
  "travelerStatus",
  "streetAddress",
  "city",
  "state",
  "postalCode",
];

export function validatePassenger(
  p: PassengerFormData,
  seatLabel: string
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const v = p[field];
    if (v == null || String(v).trim() === "") {
      const label =
        field === "firstName"
          ? "First name"
          : field === "surname"
            ? "Surname"
            : field === "dob"
              ? "Date of birth"
              : field === "gender"
                ? "Gender"
                : field === "contactNumber"
                  ? "Phone"
                  : field === "documentCode"
                    ? "Document type"
                    : field === "documentNumber"
                      ? "Document number"
                      : field === "documentIssuingCountry"
                        ? "Document issuing country"
                        : field === "documentExpiryDate"
                          ? "Document expiry"
                          : field === "travelerNationality"
                            ? "Nationality"
                            : field === "countryOfResidence"
                              ? "Country of residence"
                              : field === "travelerStatus"
                                ? "Traveler status"
                                : field === "streetAddress"
                                  ? "Street address"
                                  : field === "city"
                                    ? "City"
                                    : field === "state"
                                      ? "State"
                                      : field === "postalCode"
                                        ? "Postal code"
                                        : field;
      missing.push(`${label} (Seat ${seatLabel})`);
    }
  }
  return { valid: missing.length === 0, missing };
}

interface PassengerFormFieldsProps {
  passenger: PassengerFormData;
  index: number;
  seatLabel: string;
  onChange: (field: keyof PassengerFormData, value: string) => void;
}

export function PassengerFormFields({
  passenger,
  index,
  seatLabel,
  onChange,
}: PassengerFormFieldsProps) {
  const today = new Date().toISOString().split("T")[0];
  const [getUserByEmail, { data }] = useLazyGetUserByEmailQuery();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestedEmailRef = useRef<string>("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleEmailChange = useCallback(
    (value: string) => {
      onChangeRef.current("email", value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = value.trim().toLowerCase();
      if (!trimmed) return;
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        lastRequestedEmailRef.current = trimmed;
        getUserByEmail(trimmed);
      }, DEBOUNCE_MS);
    },
    [getUserByEmail]
  );

  useEffect(() => {
    const requestedEmail = lastRequestedEmailRef.current;
    const currentEmail = (passenger.email ?? "").trim().toLowerCase();
    const matches =
      requestedEmail &&
      currentEmail &&
      requestedEmail === currentEmail;
    if (data?.user?.profile && matches) {
      mapProfileToForm(data.user.profile, onChangeRef.current);
    }
  }, [data, passenger.email]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4" aria-rowindex={index + 1}>
      <h4 className="font-medium text-gray-900">
        Passenger on Seat {seatLabel}
      </h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Email
          </label>
          <input
            type="email"
            className={INPUT_CLASS}
            value={passenger.email ?? ""}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="Enter email to prefill profile"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            First Name *
          </label>
          <input
            type="text"
            className={INPUT_CLASS}
            value={passenger.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Last Name / Surname *
          </label>
          <input
            type="text"
            className={INPUT_CLASS}
            value={passenger.surname}
            onChange={(e) => onChange("surname", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Middle Name
          </label>
          <input
            type="text"
            className={INPUT_CLASS}
            value={passenger.middleName}
            onChange={(e) => onChange("middleName", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Date of Birth (YYYY-MM-DD) *
          </label>
          <input
            type="date"
            className={INPUT_CLASS}
            value={passenger.dob}
            onChange={(e) => onChange("dob", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Gender *
          </label>
          <select
            className={INPUT_CLASS}
            value={passenger.gender}
            onChange={(e) =>
              onChange("gender", e.target.value as Passenger["gender"])
            }
            required
          >
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Phone
          </label>
          <input
            type="tel"
            className={INPUT_CLASS}
            value={passenger.contactNumber}
            onChange={(e) => onChange("contactNumber", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Document Type *
          </label>
          <select
            className={INPUT_CLASS}
            value={passenger.documentCode}
            onChange={(e) => onChange("documentCode", e.target.value)}
            required
          >
            {DOCUMENT_CODES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Document Number *
          </label>
          <input
            type="text"
            className={INPUT_CLASS}
            value={passenger.documentNumber}
            onChange={(e) => onChange("documentNumber", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Document Issuing Country *
          </label>
          <select
            className={INPUT_CLASS}
            value={passenger.documentIssuingCountry}
            onChange={(e) => onChange("documentIssuingCountry", e.target.value)}
            required
          >
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Document Expiry (YYYY-MM-DD) *
          </label>
          <input
            type="date"
            className={INPUT_CLASS}
            value={passenger.documentExpiryDate}
            min={today}
            onChange={(e) => onChange("documentExpiryDate", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Nationality *
          </label>
          <select
            className={INPUT_CLASS}
            value={passenger.travelerNationality}
            onChange={(e) => onChange("travelerNationality", e.target.value)}
            required
          >
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Country of Residence *
          </label>
          <select
            className={INPUT_CLASS}
            value={passenger.countryOfResidence}
            onChange={(e) => onChange("countryOfResidence", e.target.value)}
            required
          >
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Traveler Status *
          </label>
          <select
            className={INPUT_CLASS}
            value={passenger.travelerStatus}
            onChange={(e) => onChange("travelerStatus", e.target.value)}
            required
          >
            {TRAVELER_STATUSES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Street Address *
          </label>
          <input
            type="text"
            className={INPUT_CLASS}
            value={passenger.streetAddress}
            onChange={(e) => onChange("streetAddress", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            City *
          </label>
          <input
            type="text"
            className={INPUT_CLASS}
            value={passenger.city}
            onChange={(e) => onChange("city", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            State *
          </label>
          <select
            className={INPUT_CLASS}
            value={passenger.state}
            onChange={(e) => onChange("state", e.target.value)}
            required
          >
            {MIXED_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Postal Code *
          </label>
          <input
            type="text"
            className={INPUT_CLASS}
            value={passenger.postalCode}
            onChange={(e) => onChange("postalCode", e.target.value)}
            required
          />
        </div>
      </div>
    </div>
  );
}
