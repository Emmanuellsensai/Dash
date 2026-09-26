import Link from "next/link";
import { leaderboard } from "@/lib/db";
import { avatarColor, initial, medalClass } from "../ui";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const rows = await leaderboard();
  return (
    <>
      <h1 className="page-title">Leaderboard</h1>
      <p className="page-sub">
        PASS = 3, PASS WITH FIXES = 1. Earliness bonus per day: 1st to pass +5, 2nd +3, 3rd +2.
      </p>
      <section className="panel" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <p className="muted" style={{ padding: 24 }}>
            No submissions yet.
          </p>
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
              {rows.map((r, i) => (
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
    </>
  );
}
