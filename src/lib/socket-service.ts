import { getSocket, disconnectSocket } from "./socket";
import type { Socket } from "socket.io-client";

export interface SocketResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  data?: T;
  timestamp?: string;
}

export interface SeatStatusChangedData {
  routeId: string;
  seatLabel: string;
  status: "available" | "held" | "selected" | "booked";
  userId: string;
  busId: string;
  departureDate?: string;
  expiresAt?: number;
}

export interface SeatsData {
  routeId: string;
  seats: Record<string, "available" | "held" | "selected" | "booked">;
}

/** Normalize date to YYYY-MM-DD to match backend room format (route:routeId:date) */
function normalizeDateForRoom(dateStr: string | undefined): string | undefined {
  if (!dateStr?.trim()) return undefined;
  const d = new Date(dateStr.trim() + "T12:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split("T")[0];
}

class SocketService {
  private socket: Socket | null = null;

  async connect(): Promise<Socket | null> {
    if (!this.socket || !this.socket.connected) {
      this.socket = await getSocket();
    }
    return this.socket;
  }

  disconnect(): void {
    disconnectSocket();
    this.socket = null;
  }

  async getSocketInstance(): Promise<Socket | null> {
    if (!this.socket || !this.socket.connected) {
      try {
        this.socket = await getSocket();
      } catch {
        return null;
      }
    }
    return this.socket;
  }

  async joinRoute(routeId: string, date?: string): Promise<SocketResponse> {
    const socket = await this.connect();

    if (!socket || !socket.connected) {
      console.warn("[SEAT-SOCKET] joinRoute: socket not available");
      return { success: false, error: "Socket not available" };
    }

    const normalizedDate = normalizeDateForRoom(date);
    console.log("[SEAT-SOCKET] joinRoute: emitting", { routeId, date: normalizedDate ?? date });

    return new Promise((resolve, reject) => {
      let isResolved = false;
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          if (socket.connected) {
            resolve({
              success: true,
              message: "Joined route (timeout but socket connected)",
            });
          } else {
            reject(new Error("Join route timeout - socket disconnected"));
          }
        }
      }, 10000);

      socket.emit(
        "join:route",
        { routeId, date: normalizedDate ?? date },
        (response: SocketResponse) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            console.log("[SEAT-SOCKET] joinRoute: ack received", response.success, response);
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || "Failed to join route"));
            }
          }
        }
      );
    });
  }

  async leaveRoute(routeId: string, date?: string): Promise<SocketResponse> {
    const socket = await this.connect();

    if (!socket) {
      return { success: true, message: "No socket to leave" };
    }

    const normalizedDate = normalizeDateForRoom(date);

    return new Promise((resolve, reject) => {
      let isResolved = false;
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve({
            success: true,
            message: "Left route (timeout)",
          });
        }
      }, 10000);

      socket.emit(
        "leave:route",
        { routeId, date: normalizedDate ?? date },
        (response: SocketResponse) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || "Failed to leave route"));
            }
          }
        }
      );
    });
  }

  async holdSeat(
    routeId: string,
    busId: string,
    seatLabel: string,
    departureDate?: string
  ): Promise<SocketResponse> {
    const socket = await this.connect();

    if (!socket || !socket.connected) {
      throw new Error("Socket not available");
    }

    const normalizedDate = normalizeDateForRoom(departureDate);

    return new Promise((resolve, reject) => {
      let isResolved = false;
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(
            new Error(`Hold seat timeout for ${seatLabel}`)
          );
        }
      }, 10000);

      const payload = { routeId, busId, seatLabel, departureDate: normalizedDate ?? departureDate };
      console.log("[SEAT-SOCKET] holdSeat: emitting", payload);
      socket.emit(
        "seat:hold",
        payload,
        (response: SocketResponse) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            console.log("[SEAT-SOCKET] holdSeat: ack received", response.success);
            if (response.success) {
              resolve(response);
            } else {
              reject(
                new Error(response.error || `Failed to hold seat ${seatLabel}`)
              );
            }
          }
        }
      );
    });
  }

  async releaseSeat(
    routeId: string,
    busId: string,
    seatLabel: string,
    departureDate?: string
  ): Promise<SocketResponse> {
    const socket = await this.connect();

    if (!socket || !socket.connected) {
      throw new Error("Socket not available");
    }

    return new Promise((resolve, reject) => {
      let isResolved = false;
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(
            new Error(`Release seat timeout for ${seatLabel}`)
          );
        }
      }, 10000);

      socket.emit(
        "seat:release",
        { routeId, busId, seatLabel, departureDate: normalizeDateForRoom(departureDate) ?? departureDate },
        (response: SocketResponse) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            if (response.success) {
              resolve(response);
            } else {
              reject(
                new Error(
                  response.error || `Failed to release seat ${seatLabel}`
                )
              );
            }
          }
        }
      );
    });
  }

  async getInfo(): Promise<SocketResponse<{ userId: string }>> {
    const socket = await this.connect();

    if (!socket || !socket.connected) {
      return { success: false, error: "Socket not available" };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: "Get info timeout",
        });
      }, 5000);

      socket.emit("info:get", (response: SocketResponse<{ userId: string }>) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  async onSeatStatusChanged(
    callback: (data: SeatStatusChangedData) => void
  ): Promise<void> {
    const socket = await this.connect();
    if (socket) {
      socket.on("seat:status:changed", callback);
      console.log("[SEAT-SOCKET] Listener registered for seat:status:changed");
    } else {
      console.warn("[SEAT-SOCKET] No socket - cannot register seat:status:changed listener");
    }
  }

  offSeatStatusChanged(
    callback?: (data: SeatStatusChangedData) => void
  ): void {
    if (this.socket) {
      if (callback) {
        this.socket.off("seat:status:changed", callback);
      } else {
        this.socket.off("seat:status:changed");
      }
    }
  }
}

export const socketService = new SocketService();
