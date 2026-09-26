import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JS -> TS Cohort",
  description: "Public reviews and leaderboard for the 30-day JS to TypeScript cohort.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <aside className="sidebar">
            <div className="brand">
              JS → TS Cohort
              <small>30-day sprint</small>
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
