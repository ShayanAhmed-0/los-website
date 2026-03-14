"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  socketService,
  type SeatStatusChangedData,
} from "@/lib/socket-service";

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connect = async () => {
      try {
        console.log("[SEAT-SOCKET] useSocket: connecting...");
        const socket = await socketService.connect();
        console.log("[SEAT-SOCKET] useSocket: connected?", !!socket);
        setIsConnected(!!socket);
        setError(null);
      } catch (err) {
        console.error("[SEAT-SOCKET] useSocket: connect failed", err);
        setError(err instanceof Error ? err.message : "Failed to connect");
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      socketService.disconnect();
      setIsConnected(false);
    };
  }, []);

  return { isConnected, error, socketService };
}

export function useRouteRoom(routeId: string | null, date?: string) {
  const [isJoined, setIsJoined] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previousRouteRef = useRef<{ routeId: string | null; date?: string } | null>(null);

  useEffect(() => {
    if (!routeId) return;

    const isRouteChange =
      previousRouteRef.current !== null &&
      (previousRouteRef.current.routeId !== routeId ||
        previousRouteRef.current.date !== date);

    const joinRoom = async () => {
      try {
        console.log("[SEAT-SOCKET] useRouteRoom: joining", routeId, date);
        if (isRouteChange && previousRouteRef.current?.routeId) {
          await socketService
            .leaveRoute(previousRouteRef.current.routeId, previousRouteRef.current.date)
            .catch(() => { });
        }

        const response = await socketService.joinRoute(routeId, date);
        const responseData = response.data as { userId?: string } | undefined;
        if (responseData?.userId) {
          setUserId(responseData.userId);
        }
        console.log("[SEAT-SOCKET] useRouteRoom: joined successfully");
        setIsJoined(true);
        setError(null);
        previousRouteRef.current = { routeId, date };
      } catch (err) {
        console.error("[SEAT-SOCKET] useRouteRoom: join failed", err);
        setError(err instanceof Error ? err.message : "Failed to join route");
        setIsJoined(false);
        setUserId(null);
      }
    };

    joinRoom();

    return () => {
      if (previousRouteRef.current?.routeId) {
        socketService
          .leaveRoute(previousRouteRef.current.routeId, previousRouteRef.current.date)
          .catch(() => { });
        previousRouteRef.current = null;
      }
      setUserId(null);
    };
  }, [routeId, date]);

  return { isJoined, userId, error };
}

export function useSeatStatusListener(
  callback: (data: SeatStatusChangedData) => void
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const stableCallback = (data: SeatStatusChangedData) => {
      console.log("[SEAT-SOCKET] seat:status:changed in hook", data);
      callbackRef.current(data);
    };

    void (async () => {
      try {
        await socketService.onSeatStatusChanged(stableCallback);
        console.log("[SEAT-SOCKET] useSeatStatusListener: listener attached");
      } catch (err) {
        console.error("[SEAT-SOCKET] useSeatStatusListener: failed to attach", err);
      }
    })();

    return () => {
      socketService.offSeatStatusChanged(stableCallback);
    };
  }, []);
}

export function useSeatManagement(routeId: string, busId: string) {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [heldSeats, setHeldSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset selection when routeId changes
  useEffect(() => {
    setSelectedSeats([]);
    setHeldSeats([]);
  }, [routeId]);

  const holdSeat = async (seatLabel: string, departureDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      await socketService.holdSeat(routeId, busId, seatLabel, departureDate);
      setHeldSeats((prev) => [...prev, seatLabel]);
      setSelectedSeats((prev) => [...prev, seatLabel]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to hold seat");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const releaseSeat = async (seatLabel: string, departureDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      await socketService.releaseSeat(routeId, busId, seatLabel, departureDate);
      setHeldSeats((prev) => prev.filter((s) => s !== seatLabel));
      setSelectedSeats((prev) => prev.filter((s) => s !== seatLabel));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release seat");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = async (seatLabel: string, departureDate?: string) => {
    if (selectedSeats.includes(seatLabel)) {
      await releaseSeat(seatLabel, departureDate);
    } else {
      await holdSeat(seatLabel, departureDate);
    }
  };

  const removeSeatFromSelection = useCallback((seatLabel: string) => {
    setHeldSeats((prev) => prev.filter((s) => s !== seatLabel));
    setSelectedSeats((prev) => prev.filter((s) => s !== seatLabel));
  }, []);

  const releaseAllSeats = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all(
        heldSeats.map((seatLabel) =>
          socketService.releaseSeat(routeId, busId, seatLabel)
        )
      );
      setHeldSeats([]);
      setSelectedSeats([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release seats");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedSeats,
    heldSeats,
    loading,
    error,
    holdSeat,
    releaseSeat,
    toggleSeat,
    releaseAllSeats,
    removeSeatFromSelection,
    clearSelection: () => {
      setSelectedSeats([]);
      setHeldSeats([]);
    }
  };
}
