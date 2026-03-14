import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let connectionPromise: Promise<Socket | null> | null = null;

/**
 * Get auth token for socket connection.
 * Uses localStorage/sessionStorage, then NEXT_PUBLIC_DEFAULT_TOKEN, then public default.
 */
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

/**
 * Get or create Socket.IO connection.
 * Returns null when no auth token is available (public users without signup).
 * The seats page will work in local-only mode when socket is unavailable.
 */
export async function getSocket(): Promise<Socket | null> {
  if (socket?.connected) {
    return socket;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = createSocketConnection();

  try {
    socket = await connectionPromise;
    return socket;
  } finally {
    connectionPromise = null;
  }
}

async function createSocketConnection(): Promise<Socket | null> {
  const token = getAuthToken();
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

  console.log("[SEAT-SOCKET] Creating connection to", url, "| hasToken:", !!token);

  if (!token) {
    console.warn("[SEAT-SOCKET] No auth token - skipping connection");
    return null;
  }

  const newSocket = io(url, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket", "polling"],
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error("[SEAT-SOCKET] Connection timeout after 10s");
      reject(new Error("Socket connection timeout"));
    }, 10000);

    newSocket.once("connect", () => {
      clearTimeout(timeout);
      console.log("[SEAT-SOCKET] Connected! id:", newSocket.id);
      resolve();
    });

    newSocket.once("connect_error", (err) => {
      clearTimeout(timeout);
      console.error("[SEAT-SOCKET] Connect error:", err.message);
      reject(err);
    });
  });

  newSocket.on("disconnect", (reason) => {
    console.log("[SEAT-SOCKET] Disconnected:", reason);
  });

  newSocket.on("error", (err) => {
    console.error("Socket error:", err);
  });

  return newSocket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connectionPromise = null;
}
