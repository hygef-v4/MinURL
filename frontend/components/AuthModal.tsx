"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "signin" | "signup" | "forgot";
}

export default function AuthModal({ isOpen, onClose, initialTab = "signin" }: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg("Signed in successfully!");
        setTimeout(() => {
          onClose();
        }, 1000);
      } else if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || null,
            },
          },
        });
        if (error) throw error;
        setSuccessMsg("Account created! Please check your email to confirm (if required), or start using MinURL.");
        setTimeout(() => {
          onClose();
        }, 2000);
      } else if (tab === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccessMsg("Password reset email sent! Please check your inbox.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Google sign-in failed.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="auth-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Close Button */}
        <motion.button
          className="auth-close-btn"
          onClick={onClose}
          aria-label="Close modal"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </motion.button>

        {/* Brand Header */}
        <div className="auth-header">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
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
          <h3>MinURL Account</h3>
        </div>

        {/* Tabs */}
        {tab === "forgot" ? (
          <div style={{ marginBottom: "20px", textAlign: "center" }}>
            <h4 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700, margin: 0 }}>Reset Password</h4>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "6px", marginBottom: 0, lineHeight: 1.4 }}>
              Enter your email address and we'll send you a recovery link.
            </p>
          </div>
        ) : (
          <div className="auth-tabs">
            <motion.button
              className={`auth-tab-btn ${tab === "signin" ? "active" : ""}`}
              onClick={() => {
                setTab("signin");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Sign In
            </motion.button>
            <motion.button
              className={`auth-tab-btn ${tab === "signup" ? "active" : ""}`}
              onClick={() => {
                setTab("signup");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Sign Up
            </motion.button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {tab === "signup" && (
            <div className="auth-field">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {tab !== "forgot" && (
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          {tab === "signin" && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-6px" }}>
              <button
                type="button"
                onClick={() => {
                  setTab("forgot");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-primary)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: 0,
                  transition: "opacity 0.2s"
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Forgot password?
              </button>
            </div>
          )}

          {errorMsg && <div className="auth-alert error">{errorMsg}</div>}
          {successMsg && <div className="auth-alert success">{successMsg}</div>}

          <motion.button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
            whileHover={{ scale: 1.02, translateY: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <span className="auth-spinner" />
            ) : tab === "signin" ? (
              "Sign In"
            ) : tab === "signup" ? (
              "Create Account"
            ) : (
              "Send Reset Link"
            )}
          </motion.button>

          {tab === "forgot" ? (
            <motion.button
              type="button"
              className="auth-google-btn"
              onClick={() => {
                setTab("signin");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              style={{ marginTop: "8px", background: "transparent", color: "var(--accent-primary)" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Back to Sign In
            </motion.button>
          ) : (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>

              <motion.button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleLogin}
                disabled={loading}
                whileHover={{ scale: 1.02, translateY: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.7 12.3c0-.8-.1-1.7-.2-2.5H12v4.8h6.6c-.3 1.5-1.1 2.8-2.4 3.7v3.1h3.9c2.3-2.1 3.6-5.2 3.6-9.1z"/>
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3.1c-1.1.7-2.5 1.2-4.1 1.2-3.2 0-5.8-2.1-6.8-5H1.2v3.1C3.2 21.3 7.3 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.2 14.2c-.3-.8-.4-1.7-.4-2.6s.1-1.8.4-2.6V5.9H1.2C.4 7.5 0 9.7 0 12s.4 4.5 1.2 6.1l4-3.1z"/>
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.1 0 12 0 7.3 0 3.2 2.7 1.2 6.8l4 3.1c1-2.9 3.6-5.1 6.8-5.1z"/>
                </svg>
                Continue with Google
              </motion.button>
            </>
          )}
        </form>
      </motion.div>

      <style>{`
        .auth-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .auth-modal-card {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: 32px;
          width: 90%;
          max-width: 420px;
          box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .auth-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .auth-close-btn:hover {
          color: var(--text-primary);
        }

        .auth-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }

        .auth-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .auth-tabs {
          display: flex;
          border-bottom: 2px solid var(--border-subtle);
          margin-bottom: 24px;
        }

        .auth-tab-btn {
          flex: 1;
          background: none;
          border: none;
          padding: 12px;
          font-family: "Inter", sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          position: relative;
          transition: color var(--transition-fast);
        }

        .auth-tab-btn:hover {
          color: var(--accent-primary);
        }

        .auth-tab-btn.active {
          color: var(--accent-primary);
        }

        .auth-tab-btn.active::after {
          content: "";
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent-primary);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-field label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .auth-field input {
          height: 46px;
          padding: 0 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: "Inter", sans-serif;
          font-size: 14px;
          transition: all var(--transition-fast);
        }

        .auth-field input:focus {
          outline: none;
          border-color: var(--border-accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
          background: var(--bg-card);
        }

        .auth-alert {
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 13px;
          line-height: 1.4;
        }

        .auth-alert.error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--error);
        }

        .auth-alert.success {
          background: var(--success-glow);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--success);
        }

        .auth-submit-btn {
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
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-submit-btn:hover {
          background: var(--accent-secondary);
        }

        .auth-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-muted);
          font-size: 12px;
          margin: 8px 0;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-subtle);
        }

        .auth-divider:not(:empty)::before {
          margin-right: .5em;
        }

        .auth-divider:not(:empty)::after {
          margin-left: .5em;
        }

        .auth-google-btn {
          height: 46px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-family: "Inter", sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all var(--transition-fast);
        }

        .auth-google-btn:hover {
          background: var(--bg-primary);
          border-color: var(--border-accent);
        }

        .auth-google-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleUp {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </motion.div>
  );
}
