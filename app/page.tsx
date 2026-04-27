const setupSteps = [
  "Set Taskflow, Resend, and idempotency environment variables.",
  "Run the Taskflow client generator after any OpenAPI schema change.",
  "Deploy to Vercel and configure the cron secret.",
  "Use the included single UTC cron for one delivery per day.",
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Daily Morning Brief</p>
        <h1>Production-ready Next.js briefing pipeline for Vercel Cron.</h1>
        <p className="lede">
          Sends a daily morning email using Resend, Taskflow
          daily summaries, and live research across the sectors you specified.
        </p>
      </section>

      <section className="card">
        <h2>Included</h2>
        <ul>
          <li>App Router API route at <code>/api/cron/morning-brief</code></li>
          <li>Generated Taskflow client for <code>getDailySummary</code></li>
          <li>Story dedupe, noise filtering, ranking, and HTML email output</li>
          <li>Vitest coverage for ranking and formatter behavior</li>
        </ul>
      </section>

      <section className="card">
        <h2>Setup path</h2>
        <ol>
          {setupSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
