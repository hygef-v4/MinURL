"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import HistoryList from "@/components/HistoryList";
import { fetchUserHistory, ShortenResponse } from "@/lib/api";

export default function ProfilePage() {
  const { user, session, profile, loading: authLoading, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"account" | "security" | "analytics">("account");
  const [displayName, setDisplayName] = useState("");
  const [totalUrls, setTotalUrls] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Change Password States
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwUpdating, setPwUpdating] = useState(false);
  const [pwErrorMsg, setPwErrorMsg] = useState("");
  const [pwSuccessMsg, setPwSuccessMsg] = useState("");

  // History/Analytics States
  const [history, setHistory] = useState<ShortenResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Redirect if guest
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Load profile details and stats
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      // Fetch total links count using head option for high performance
      supabase
        .from("urls")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .then(({ count, error }) => {
          if (error) {
            console.error("Failed to load URL stats:", error);
          } else {
            setTotalUrls(count ?? 0);
          }
        });
    }
  }, [user]);

  // Fetch History for Analytics Tab
  useEffect(() => {
    if (session?.access_token) {
      setHistoryLoading(true);
      fetchUserHistory(session.access_token)
        .then((dbHistory) => {
          setHistory(dbHistory);
        })
        .catch((err) => {
          console.error("Failed to load history on profile:", err);
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    }
  }, [session, activeTab]); // Re-fetch on token/tab change

  if (authLoading || !user) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: "var(--text-secondary)" }}>
        Loading Profile...
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName || null })
        .eq("id", user!.id);

      if (error) throw error;
      setSuccessMsg("Profile updated successfully!");
      await refreshProfile(); // Update navbar display name immediately
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Unable to update profile.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwUpdating(true);
    setPwErrorMsg("");
    setPwSuccessMsg("");

    if (newPassword.length < 6) {
      setPwErrorMsg("Password must be at least 6 characters.");
      setPwUpdating(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPwErrorMsg("Passwords do not match.");
      setPwUpdating(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      setPwSuccessMsg("Password updated successfully!");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      console.error(err);
      setPwErrorMsg(err.message || "Failed to update password.");
    } finally {
      setPwUpdating(false);
    }
  }

  function handleClearHistory() {
    setHistory([]);
  }

  return (
    <>
      <AnimatedBackground />

      {/* Navbar */}
      <nav className="navbar">
        <a href="/" className="navbar-brand">
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
          <button className="navbar-btn-text" onClick={() => router.push("/")}>
            Back to Home
          </button>
        </div>
      </nav>

      <div 
        className="profile-container" 
        style={{ 
          maxWidth: activeTab === "analytics" ? "900px" : "550px", 
          margin: "40px auto 0",
          transition: "max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        {/* Animated Tabs Navigation */}
        <div className="profile-tabs">
          {[
            { id: "account", label: "Account", icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            )},
            { id: "security", label: "Security", icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )},
            { id: "analytics", label: "Analytics", icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" />
              </svg>
            )},
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`profile-tab ${activeTab === tab.id ? "active" : ""}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="profile-tab-indicator"
                  className="profile-tab-indicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        <AnimatePresence mode="wait">
          {activeTab === "account" && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="glass-card" style={{ width: "100%", margin: 0 }}>
                <div className="profile-header">
                  <h2>Your Profile</h2>
                  <p>Manage your account credentials and shortened links status.</p>
                </div>

                <div className="profile-stats-grid">
                  <div className="stat-card">
                    <span className="stat-num">{totalUrls !== null ? totalUrls : "—"}</span>
                    <span className="stat-lbl">Total Shortened URLs</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-num" style={{ fontSize: "14px", fontWeight: 700 }}>
                      {user.email?.split("@")[1]}
                    </span>
                    <span className="stat-lbl">Provider/Domain</span>
                  </div>
                </div>

                <form onSubmit={handleSave} className="profile-form">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="text" value={user.email || ""} disabled className="input-disabled" />
                    <small>Your login email address cannot be changed.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="displayName">Display Name</label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter display name"
                    />
                  </div>

                  {errorMsg && <div className="alert-message error">{errorMsg}</div>}
                  {successMsg && <div className="alert-message success">{successMsg}</div>}

                  <div className="form-actions">
                    <button type="submit" className="save-btn" disabled={updating}>
                      {updating ? "Saving Changes..." : "Save Profile"}
                    </button>
                    <button
                      type="button"
                      className="save-btn"
                      style={{ marginTop: "10px", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                      onClick={async () => { await signOut(); router.push("/"); }}
                    >
                      Sign Out
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="glass-card" style={{ width: "100%", margin: 0 }}>
                <div className="profile-header">
                  <h2>Change Password</h2>
                  <p>Update your account password. Must be at least 6 characters.</p>
                </div>

                <form onSubmit={handleChangePassword} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      id="newPassword"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmNewPassword">Confirm New Password</label>
                    <input
                      id="confirmNewPassword"
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  {pwErrorMsg && <div className="alert-message error">{pwErrorMsg}</div>}
                  {pwSuccessMsg && <div className="alert-message success">{pwSuccessMsg}</div>}

                  <div className="form-actions">
                    <button type="submit" className="save-btn" disabled={pwUpdating}>
                      {pwUpdating ? "Updating Password..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="profile-header" style={{ marginBottom: "20px" }}>
                <h2>Analytics Dashboard</h2>
                <p>Track click statistics, traffic sources, and geo breakdowns for your shortened links.</p>
              </div>

              {historyLoading ? (
                <div className="glass-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <div className="loading-spinner" />
                  <p>Fetching click statistics & links...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
                    You have not shortened any links yet.
                  </p>
                  <button className="save-btn" onClick={() => router.push("/")} style={{ width: "auto", padding: "0 24px" }}>
                    Shorten Link Now
                  </button>
                </div>
              ) : (
                <HistoryList 
                  history={history} 
                  onClear={handleClearHistory} 
                  token={session?.access_token} 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .profile-container {
          position: relative;
          z-index: 1;
          padding: 0 24px 80px;
          font-family: "Inter", sans-serif;
        }

        .profile-tabs {
          display: flex;
          gap: 6px;
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 4px;
          margin-bottom: 28px;
          backdrop-filter: blur(8px);
          position: relative;
        }

        .profile-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 40px;
          font-family: "Inter", sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          position: relative;
          transition: color var(--transition-fast);
          outline: none;
        }

        .profile-tab.active {
          color: var(--text-primary);
        }

        .profile-tab:hover {
          color: var(--text-primary);
        }

        .profile-tab-indicator {
          position: absolute;
          inset: 0;
          background: var(--bg-secondary);
          box-shadow: 0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.015);
          border: 1px solid var(--border-subtle);
          border-radius: calc(var(--radius-md) - 2px);
          z-index: -1;
        }

        .profile-header {
          margin-bottom: 28px;
        }

        .profile-header h2 {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .profile-header p {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .profile-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .stat-num {
          font-size: 28px;
          font-weight: 800;
          color: var(--accent-primary);
          line-height: 1.2;
        }

        .stat-lbl {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-top: 4px;
          letter-spacing: 0.05em;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .form-group input {
          height: 46px;
          padding: 0 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-family: "Inter", sans-serif;
          font-size: 14px;
          transition: all var(--transition-fast);
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--border-accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .form-group input.input-disabled {
          background: var(--bg-primary);
          color: var(--text-muted);
          cursor: not-allowed;
          border-color: var(--border-subtle);
        }

        .form-group small {
          font-size: 12px;
          color: var(--text-muted);
        }

        .alert-message {
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 13px;
          line-height: 1.4;
        }

        .alert-message.error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--error);
        }

        .alert-message.success {
          background: var(--success-glow);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--success);
        }

        .form-actions {
          margin-top: 8px;
        }

        .save-btn {
          height: 48px;
          background: var(--accent-primary);
          border: none;
          border-radius: var(--radius-md);
          color: #fff;
          font-family: "Inter", sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color var(--transition-fast);
          width: 100%;
        }

        .save-btn:hover {
          background: var(--accent-secondary);
        }

        .save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border-subtle);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
