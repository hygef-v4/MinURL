"use client";

import { useState } from "react";
import { shortenUrl, ShortenResponse } from "@/lib/api";

interface Props {
  onSuccess: (result: ShortenResponse) => void;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function UrlShortenerForm({ onSuccess }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Vui lòng nhập URL.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError("URL không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://");
      return;
    }

    setLoading(true);
    try {
      const result = await shortenUrl(trimmed);
      onSuccess(result);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card" style={{ animationDelay: "0.3s", animation: "fade-up 0.6s 0.3s both" }}>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="url-input" className="form-label">
          Nhập URL dài của bạn
        </label>
        <div className="input-wrapper">
          <input
            id="url-input"
            type="url"
            className={`url-input${error ? " error" : ""}`}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            placeholder="https://example.com/very/long/url..."
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
          />
          <button
            id="shorten-btn"
            type="submit"
            className="submit-btn"
            disabled={loading}
            aria-label="Rút ngắn URL"
          >
            {loading ? <span className="spinner" /> : "✦ Rút ngắn"}
          </button>
        </div>
        {error && (
          <p className="error-msg" role="alert">
            <span>⚠</span> {error}
          </p>
        )}
      </form>
    </div>
  );
}
