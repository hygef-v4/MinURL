"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";

interface Props {
  /** Pre-fill URL (e.g. the short URL just generated) */
  defaultUrl?: string;
}

type QrSize = 200 | 256 | 320 | 400;
type ErrorLevel = "L" | "M" | "Q" | "H";

const SIZES: { label: string; value: QrSize }[] = [
  { label: "Small", value: 200 },
  { label: "Medium", value: 256 },
  { label: "Large", value: 320 },
  { label: "XL", value: 400 },
];

const ERROR_LEVELS: { label: string; value: ErrorLevel; desc: string }[] = [
  { label: "L", value: "L", desc: "7% correction" },
  { label: "M", value: "M", desc: "15% correction" },
  { label: "Q", value: "Q", desc: "25% correction" },
  { label: "H", value: "H", desc: "30% correction" },
];

function isValidUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function QrCodePanel({ defaultUrl = "" }: Props) {
  const [inputUrl, setInputUrl] = useState(defaultUrl);
  const [qrUrl, setQrUrl] = useState(defaultUrl);
  const [size, setSize] = useState<QrSize>(256);
  const [errorLevel, setErrorLevel] = useState<ErrorLevel>("M");
  const [darkColor, setDarkColor] = useState("#7c3aed");
  const [lightColor] = useState("#ffffff");
  const [error, setError] = useState("");
  const [isGenerated, setIsGenerated] = useState(!!defaultUrl);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync when parent passes a new defaultUrl (e.g. after shortening)
  useEffect(() => {
    if (defaultUrl) {
      setInputUrl(defaultUrl);
      setQrUrl(defaultUrl);
      setIsGenerated(true);
      setError("");
    }
  }, [defaultUrl]);

  const renderQr = useCallback(async () => {
    if (!canvasRef.current || !qrUrl) return;
    try {
      await QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: size,
        margin: 2,
        errorCorrectionLevel: errorLevel,
        color: { dark: darkColor, light: lightColor },
      });
      setError("");
    } catch {
      setError("Failed to generate QR Code.");
    }
  }, [qrUrl, size, errorLevel, darkColor, lightColor]);

  useEffect(() => {
    if (isGenerated && qrUrl) {
      renderQr();
    }
  }, [renderQr, isGenerated, qrUrl]);

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setError("Please enter a URL.");
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError("Invalid URL. Must start with http:// or https://");
      return;
    }
    setError("");
    setQrUrl(trimmed);
    setIsGenerated(true);
  }

  async function handleDownloadPng() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "minurl-qrcode.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  async function handleDownloadSvg() {
    if (!qrUrl) return;
    try {
      const svgString = await QRCode.toString(qrUrl, {
        type: "svg",
        width: size,
        margin: 2,
        errorCorrectionLevel: errorLevel,
        color: { dark: darkColor, light: lightColor },
      });
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "minurl-qrcode.svg";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export SVG.");
    }
  }

  const hasValidQr = isGenerated && qrUrl && isValidUrl(qrUrl);

  return (
    <div style={{ padding: "4px 0" }}>
      {/* URL Input */}
      <form onSubmit={handleGenerate}>
        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="qr-url-input"
            className="form-label"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
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
              style={{ color: "var(--text-muted)" }}
            >
              <rect width="5" height="5" x="3" y="3" rx="1" />
              <rect width="5" height="5" x="16" y="3" rx="1" />
              <rect width="5" height="5" x="3" y="16" rx="1" />
              <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
              <path d="M21 21v.01" />
              <path d="M12 7v3a2 2 0 0 1-2 2H7" />
              <path d="M12 12v.01" />
            </svg>
            URL to encode
          </label>
          <div className="input-wrapper">
            <input
              id="qr-url-input"
              type="url"
              className={`url-input${error ? " error" : ""}`}
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                if (error) setError("");
              }}
              placeholder="https://example.com or your MinURL short link..."
              autoComplete="off"
              spellCheck={false}
              style={{ flex: 1, width: "100%" }}
            />
            <button
              id="generate-qr-btn"
              type="submit"
              className="submit-btn"
              style={{ height: "54px", padding: "0 20px" }}
            >
              Generate
            </button>
          </div>
          {error && (
            <p
              className="error-msg"
              role="alert"
              style={{ marginTop: "10px" }}
            >
              <span>⚠</span> {error}
            </p>
          )}
        </div>

        {/* Options row */}
        <div className="qr-options-grid">
          {/* Size picker */}
          <div>
            <label className="form-label" style={{ marginBottom: "8px" }}>
              Size
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSize(s.value)}
                  style={{
                    flex: 1,
                    height: "36px",
                    border: `1.5px solid ${size === s.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-sm)",
                    background:
                      size === s.value
                        ? "var(--accent-glow-soft)"
                        : "#ffffff",
                    color:
                      size === s.value
                        ? "var(--accent-primary)"
                        : "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "Inter, sans-serif",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error correction level */}
          <div>
            <label className="form-label" style={{ marginBottom: "8px" }}>
              Error Correction
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              {ERROR_LEVELS.map((el) => (
                <button
                  key={el.value}
                  type="button"
                  title={el.desc}
                  onClick={() => setErrorLevel(el.value)}
                  style={{
                    flex: 1,
                    height: "36px",
                    border: `1.5px solid ${errorLevel === el.value ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-sm)",
                    background:
                      errorLevel === el.value
                        ? "var(--accent-glow-soft)"
                        : "#ffffff",
                    color:
                      errorLevel === el.value
                        ? "var(--accent-primary)"
                        : "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: 700,
                    fontFamily: "Inter, sans-serif",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {el.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: "24px" }}>
          <label className="form-label" style={{ marginBottom: "8px" }}>
            QR Color
          </label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {["#7c3aed", "#0f172a", "#1d4ed8", "#059669", "#dc2626", "#d97706"].map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => setDarkColor(c)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: c,
                  border: darkColor === c ? "3px solid var(--accent-primary)" : "2px solid transparent",
                  outline: darkColor === c ? "2px solid white" : "none",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  flexShrink: 0,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              />
            ))}
            {/* Custom color */}
            <div style={{ position: "relative", marginLeft: "4px" }}>
              <input
                id="qr-color-picker"
                type="color"
                value={darkColor}
                onChange={(e) => setDarkColor(e.target.value)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: "2px solid var(--border-subtle)",
                  cursor: "pointer",
                  padding: 0,
                  overflow: "hidden",
                  appearance: "none",
                }}
                title="Custom color"
              />
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                fontFamily: "monospace",
                marginLeft: "4px",
              }}
            >
              {darkColor.toUpperCase()}
            </span>
          </div>
        </div>
      </form>

      {/* QR Preview */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {hasValidQr ? (
          <>
            {/* Canvas wrapper with animated border */}
            <div
              style={{
                position: "relative",
                display: "inline-block",
                animation: "result-appear 0.4s var(--transition-base) both",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  background: "#ffffff",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow:
                    "0 4px 12px rgba(124, 58, 237, 0.08), 0 1px 3px rgba(15,23,42,0.06)",
                  transition: "box-shadow var(--transition-base)",
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    display: "block",
                    borderRadius: "6px",
                  }}
                />
              </div>
            </div>

            {/* URL label below QR */}
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                textAlign: "center",
                maxWidth: "300px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {qrUrl}
            </p>

            {/* Download buttons */}
            <div className="qr-download-buttons">
              <button
                id="download-qr-png"
                type="button"
                className="inline-action-btn"
                onClick={handleDownloadPng}
                style={{ height: "44px", width: "100%" }}
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Download PNG
              </button>
              <button
                id="download-qr-svg"
                type="button"
                className="inline-action-btn"
                onClick={handleDownloadSvg}
                style={{ height: "44px", width: "100%" }}
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Download SVG
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              padding: "32px 0",
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-glow-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed var(--border-accent)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.6 }}
              >
                <rect width="5" height="5" x="3" y="3" rx="1" />
                <rect width="5" height="5" x="16" y="3" rx="1" />
                <rect width="5" height="5" x="3" y="16" rx="1" />
                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                <path d="M21 21v.01" />
                <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                <path d="M12 12v.01" />
              </svg>
            </div>
            <p style={{ fontSize: "14px", fontWeight: 500 }}>
              Enter a URL above and click <strong>Generate</strong>
            </p>
            <p style={{ fontSize: "12px", textAlign: "center", maxWidth: "240px" }}>
              You can also shorten a link first, then switch to this tab — it will auto-fill!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
