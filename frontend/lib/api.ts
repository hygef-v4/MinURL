const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ShortenResponse {
  short_code: string;
  short_url: string;
  long_url: string;
  clicks_count: number;
}

export interface TopItem {
  label: string;
  count: number;
}

export interface DailyClick {
  date: string;
  count: number;
}

export interface URLAnalyticsResponse {
  short_code: string;
  total_clicks: number;
  clicks_today: number;
  top_referrers: TopItem[];
  top_countries: TopItem[];
  top_devices: TopItem[];
  top_browsers: TopItem[];
  daily_clicks: DailyClick[];
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

export async function fetchUrlAnalytics(
  shortCode: string,
  token?: string
): Promise<URLAnalyticsResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1/analytics/${shortCode}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load analytics.");
  }

  return res.json();
}
