import LoginForm from "./LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="page-title">Admin login</h1>
      <p className="page-sub">Enter the admin password to manage days and rules.</p>
      <section className="panel">
        <LoginForm next={next} />
      </section>
    </>
  );
}
