"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "../../apiClient";

export default function NewDayPage() {
  const router = useRouter();
  const [dayNumber, setDayNumber] = useState("");
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const n = Number(dayNumber);
      if (!Number.isInteger(n) || n < 1) {
        setError("Day must be a whole number of 1 or higher.");
        return;
      }
      await adminFetch("/api/admin/days", "POST", { day_number: n, title, published });
      router.push(`/admin/days/${n}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">New day</h1>
      <p className="page-sub">Create the day first, then add requirements and rules.</p>
      <section className="panel">
        <form onSubmit={submit} style={{ maxWidth: 480 }}>
          <label htmlFor="day_number">Day number</label>
          <input
            id="day_number"
            type="number"
            min={1}
            required
            value={dayNumber}
            onChange={(e) => setDayNumber(e.target.value)}
            placeholder="1"
          />
          <div style={{ height: 12 }} />
          <label htmlFor="title">Title</label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Loops and arrays"
          />
          <div style={{ height: 12 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>
          <div style={{ marginTop: 14 }}>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create day"}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </form>
      </section>
    </>
  );
}
