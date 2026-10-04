import LoginForm from "./LoginForm";

import { getAdminPasswordValue } from "@/lib/adminPassword";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const hasConfiguredPassword = Boolean(getAdminPasswordValue() && getAdminPasswordValue().trim());

  return (
    <>
      <h1 className="page-title">Admin login</h1>
      <p className="page-sub">
        {hasConfiguredPassword
          ? "Enter the admin password to manage days and rules."
          : "No admin password is currently configured. Set a new one below to unlock the admin area."}
      </p>
      <section className="panel">
        <LoginForm next={next} allowPasswordSetup={!hasConfiguredPassword} />
      </section>
    </>
  );
}
