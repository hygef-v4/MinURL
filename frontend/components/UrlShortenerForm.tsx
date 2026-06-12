"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { shortenUrl, ShortenResponse } from "@/lib/api";
import QrCodePanel from "./QrCodePanel";
import { useAuth } from "@/lib/AuthContext";

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
  const { session } = useAuth();
  const [url, setUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ShortenResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [activeTab, setActiveTab] = useState<"shorten" | "qr">("shorten");
  const inlineCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderInlineQr = useCallback(async (shortUrl: string) => {
    if (!inlineCanvasRef.current) return;
    await QRCode.toCanvas(inlineCanvasRef.current, shortUrl, {
      width: 128,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#7c3aed", light: "#ffffff" },
    });
  }, []);

  useEffect(() => {
    if (result?.short_url) {
      renderInlineQr(result.short_url);
    }
  }, [result, renderInlineQr]);

  function handleDownloadQr() {
    if (!inlineCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = "minurl-qrcode.png";
    link.href = inlineCanvasRef.current.toDataURL("image/png");
    link.click();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a URL.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError("Invalid URL. Please enter a URL starting with http:// or https://");
      return;
    }

    const aliasTrimmed = customAlias.trim();
    if (aliasTrimmed) {
      if (aliasTrimmed.length < 3) {
        setError("Custom alias must be at least 3 characters long.");
        return;
      }
      if (aliasTrimmed.length > 30) {
        setError("Custom alias must be at most 30 characters long.");
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(aliasTrimmed)) {
        setError("Custom alias can only contain letters, numbers, hyphens (-) and underscores (_).");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await shortenUrl(trimmed, session?.access_token, aliasTrimmed || undefined);
      setResult(res);
      onSuccess(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.short_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  async function handleShare() {
    if (!result) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "MinURL - Fast URL Shortener",
          url: result.short_url,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  function handleReset() {
    setResult(null);
    setUrl("");
    setCustomAlias("");
    setError("");
  }

  return (
    <motion.div
      className="glass-card"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
    >
      {/* Tabs */}
      <div className="card-tabs">
        <motion.button
          type="button"
          className={`card-tab${activeTab === "shorten" ? " active" : ""}`}
          onClick={() => setActiveTab("shorten")}
          style={{ position: "relative", borderBottom: activeTab === "shorten" ? "none" : undefined }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          Shorten Link
          {activeTab === "shorten" && (
            <motion.div
              layoutId="active-tab-indicator"
              style={{
                position: "absolute",
                bottom: -1,
                left: 0,
                right: 0,
                height: "2px",
                background: "var(--accent-primary)",
              }}
            />
          )}
        </motion.button>
        <motion.button
          type="button"
          className={`card-tab${activeTab === "qr" ? " active" : ""}`}
          onClick={() => setActiveTab("qr")}
          style={{ position: "relative", borderBottom: activeTab === "qr" ? "none" : undefined }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="5" height="5" x="3" y="3" rx="1" />
            <rect width="5" height="5" x="16" y="3" rx="1" />
            <rect width="5" height="5" x="3" y="16" rx="1" />
            <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
            <path d="M21 21v.01" />
            <path d="M12 7v3a2 2 0 0 1-2 2H7" />
            <path d="M12 12v.01" />
          </svg>
          QR Code
          {activeTab === "qr" && (
            <motion.div
              layoutId="active-tab-indicator"
              style={{
                position: "absolute",
                bottom: -1,
                left: 0,
                right: 0,
                height: "2px",
                background: "var(--accent-primary)",
              }}
            />
          )}
        </motion.button>
      </div>

      {activeTab === "qr" ? (
        <QrCodePanel defaultUrl={result?.short_url ?? ""} />
      ) : (
        <form onSubmit={result ? (e) => e.preventDefault() : handleSubmit} noValidate>
          {/* Long URL Input */}
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="url-input" className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--text-muted)" }}
              >
                <path d="m18 8-6-6-6 6" />
                <path d="M12 2v20" />
              </svg>
              Your long URL
            </label>
            <input
              id="url-input"
              type="url"
              className={`url-input${error && !error.includes("Alias") ? " error" : ""}`}
              value={result ? result.long_url : url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              placeholder="https://example.com/very/long/url..."
              autoComplete="off"
              spellCheck={false}
              disabled={loading || !!result}
              style={{ width: "100%" }}
            />
          </div>

          {/* Custom Alias Input */}
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="alias-input" className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--text-muted)" }}
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Custom Alias (Optional)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                id="alias-input"
                type="text"
                className={`url-input${error && error.includes("Alias") ? " error" : ""}`}
                value={result ? result.short_code : customAlias}
                onChange={(e) => {
                  setCustomAlias(e.target.value);
                  if (error) setError("");
                }}
                placeholder="my-custom-link"
                autoComplete="off"
                spellCheck={false}
                disabled={loading || !!result}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Short URL Result Input */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95, overflow: "hidden" }}
                animate={{ 
                  opacity: 1, 
                  height: "auto", 
                  scale: 1,
                  transitionEnd: { overflow: "visible" }
                }}
                exit={{ 
                  opacity: 0, 
                  height: 0, 
                  scale: 0.95,
                  overflow: "hidden"
                }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                style={{ marginBottom: "20px" }}
              >
              <label htmlFor="short-url-output" className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--accent-primary)" }}
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Your MinURL short link
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="short-url-output"
                  type="text"
                  className="url-input"
                  value={result.short_url}
                  readOnly
                  style={{ width: "100%", paddingRight: "50px", color: "var(--accent-primary)", fontWeight: 700 }}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy Link"
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: "none",
                    color: copied ? "var(--success)" : "var(--accent-primary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {copied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Action Toolbar buttons */}
              <div className="inline-actions-grid">
                <motion.a
                  href={result.short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-action-btn"
                  style={{ textDecoration: "none" }}
                  whileHover={{ scale: 1.03, translateY: -1 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6" />
                    <path d="M10 14 21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                  Visit
                </motion.a>
                <motion.button
                  type="button"
                  className={`inline-action-btn${shared ? " active-success" : ""}`}
                  onClick={handleShare}
                  whileHover={{ scale: 1.03, translateY: -1 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {shared ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Shared!
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
                      Share
                    </>
                  )}
                </motion.button>
                <motion.button
                  type="button"
                  className={`inline-action-btn${copied ? " active-success" : ""}`}
                  onClick={handleCopy}
                  whileHover={{ scale: 1.03, translateY: -1 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      Copy
                    </>
                  )}
                </motion.button>
              </div>

              {/* Inline QR Code preview */}
              <div className="inline-qr-container">
                {/* Canvas */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "6px",
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(124,58,237,0.10)",
                  }}
                >
                  <canvas
                    ref={inlineCanvasRef}
                    style={{ display: "block", borderRadius: "6px" }}
                  />
                </div>

                {/* Right side text + download */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      marginBottom: "4px",
                    }}
                  >
                    QR Code
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginBottom: "12px",
                      lineHeight: 1.5,
                    }}
                  >
                    Scan to open your short link on any device.
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      id="inline-download-qr-png"
                      type="button"
                      className="inline-action-btn"
                      onClick={handleDownloadQr}
                      style={{ height: "36px", padding: "0 14px", fontSize: "12px" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                      Download PNG
                    </button>
                    <button
                      id="inline-open-qr-tab"
                      type="button"
                      className="inline-action-btn"
                      onClick={() => setActiveTab("qr")}
                      style={{ height: "36px", padding: "0 14px", fontSize: "12px" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="5" height="5" x="3" y="3" rx="1" />
                        <rect width="5" height="5" x="16" y="3" rx="1" />
                        <rect width="5" height="5" x="3" y="16" rx="1" />
                        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                        <path d="M21 21v.01" />
                        <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                        <path d="M12 12v.01" />
                      </svg>
                      Customize
                    </button>
                  </div>
                </div>
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <p className="error-msg" role="alert" style={{ marginBottom: "16px" }}>
              <span>⚠</span> {error}
            </p>
          )}

          {/* Action Button */}
          {result ? (
            <motion.button
              type="button"
              className="submit-btn action-btn-primary-green"
              onClick={handleReset}
              style={{ width: "100%", height: "54px" }}
              whileHover={{ scale: 1.015, translateY: -1 }}
              whileTap={{ scale: 0.985 }}
            >
              Shorten another link
            </motion.button>
          ) : (
            <motion.button
              id="shorten-btn"
              type="submit"
              className="submit-btn"
              disabled={loading}
              aria-label="Shorten URL"
              style={{ width: "100%", height: "54px" }}
              whileHover={{ scale: 1.015, translateY: -1 }}
              whileTap={{ scale: 0.985 }}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, display: "inline-block" }}
                    aria-hidden="true"
                  >
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5 5 3Z" />
                    <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" />
                  </svg>
                  <span>Shorten URL</span>
                </>
              )}
            </motion.button>
          )}
        </form>
      )}
    </motion.div>
  );
}
