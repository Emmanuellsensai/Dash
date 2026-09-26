"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmitForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [day, setDay] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Day {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Reviewing…" : "Review"}
          </button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
