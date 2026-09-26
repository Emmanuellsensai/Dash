import Link from "next/link";
import { notFound } from "next/navigation";
import { studentByName, reviewsForStudent } from "@/lib/db";
import { avatarColor, initial } from "../../ui";

export const dynamic = "force-dynamic";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const student = await studentByName(decodeURIComponent(name));
  if (!student) notFound();
  const reviews = await reviewsForStudent(student.id);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <span
          className="avatar"
          style={{ background: avatarColor(student.name), width: 48, height: 48, fontSize: 16 }}
        >
          {initial(student.name)}
        </span>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            {student.name}
          </h1>
          <a href={student.repo_url} target="_blank" rel="noreferrer" className="muted">
            {student.repo_url}
          </a>
        </div>
      </div>
      <p className="page-sub"> </p>
      <section className="panel" style={{ padding: 0 }}>
        {reviews.length === 0 ? (
          <p className="muted" style={{ padding: 24 }}>
            Nothing yet.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Status</th>
                <th>When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td>Day {r.day_number}</td>
                  <td>
                    <span className={`badge ${r.status}`}>{r.status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="muted">{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    <Link href={`/review/${r.id}`} className="link">
                      open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
