import Link from "next/link";
import { getAllDays, ruleCounts } from "@/lib/db";
import { getAdminPasswordValue } from "@/lib/adminPassword";
import LogoutButton from "./LogoutButton";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [days, counts] = await Promise.all([getAllDays(), ruleCounts()]);
  const countBy = new Map(counts.map((c) => [c.day_number, c.count]));
  const hasExistingPassword = Boolean(getAdminPasswordValue() && getAdminPasswordValue().trim());

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Admin
        </h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link href="/admin/days/new" className="primary" style={{ display: "inline-block" }}>
            New day
          </Link>
          <LogoutButton />
        </div>
      </div>
      <p className="page-sub">
        Days, requirements and rules. A day appears on the submit form once it is published with
        at least one enabled rule.
      </p>

      <section className="panel">
        <h2 className="page-title" style={{ marginTop: 0, marginBottom: 8, fontSize: 24 }}>
          Password
        </h2>
        <PasswordForm hasExistingPassword={hasExistingPassword} />
      </section>

      <section className="panel" style={{ padding: 0 }}>
        {days.length === 0 ? (
          <p className="muted" style={{ padding: 24 }}>
            No days yet. Create the first one.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Title</th>
                <th>Rules</th>
                <th>Published</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day_number}>
                  <td>Day {d.day_number}</td>
                  <td>{d.title}</td>
                  <td>{countBy.get(d.day_number) ?? 0}</td>
                  <td>
                    <span className={`badge ${d.published ? "PASS" : "REDO"}`}>
                      {d.published ? "published" : "draft"}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/days/${d.day_number}`} className="link">
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
