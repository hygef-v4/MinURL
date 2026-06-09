"use client";

import { useState } from "react";
import { ShortenResponse } from "@/lib/api";

interface Props {
  result: ShortenResponse;
}

export default function ResultCard({ result }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.short_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = result.short_url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="glass-card result-card">
      <p className="result-label">URL đã rút ngắn</p>

      <div className="result-url-row">
        <a
          href={result.short_url}
          target="_blank"
          rel="noopener noreferrer"
          className="result-short-url"
          id="result-short-url"
          title={result.short_url}
        >
          {result.short_url}
        </a>
        <button
          id="copy-btn"
          className={`copy-btn${copied ? " copied" : ""}`}
          onClick={handleCopy}
          aria-label="Copy short URL"
        >
          {copied ? (
            <>✓ Đã copy!</>
          ) : (
            <>⎘ Copy</>
          )}
        </button>
      </div>

      <p className="result-original">
        Gốc: <span title={result.long_url}>{result.long_url}</span>
      </p>
    </div>
  );
}
