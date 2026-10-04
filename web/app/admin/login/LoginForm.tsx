"use client";
import { useState } from "react";

function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/admin";
}

export default function LoginForm({
  next,
  allowPasswordSetup = false,
}: {
  next?: string;
  allowPasswordSetup?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const endpoint = allowPasswordSetup ? "/api/admin/password" : "/api/admin/login";
      const payload = allowPasswordSetup
        ? { currentPassword: "", newPassword, confirmPassword }
        : { password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Request failed.");
        return;
      }

      if (allowPasswordSetup) {
        setInfo("Password set successfully. You can sign in with it now.");
        setNewPassword("");
        setConfirmPassword("");
        setLoading(false);
        return;
      }

      window.location.assign(safeNext(next));
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (allowPasswordSetup) {
    return (
      <form onSubmit={submit} style={{ maxWidth: 420 }}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="new-password">New admin password</label>
          <input
            id="new-password"
            type="password"
            minLength={6}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            minLength={6}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Set admin password"}
          </button>
        </div>
        {info && <div className="success" style={{ marginTop: 14 }}>{info}</div>}
        {error && <div className="error" style={{ marginTop: 14 }}>{error}</div>}
      </form>
    );
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 360 }}>
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      <div style={{ marginTop: 14 }}>
        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
