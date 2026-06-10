"use client";

import { useState } from "react";
import { ShortenResponse } from "@/lib/api";

interface Props {
  history: ShortenResponse[];
  onClear: () => void;
}

export default function HistoryList({ history, onClear }: Props) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sharedCode, setSharedCode] = useState<string | null>(null);
  const [activeQrCode, setActiveQrCode] = useState<string | null>(null);

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
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function handleShare(item: ShortenResponse, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "MinURL - Fast URL Shortener",
          url: item.short_url,
        });
        setSharedCode(item.short_code);
        setTimeout(() => setSharedCode(null), 2000);
      } catch {
        handleCopy(item, e);
      }
    } else {
      handleCopy(item, e);
      setSharedCode(item.short_code);
      setTimeout(() => setSharedCode(null), 2000);
    }
  }

  const renderQrCanvas = (canvas: HTMLCanvasElement | null, url: string) => {
    if (!canvas) return;
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvas, url, {
        width: 100,
        margin: 1,
        color: {
          dark: "#7c3aed",
          light: "#ffffff",
        },
      });
    });
  };

  const handleDownloadQr = (code: string) => {
    const canvas = document.getElementById(`qr-${code}`) as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `minurl-qrcode-${code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="recent-links-section" style={{ animation: "fade-up 0.5s 0.3s both" }}>
      <div className="history-header">
        <h2 className="recent-links-title">Recent Links</h2>
        <button
          id="clear-history-btn"
          className="history-clear-btn"
          onClick={onClear}
          aria-label="Clear history"
        >
          Clear all
        </button>
      </div>

      <ul className="history-list" role="list" style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
        {history.map((item, idx) => (
          <li key={item.short_code} style={{ animationDelay: `${idx * 0.05}s` }}>
            <div 
              style={{
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                transition: "border-color var(--transition-fast)"
              }}
              className="recent-link-wrapper"
            >
              <div className="recent-link-row" id={`history-item-${item.short_code}`} style={{ border: "none" }}>
                <div className="recent-link-left">
                  {/* Link Icon */}
                  <div className="recent-link-icon" aria-hidden="true">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  {/* Info */}
                  <div className="recent-link-info">
                    <a
                      href={item.short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="recent-link-short"
                      title={`Open ${item.short_url}`}
                    >
                      {item.short_url}
                    </a>
                    <span className="recent-link-original" title={item.long_url}>
                      {item.long_url}
                    </span>
                  </div>
                </div>

                {/* Actions toolbar */}
                <div className="recent-link-actions">
                  <a
                    href={item.short_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-action-btn"
                    style={{ textDecoration: "none", height: "36px", padding: "0 12px" }}
                    title="Visit link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                    <span>Visit</span>
                  </a>

                  <button
                    type="button"
                    className="inline-action-btn"
                    onClick={() => setActiveQrCode(prev => prev === item.short_code ? null : item.short_code)}
                    style={{ height: "36px", padding: "0 12px" }}
                    title="QR Code"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    <span>QR Code</span>
                  </button>

                  <button
                    type="button"
                    className={`inline-action-btn${sharedCode === item.short_code ? " active-success" : ""}`}
                    onClick={(e) => handleShare(item, e)}
                    style={{ height: "36px", padding: "0 12px" }}
                    title="Share link"
                  >
                    {sharedCode === item.short_code ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        <span>Shared!</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
                        </svg>
                        <span>Share</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`inline-action-btn${copiedCode === item.short_code ? " active-success" : ""}`}
                    onClick={(e) => handleCopy(item, e)}
                    style={{ height: "36px", padding: "0 12px" }}
                    title="Copy link"
                  >
                    {copiedCode === item.short_code ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {activeQrCode === item.short_code && (
                <div 
                  className="recent-link-qr-panel"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    padding: "16px 24px",
                    borderTop: "1px dashed var(--border-subtle)",
                    background: "rgba(124, 58, 237, 0.02)",
                    animation: "slideDown 0.25s ease-out"
                  }}
                >
                  <canvas 
                    id={`qr-${item.short_code}`} 
                    ref={(el) => renderQrCanvas(el, item.short_url)}
                    style={{
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 750, color: "var(--text-primary)" }}>QR Code Preview</h4>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "300px" }}>
                      Scan this code with a mobile camera to access your shortened URL directly.
                    </p>
                    <button
                      type="button"
                      className="navbar-btn-solid"
                      onClick={() => handleDownloadQr(item.short_code)}
                      style={{ height: "32px", fontSize: "12px", padding: "0 12px", width: "fit-content", marginTop: "4px" }}
                    >
                      Download PNG
                    </button>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .recent-link-wrapper:hover {
          border-color: var(--border-accent) !important;
        }
      `}</style>
    </div>
  );
}
