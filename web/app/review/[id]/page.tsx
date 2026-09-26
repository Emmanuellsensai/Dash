import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewById } from "@/lib/db";
import { avatarColor, initial } from "../../ui";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = await reviewById(Number(id));
  if (!review) notFound();
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span
          className="avatar"
          style={{ background: avatarColor(review.student_name ?? "") }}
        >
          {initial(review.student_name ?? "?")}
        </span>
        <h1 className="page-title" style={{ margin: 0 }}>
          <Link href={`/student/${encodeURIComponent(review.student_name!)}`}>
            {review.student_name}
          </Link>{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            · Day {review.day_number}
          </span>
        </h1>
        <span className={`badge ${review.status}`} style={{ marginLeft: 12 }}>
          {review.status.replace(/_/g, " ")}
        </span>
      </div>
      <p className="page-sub">
        {new Date(review.created_at).toLocaleString()} · {review.model} ·{" "}
        {review.tokens_input + review.tokens_output} tokens · $
        {(review.cost_cents / 100).toFixed(3)}
      </p>
      <section className="panel">
        <pre className="review-body">{review.body}</pre>
      </section>
    </>
  );
}
