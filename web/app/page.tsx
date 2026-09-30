import Link from "next/link";
import { recentReviews, leaderboard, getPublishedDays } from "@/lib/db";
import SubmitForm from "./SubmitForm";
import { avatarColor, initial, medalClass } from "./ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [reviews, board, days] = await Promise.all([
    recentReviews(8),
    leaderboard(),
    getPublishedDays(),
  ]);
  return (
    <>
      <h1 className="page-title">Submit for a review</h1>
      <p className="page-sub">
        Paste your public GitHub repo URL and pick a published day. Re-checks of the same commit are free.
      </p>

      <section className="panel">
        <SubmitForm days={days} />
      </section>

      <section className="panel">
        <h2>Leaderboard</h2>
        <p className="sub">Top 5 by score. Full board is on the leaderboard page.</p>
        {board.length === 0 ? (
          <p className="muted">No submissions yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>Pass</th>
                <th>Fixes</th>
                <th>Redo</th>
              </tr>
            </thead>
            <tbody>
              {board.slice(0, 5).map((r, i) => (
                <tr key={r.name}>
                  <td>
                    <span className={`rank ${medalClass(i)}`}>{i + 1}</span>
                  </td>
                  <td>
                    <div className="name-cell">
                      <span className="avatar" style={{ background: avatarColor(r.name) }}>
                        {initial(r.name)}
                      </span>
                      <Link href={`/student/${encodeURIComponent(r.name)}`} className="name">
                        {r.name}
                      </Link>
                    </div>
                  </td>
                  <td>{r.score}</td>
                  <td>{r.passes}</td>
                  <td>{r.fixes}</td>
                  <td>{r.redos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h2>Recent reviews</h2>
        <p className="sub">Latest submissions from the cohort.</p>
        {reviews.length === 0 ? (
          <p className="muted">Nothing yet. Be the first.</p>
        ) : (
          reviews.map((r) => (
            <Link href={`/review/${r.id}`} key={r.id} className="feed-item">
              <span className="avatar" style={{ background: avatarColor(r.student_name ?? "") }}>
                {initial(r.student_name ?? "?")}
              </span>
              <div>
                <div className="title">
                  {r.student_name} <span className="muted">· day {r.day_number}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <span className={`badge ${r.status}`} style={{ marginLeft: "auto" }}>
                {r.status.replace(/_/g, " ")}
              </span>
            </Link>
          ))
        )}
      </section>
    </>
  );
}
