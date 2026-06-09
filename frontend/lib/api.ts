const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ShortenResponse {
  short_code: string;
  short_url: string;
  long_url: string;
}

export async function shortenUrl(longUrl: string): Promise<ShortenResponse> {
  const res = await fetch(`${API_URL}/api/v1/,shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ long_url: longUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Không thể rút ngắn URL. Vui lòng thử lại.");
  }

  return res.json();
}
