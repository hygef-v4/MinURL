"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [totalUrls, setTotalUrls] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
            console.error("Lỗi khi tải thống kê URL:", error);
          } else {
            setTotalUrls(count ?? 0);
          }
        });
    }
  }, [user]);

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
      setSuccessMsg("Cập nhật thông tin thành công!");
      await refreshProfile(); // Update navbar display name immediately
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Không thể cập nhật thông tin.");
    } finally {
      setUpdating(false);
    }
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

      <div className="profile-container">
        <div className="glass-card" style={{ maxWidth: "550px", margin: "40px auto 0", animation: "fade-up 0.5s both" }}>
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
      </div>

      <style>{`
        .profile-container {
          position: relative;
          z-index: 1;
          padding: 0 24px 80px;
          font-family: "Inter", sans-serif;
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
      `}</style>
    </>
  );
}
