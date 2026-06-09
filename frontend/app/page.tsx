"use client";

import { useState, useEffect } from "react";
import AnimatedBackground from "@/components/AnimatedBackground";
import UrlShortenerForm from "@/components/UrlShortenerForm";
import HistoryList from "@/components/HistoryList";
import { ShortenResponse } from "@/lib/api";

const HISTORY_KEY = "minurl_history";
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
  const [history, setHistory] = useState<ShortenResponse[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function handleSuccess(newResult: ShortenResponse) {
    setHistory((prev) => {
      const filtered = prev.filter(
        (h) => h.short_code !== newResult.short_code,
      );
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

      {/* Top Navbar */}
      <nav className="navbar">
        <a href="#" className="navbar-brand">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--accent-primary)" }}
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          MinURL
        </a>

        <div className="navbar-actions">
          <button className="navbar-btn-text">Sign In</button>
          <button className="navbar-btn-solid">Get Started Free</button>
        </div>
      </nav>

      <div className="page-wrapper">
        {/* Main Content Grid */}
        <div className="hero-grid">
          {/* Left Column: Hero Text & Information */}
          <div className="hero-left">
            <header className="header">
              <div className="logo-badge" aria-label="MinURL">
                <div className="logo-badge-dot" />
                <span className="logo-badge-text">Free URL Shortener</span>
              </div>

              <h1 className="hero-title">
                Shorten URLs,
                <br />
                Build Branded Links & Track Clicks
              </h1>

              <p className="hero-subtitle">
                The minimalist link shortener — simplify the internet with
                short, reliable, and blazing-fast links. No sign-up required.
              </p>

              <div className="hero-stats-row">
                <div className="hero-stat">
                  <span className="hero-stat-value">∞</span>
                  <span className="hero-stat-label">Free Forever</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">&lt;1s</span>
                  <span className="hero-stat-label">Instant</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">100%</span>
                  <span className="hero-stat-label">Reliable</span>
                </div>
              </div>
            </header>
          </div>

          {/* Right Column: Interactive Form */}
          <div>
            <main id="main-content">
              <UrlShortenerForm onSuccess={handleSuccess} />
            </main>
          </div>
        </div>

        {/* History / Recent Links */}
        <HistoryList history={history} onClear={handleClearHistory} />

        {/* Footer */}
        <footer className="footer">
          <p>
            Built by{" "}
            <a
              href="https://github.com/hygef-v4/MinURL"
              target="_blank"
              rel="noopener noreferrer"
            >
              hygef-v4
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
