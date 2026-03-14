/**
 * Download ticket PDF from /print-ticket/:ticketNumber
 */

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000";

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
  return null;
}

export async function downloadTicketPdf(ticketNumber: string): Promise<void> {
  const url = `${baseUrl}/api/v1/public/print-ticket/${encodeURIComponent(ticketNumber)}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`Failed to download ticket: ${res.statusText}`);
  }

  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `ticket-${ticketNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
