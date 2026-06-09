"use client";

import { useState, useEffect } from "react";
import AnimatedBackground from "@/components/AnimatedBackground";
import UrlShortenerForm from "@/components/UrlShortenerForm";
import ResultCard from "@/components/ResultCard";
import HistoryList from "@/components/HistoryList";
import { ShortenResponse } from "@/lib/api";

const HISTORY_KEY = "warplink_history";
const MAX_HISTORY = 10;

function loadHistory(): ShortenResponse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: ShortenResponse[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

export default function HomePage() {
  const [result, setResult] = useState<ShortenResponse | null>(null);
  const [history, setHistory] = useState<ShortenResponse[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function handleSuccess(newResult: ShortenResponse) {
    setResult(newResult);
    setHistory((prev) => {
      // Deduplicate by short_code
      const filtered = prev.filter((h) => h.short_code !== newResult.short_code);
      const next = [newResult, ...filtered].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }

  function handleClearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  return (
    <>
      <AnimatedBackground />

      <div className="page-wrapper">
        {/* Hero Header */}
        <header className="header">
          <div className="logo-badge" aria-label="WarpLink">
            <div className="logo-badge-dot" />
            <span className="logo-badge-text">WarpLink</span>
          </div>

          <h1 className="hero-title">
            <span className="hero-title-gradient">
              Rút ngắn URL
              <br />
              siêu tốc độ
            </span>
          </h1>

          <p className="hero-subtitle">
            Chuyển đổi bất kỳ URL dài nào thành đường link gọn gàng, dễ chia
            sẻ — miễn phí, tức thì, không cần đăng nhập.
          </p>
        </header>

        {/* Stats Bar */}
        <div className="stats-bar" role="presentation">
          <div className="stat-item">
            <div className="stat-value">∞</div>
            <div className="stat-label">Miễn phí</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">&lt;1s</div>
            <div className="stat-label">Tốc độ</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">100%</div>
            <div className="stat-label">Tin cậy</div>
          </div>
        </div>

        {/* Main Content */}
        <main className="main-content" id="main-content">
          {/* Shorten Form */}
          <UrlShortenerForm onSuccess={handleSuccess} />

          {/* Latest Result */}
          {result && <ResultCard result={result} />}

          {/* History */}
          <HistoryList history={history} onClear={handleClearHistory} />
        </main>

        {/* Footer */}
        <footer className="footer">
          <p>
            Được xây dựng với ❤️ bởi{" "}
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              WarpLink Team
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
