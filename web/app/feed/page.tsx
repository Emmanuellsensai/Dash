import Link from "next/link";
import { recentReviews } from "@/lib/db";
import { avatarColor, initial } from "../ui";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const reviews = await recentReviews(50);
  return (
    <>
      <h1 className="page-title">All reviews</h1>
      <p className="page-sub">Every review, most recent first.</p>
      <section className="panel">
        {reviews.length === 0 ? (
          <p className="muted">Nothing yet.</p>
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
