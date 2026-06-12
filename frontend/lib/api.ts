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

async function parseError(res: Response, defaultMsg: string): Promise<Error> {
  try {
    const err = await res.json();
    if (err && err.detail) {
      if (typeof err.detail === "string") {
        return new Error(err.detail);
      }
      if (Array.isArray(err.detail)) {
        const msg = err.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
        return new Error(msg);
      }
      if (typeof err.detail === "object") {
        return new Error(err.detail.msg || err.detail.message || JSON.stringify(err.detail));
      }
    }
    return new Error(err?.message || defaultMsg);
  } catch {
    return new Error(defaultMsg);
  }
}

export async function shortenUrl(longUrl: string, token?: string, customAlias?: string): Promise<ShortenResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const body: any = { long_url: longUrl };
  if (customAlias) {
    body.custom_alias = customAlias;
  }

  const res = await fetch(`${API_URL}/api/v1/shorten`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw await parseError(res, "Failed to shorten URL. Please try again.");
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
    throw await parseError(res, "Failed to load URL history.");
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
    throw await parseError(res, "Failed to load analytics.");
  }

  return res.json();
}
