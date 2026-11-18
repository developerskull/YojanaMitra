export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-1.5 text-sm font-medium text-[var(--accent-teal)]">
        YojanaMitra Foundation Ready
      </div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Find Government Schemes You Qualify For
      </h1>
      <p className="mt-4 max-w-2xl text-base text-[var(--fg-secondary)]">
        Multilingual AI assistant for Indian citizens in Marathi, Hindi, and English — grounded in
        verified official scheme files with deterministic eligibility checks.
      </p>
    </main>
  );
}
