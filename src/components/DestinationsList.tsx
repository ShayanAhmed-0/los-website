"use client";

import { useGetDestinationsQuery } from "@/store/api/destinationsApi";

export default function DestinationsList() {
  const { data, isLoading, isError } = useGetDestinationsQuery();

  if (isLoading) {
    return (
      <p className="py-4 text-center text-sm text-gray-500">
        Loading destinations…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="py-4 text-center text-sm text-red-600">
        Failed to load destinations.
      </p>
    );
  }

  const dests = data?.destinations?.destinations ?? [];

  if (dests.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-500">
        No destinations available.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200">
      {dests.map((d) => (
        <li key={d._id} className="py-2 text-sm text-gray-900">
          {d.name}
        </li>
      ))}
    </ul>
  );
}
