"use client";

import { useState } from "react";

export default function PasswordForm({ hasExistingPassword }: { hasExistingPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ type: "error", message: data.error ?? "Password update failed." });
        return;
      }
      setStatus({ type: "success", message: data.message ?? "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setStatus({ type: "error", message: "Network error while updating the admin password." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 420 }}>
      {!hasExistingPassword && (
        <p className="page-sub" style={{ marginTop: 0 }}>
          No admin password is currently configured. Set one to secure the admin area.
        </p>
      )}

      {hasExistingPassword && (
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>

      <button className="primary" type="submit" disabled={loading}>
        {loading ? "Updating..." : hasExistingPassword ? "Update password" : "Set password"}
      </button>

      {status && (
        <div className={status.type === "success" ? "success" : "error"} style={{ marginTop: 14 }}>
          {status.message}
        </div>
      )}
    </form>
  );
}
