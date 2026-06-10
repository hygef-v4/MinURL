const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ShortenResponse {
  short_code: string;
  short_url: string;
  long_url: string;
}

export async function shortenUrl(longUrl: string, token?: string): Promise<ShortenResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/shorten`, {
    method: "POST",
    headers,
    body: JSON.stringify({ long_url: longUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to shorten URL. Please try again.");
  }

  return res.json();
}

export async function fetchUserHistory(token: string): Promise<ShortenResponse[]> {
  const res = await fetch(`${API_URL}/api/v1/history`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load URL history.");
  }

  return res.json();
}
