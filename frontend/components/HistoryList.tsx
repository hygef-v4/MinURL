"use client";

import { useState } from "react";
import { ShortenResponse } from "@/lib/api";

interface Props {
  history: ShortenResponse[];
  onClear: () => void;
}

export default function HistoryList({ history, onClear }: Props) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (history.length === 0) return null;

  async function handleCopy(item: ShortenResponse, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.short_url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = item.short_url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedCode(item.short_code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  return (
    <div
      className="glass-card"
      style={{ animation: "fade-up 0.5s 0.1s both" }}
    >
      <div className="history-header">
        <span className="history-title">🕐 Lịch sử ({history.length})</span>
        <button
          id="clear-history-btn"
          className="history-clear-btn"
          onClick={onClear}
          aria-label="Xóa lịch sử"
        >
          Xóa tất cả
        </button>
      </div>

      <ul className="history-list" role="list">
        {history.map((item, idx) => (
          <li key={item.short_code} style={{ animationDelay: `${idx * 0.05}s` }}>
            <a
              href={item.short_url}
              target="_blank"
              rel="noopener noreferrer"
              className="history-item"
              id={`history-item-${item.short_code}`}
              title={`Mở ${item.short_url}`}
            >
              <div className="history-icon" aria-hidden="true">🔗</div>
              <div className="history-text">
                <span className="history-short">{item.short_url}</span>
                <span className="history-long">{item.long_url}</span>
              </div>
              <button
                className="history-copy"
                onClick={(e) => handleCopy(item, e)}
                aria-label={`Copy ${item.short_url}`}
                title="Copy URL"
              >
                {copiedCode === item.short_code ? "✓" : "⎘"}
              </button>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
