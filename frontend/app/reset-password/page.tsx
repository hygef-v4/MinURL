"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function ResetPasswordPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Handle password update submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccessMsg("Your password has been successfully updated!");
      setPassword("");
      setConfirmPassword("");
      
      // Redirect to home page where they can sign in with the new password
      setTimeout(() => {
        router.push("/");
      }, 2500);
    } catch (err: any) {
      console.error("Password update error:", err);
      setErrorMsg(err.message || "Failed to update password. Please try again.");
    } finally {
      setUpdating(false);
    }
  }

  if (authLoading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: "var(--text-secondary)" }}>
        Checking session status...
      </div>
    );
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

      <div className="reset-password-container">
        <div className="glass-card" style={{ maxWidth: "480px", margin: "80px auto 0", animation: "fade-up 0.5s both" }}>
          
          {!user ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--error)", marginBottom: "16px" }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                Access Denied
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px", lineHeight: 1.5 }}>
                You must use a valid recovery link sent to your email to access this page.
              </p>
              <button
                type="button"
                className="save-btn"
                onClick={() => router.push("/")}
              >
                Back to Homepage
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Create New Password
                </h2>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "6px", marginBottom: 0 }}>
                  Set a new, secure password for your account associated with <strong>{user.email}</strong>.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="form-group">
                  <label htmlFor="password">New Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <small>Must be at least 6 characters.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                {errorMsg && <div className="alert-message error">{errorMsg}</div>}
                {successMsg && <div className="alert-message success">{successMsg}</div>}

                <button type="submit" className="save-btn" disabled={updating}>
                  {updating ? "Updating Password..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        .reset-password-container {
          position: relative;
          z-index: 1;
          padding: 0 24px 80px;
          font-family: "Inter", sans-serif;
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
