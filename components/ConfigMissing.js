export default function ConfigMissing() {
  return (
    <div className="center-screen">
      <div className="card narrow">
        <h1 className="h2">Supabase is not connected</h1>
        <p className="muted">
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (and the
          server-only <code>SUPABASE_SERVICE_ROLE_KEY</code>) in <code>.env.local</code> for local use, or in
          Vercel → Project → Settings → Environment Variables, then redeploy.
        </p>
      </div>
    </div>
  );
}
