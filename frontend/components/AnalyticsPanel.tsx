"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchUrlAnalytics, URLAnalyticsResponse, TopItem, DailyClick } from "@/lib/api";

interface Props {
  shortCode: string;
  token?: string;
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      padding: "14px 18px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      flex: 1,
      minWidth: "100px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: DailyClick[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
        Last 7 Days
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "60px" }}>
        {data.map((d, i) => {
          const heightPct = max === 0 ? 0 : (d.count / max) * 100;
          const label = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <div
              key={d.date}
              title={`${label}: ${d.count} click${d.count !== 1 ? "s" : ""}`}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "default" }}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(heightPct, d.count > 0 ? 4 : 0)}%` }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 200, damping: 22 }}
                style={{
                  width: "100%",
                  background: d.count > 0 ? "var(--accent-primary)" : "var(--border-subtle)",
                  borderRadius: "3px 3px 0 0",
                  minHeight: d.count > 0 ? "4px" : "2px",
                  opacity: d.count > 0 ? 0.85 : 0.4,
                }}
              />
              <span style={{ fontSize: "9px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", maxWidth: "100%" }}>
                {label.split(" ")[1]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopList({ title, items, icon }: { title: string; items: TopItem[]; icon: React.ReactNode }) {
  const max = items[0]?.count || 1;
  return (
    <div>
      <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
        {icon} {title}
      </p>
      {items.length === 0 ? (
        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>No data yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500, maxWidth: "75%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.label}
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                  {item.count}
                </span>
              </div>
              <div style={{ height: "4px", background: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / max) * 100}%` }}
                  transition={{ delay: i * 0.05 + 0.1, type: "spring", stiffness: 180, damping: 22 }}
                  style={{ height: "100%", background: "var(--accent-primary)", borderRadius: "2px", opacity: 0.75 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonBlock({ height = 16, width = "100%" }: { height?: number; width?: string }) {
  return (
    <div style={{
      height, width,
      background: "linear-gradient(90deg, var(--bg-secondary) 25%, var(--border-subtle) 50%, var(--bg-secondary) 75%)",
      backgroundSize: "200% 100%",
      borderRadius: "4px",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AnalyticsPanel({ shortCode, token }: Props) {
  const [data, setData] = useState<URLAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchUrlAnalytics(shortCode, token)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [shortCode, token]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto", transitionEnd: { overflow: "visible" } }}
      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      style={{ overflow: "hidden" }}
    >
      <div style={{
        padding: "20px 24px",
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-subtle)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" />
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
            Link Analytics
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "1px 8px" }}>
            {shortCode}
          </span>
        </div>

        {/* Error state */}
        {error && (
          <p style={{ fontSize: "13px", color: "var(--danger, #ef4444)", marginBottom: "8px" }}>
            ⚠ {error}
          </p>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <SkeletonBlock height={72} /><SkeletonBlock height={72} />
            </div>
            <SkeletonBlock height={80} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <SkeletonBlock height={120} /><SkeletonBlock height={120} />
            </div>
          </div>
        )}

        {/* Data */}
        {!loading && !error && data && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Stat cards row */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <StatCard
                label="Total Clicks"
                value={data.total_clicks}
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
              />
              <StatCard
                label="Today"
                value={data.clicks_today}
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
              />
            </div>

            {/* Sparkline */}
            <Sparkline data={data.daily_clicks} />

            {/* Breakdown grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px" }}>
              <TopList
                title="Referrers"
                items={data.top_referrers}
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
              />
              <TopList
                title="Countries"
                items={data.top_countries}
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
              />
              <TopList
                title="Devices"
                items={data.top_devices}
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>}
              />
              <TopList
                title="Browsers"
                items={data.top_browsers}
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8V4H8"/><rect width="8" height="8" x="8" y="8" rx="1"/><path d="M4 8h4"/><path d="M4 16h4"/><path d="M16 4v4"/><path d="M16 16v4"/></svg>}
              />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </motion.div>
  );
}
