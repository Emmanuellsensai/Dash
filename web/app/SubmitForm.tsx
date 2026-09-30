"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface FormDay {
  day_number: number;
  title: string;
}

export default function SubmitForm({ days }: { days: FormDay[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [day, setDay] = useState(days.length > 0 ? String(days[0].day_number) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (days.length === 0) {
    return <p className="muted">No days are published yet. Check back soon.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, repo, day: Number(day) }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Something went wrong.");
        return;
      }
      router.push(`/review/${j.review.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="row">
        <div>
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada"
          />
        </div>
        <div>
          <label htmlFor="repo">GitHub repo URL</label>
          <input
            id="repo"
            required
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="https://github.com/you/your-repo"
          />
        </div>
        <div>
          <label htmlFor="day">Day</label>
          <select id="day" value={day} onChange={(e) => setDay(e.target.value)}>
            {days.map((d) => (
              <option key={d.day_number} value={d.day_number}>
                Day {d.day_number}: {d.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Checking..." : "Check"}
          </button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
