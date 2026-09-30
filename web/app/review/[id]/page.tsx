import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewById } from "@/lib/db";
import { ruleModules } from "@/lib/engine/registry";
import { formatEvidence } from "@/lib/format";
import { avatarColor, initial } from "../../ui";

export const dynamic = "force-dynamic";

function ruleLabel(type: string): string {
  return ruleModules[type]?.label ?? type;
}

const MARKER_OK = { color: "var(--color-ok)", fontWeight: 700 };
const MARKER_FAIL = { color: "var(--color-redo-fg)", fontWeight: 700 };

const LIST: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = await reviewById(Number(id));
  if (!review) notFound();

  const results = review.rule_results ?? [];
  const passed = results.filter((r) => r.passed).length;
  const advisory = review.advisory;
  const notes = advisory?.status === "ok" ? (advisory.findings ?? []) : [];

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
        {new Date(review.created_at).toLocaleString()}
        {review.engine_version ? ` · engine ${review.engine_version}` : ""}
      </p>

      <section className="panel">
        <h2>Rule checklist</h2>
        <p className="sub">
          {passed} of {results.length} rules passed. Status comes from these rules only.
        </p>
        {results.length === 0 ? (
          <p className="muted">No rule results are stored for this review.</p>
        ) : (
          <ul style={LIST}>
            {results.map((r) => (
              <li
                key={r.ruleId}
                style={{
                  borderBottom: "1px solid var(--color-line)",
                  paddingBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={r.passed ? MARKER_OK : MARKER_FAIL}>
                    {r.passed ? "OK" : "FAIL"}
                  </span>
                  <span style={{ fontWeight: 500 }}>{ruleLabel(r.type)}</span>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {r.severity}
                  </span>
                </div>
                {!r.passed && (
                  <div style={{ marginTop: 4, paddingLeft: 34 }}>
                    <div className="muted">{r.message}</div>
                    {r.evidence.map((e, i) => (
                      <div
                        key={i}
                        className="muted"
                        style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                      >
                        {formatEvidence(e)}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {advisory && (
        <section className="panel">
          <h2>Comments and naming notes</h2>
          <p className="sub">Advisory only. These notes never affect the status.</p>
          {advisory.status === "ok" ? (
            notes.length === 0 ? (
              <p className="muted">No notes for this submission.</p>
            ) : (
              <ul style={LIST}>
                {notes.map((f, i) => (
                  <li key={i}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {f.category} · {f.severity} · {f.file}, line {f.line}:
                    </span>{" "}
                    {f.problem}
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="muted">
              Notes {advisory.status === "skipped" ? "skipped" : "unavailable"}:{" "}
              {advisory.reason ?? "unknown reason"}
            </p>
          )}
        </section>
      )}

      <section className="panel">
        <h2>Summary</h2>
        <pre className="review-body">{review.body}</pre>
      </section>
    </>
  );
}
