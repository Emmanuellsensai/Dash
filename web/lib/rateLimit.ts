import { sql } from "./db";

const WINDOW_MS = 30_000;

/**
 * One row per IP. The row is only touched when the window has expired,
 * so a hit inside the 30 second window returns no row and is denied.
 */
export async function allow(ip: string): Promise<boolean> {
  const rows = await sql`
    insert into rate_limits (ip, last_at)
    values (${ip}, now())
    on conflict (ip) do update
      set last_at = now()
      where rate_limits.last_at < now() - make_interval(secs => ${WINDOW_MS / 1000})
    returning ip
  `;
  return rows.length > 0;
}
