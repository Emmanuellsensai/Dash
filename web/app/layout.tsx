import "./globals.css";
import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dash · code checker for the JS to TS cohort",
  description: "Submit your day's work, get a rule based review, and watch the leaderboard.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const isAdminLoggedIn = token ? await verifySessionToken(token) : false;

  return (
    <html lang="en">
      <body>
        <div className="layout">
          <aside className="sidebar">
            <div className="brand">
              Dash
              <small>JS → TS · 30-day sprint</small>
            </div>

            <div className="nav-section">Main</div>
            <Link href="/" className="nav-link">
              <span className="dot" /> Submit
            </Link>
            <Link href="/leaderboard" className="nav-link">
              <span className="dot" /> Leaderboard
            </Link>
            <Link href="/feed" className="nav-link">
              <span className="dot" /> All reviews
            </Link>

            <div className="nav-section">Admin</div>
            <Link href={isAdminLoggedIn ? "/admin" : "/admin/login"} className="nav-link">
              <span className="dot" /> {isAdminLoggedIn ? "Admin dashboard" : "Admin login"}
            </Link>

            <div className="nav-section">Resources</div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="nav-link"
            >
              <span className="dot" /> Docs
              <span className="badge-new">NEW</span>
            </a>
          </aside>

          <div className="content">{children}</div>
        </div>
      </body>
    </html>
  );
}
