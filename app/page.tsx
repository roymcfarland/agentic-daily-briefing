import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

const dateline = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());
const currentYear = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  year: "numeric",
}).format(new Date());

type Topic = {
  id: string;
  num: string;
  title: string;
  blurb: string;
  variant: "feature" | "tall" | "wide" | "standard";
  tag?: string;
};

const topics: Topic[] = [
  {
    id: "ai",
    num: "01",
    title: "AI",
    blurb:
      "Frontier model releases, infra deals, and the policy moves that decide who builds the next decade.",
    variant: "feature",
    tag: "Core beat",
  },
  {
    id: "markets",
    num: "02",
    title: "Markets",
    blurb:
      "Rates, liquidity, and the macro currents that quietly reprice every other decision.",
    variant: "tall",
  },
  {
    id: "business",
    num: "03",
    title: "Business",
    blurb: "Deals, earnings, and the operator-level moves worth borrowing from.",
    variant: "standard",
  },
  {
    id: "cpg",
    num: "04",
    title: "CPG & Startups",
    blurb:
      "Brand launches, fundraises, and shelf-level signals across consumer.",
    variant: "standard",
  },
  {
    id: "cannabis",
    num: "05",
    title: "Cannabis",
    blurb:
      "Regulatory shifts, capital flows, and category dynamics across the legal market.",
    variant: "wide",
    tag: "Elevated Organics",
  },
  {
    id: "chicago",
    num: "06",
    title: "Chicago",
    blurb: "City hall, the river, and the operators reshaping it.",
    variant: "standard",
  },
  {
    id: "colorado",
    num: "07",
    title: "Colorado",
    blurb: "Front Range business, water, and policy that ripple west.",
    variant: "standard",
  },
  {
    id: "asymmetric",
    num: "08",
    title: "Asymmetric Upside",
    blurb:
      "One contrarian wedge per morning — small probability, outsized payoff.",
    variant: "wide",
    tag: "House special",
  },
  {
    id: "sports",
    num: "09",
    title: "Sports",
    blurb: "Only when the result actually changes the week ahead.",
    variant: "standard",
  },
];

const pipeline = [
  {
    no: "01",
    glyph: "C",
    title: "Collect",
    body: (
      <>
        Live RSS sweeps across nine beats plus a same-day pull from{" "}
        <em>Workflow Blueprint</em>, all gathered fresh at send time.
      </>
    ),
  },
  {
    no: "02",
    glyph: "F",
    title: "Filter",
    body: (
      <>
        Duplicates collapsed, low-signal items dropped, and topics weighted
        against your real-world decisions.
      </>
    ),
  },
  {
    no: "03",
    glyph: "R",
    title: "Rank",
    body: (
      <>
        Each story is scored for implication, freshness, and decision
        relevance — then labeled <em>Signal</em> or <em>Noise</em>.
      </>
    ),
  },
  {
    no: "04",
    glyph: "D",
    title: "Deliver",
    body: (
      <>
        Sent at 6:00 AM Mountain via Resend, fail-closed and idempotent so a
        retry never doubles a send.
      </>
    ),
  },
];

const anatomy = [
  {
    num: "I",
    title: "Today on the calendar",
    body: "Same-day commitments, owed work, and meetings — sourced from your Workflow Blueprint daily summary so the day starts already triaged.",
  },
  {
    num: "II",
    title: "Nine beats, ranked",
    body: "Two stories per topic, each labeled Signal or Noise, each annotated with what would make it matter for your week.",
  },
  {
    num: "III",
    title: "One to watch, one to ignore",
    body: "A single quiet story that may compound, paired with the loud one you can safely tune out today.",
  },
  {
    num: "IV",
    title: "The contrarian take",
    body: "One short, sharp position you would not get anywhere else — written to be argued with, not agreed with.",
  },
];

function Logo({ children }: { children: ReactNode }) {
  return <span className="brand-mark">{children}</span>;
}

export default function HomePage() {
  return (
    <div className="page">
      <header className="nav">
        <div className="container nav-inner">
          <a href="/" className="brand" aria-label="Daily Morning Brief">
            <Logo>R</Logo>
            <span>
              The Daily<span className="italic"> Brief</span>
            </span>
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="#beats">Beats</a>
            <a href="#how">How it works</a>
            <a href="#anatomy">Anatomy</a>
            <a href="#manifesto">Manifesto</a>
          </nav>
          <a href="#subscribe" className="nav-cta">
            Get the brief
            <span aria-hidden>→</span>
          </a>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="container">
            <div className="dateline">
              <div className="dateline-left">
                <span className="live-dot" aria-hidden />
                <span>Vol. 02 · Issue 117</span>
                <span aria-hidden>•</span>
                <span>{dateline}</span>
              </div>
              <div className="dateline-right">
                <span>Denver · 6:00 AM MT</span>
                <span aria-hidden>•</span>
                <span>One delivery, daily</span>
              </div>
            </div>

            <div className="hero-grid">
              <div>
                <span className="eyebrow">A daily decision brief</span>
                <h1>
                  Wake up
                  <br />
                  <span className="accent italic">already</span>{" "}
                  <span className="underline">briefed.</span>
                </h1>
                <p className="hero-lede">
                  An autonomous morning brief that pulls live signal from nine
                  beats, drains the noise, and lands one decision-grade email
                  in your inbox before the first meeting.
                </p>

                <div className="hero-actions">
                  <a className="btn btn-primary" href="#subscribe">
                    Subscribe — it&apos;s free
                    <span aria-hidden>→</span>
                  </a>
                  <a className="btn btn-ghost" href="#anatomy">
                    See a sample
                  </a>
                </div>

                <div className="hero-meta">
                  <div>
                    <strong>9</strong>
                    Beats covered
                  </div>
                  <div className="hero-meta-divider" aria-hidden />
                  <div>
                    <strong>6:00</strong>
                    AM Mountain, daily
                  </div>
                  <div className="hero-meta-divider" aria-hidden />
                  <div>
                    <strong>~4 min</strong>
                    Read time
                  </div>
                </div>
              </div>

              {/* Email preview */}
              <div className="preview" aria-hidden>
                <div className="preview-stack">
                  <article className="preview-card">
                    <div className="preview-window">
                      <div className="preview-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="preview-from">
                        brief@roymcfarland.news
                      </div>
                    </div>

                    <div className="preview-subject">
                      <h3>
                        Brief for <span className="italic">Monday</span>
                      </h3>
                      <span className="preview-time">06:00 MT</span>
                    </div>
                    <div className="preview-meta">
                      Apr 27 · 9 beats · 18 stories ranked · 4 surfaced
                    </div>

                    <div className="preview-section">
                      <div className="preview-section-head">
                        <h4>AI</h4>
                        <span className="tag tag-signal">Signal</span>
                      </div>
                      <p className="preview-story">
                        Anthropic&apos;s new enterprise tier reprices every
                        agentic stack quietly built on it.{" "}
                        <em>Why it matters: contract resets by Q3.</em>
                      </p>
                    </div>

                    <div className="preview-section">
                      <div className="preview-section-head">
                        <h4>Markets</h4>
                        <span className="tag tag-signal">Signal</span>
                      </div>
                      <p className="preview-story">
                        Two-year drifts under 3.6% as expectations re-anchor —
                        small caps perk before the consumer print.
                      </p>
                    </div>

                    <div className="preview-section">
                      <div className="preview-section-head">
                        <h4>Cannabis</h4>
                        <span className="tag tag-accent">Operator</span>
                      </div>
                      <p className="preview-story">
                        Illinois craft license appeals clear — shelf
                        opportunity opens for regional CPG with distro.
                      </p>
                    </div>

                    <div className="preview-section">
                      <div className="preview-section-head">
                        <h4>Chicago</h4>
                        <span className="tag tag-noise">Noise</span>
                      </div>
                      <p className="preview-story">
                        Loop hotel deal headline — capital stack hasn&apos;t
                        moved, ignore today.
                      </p>
                    </div>

                    <div className="preview-rules">
                      <div className="preview-rule">
                        <div className="preview-rule-label">Watch</div>
                        <div className="preview-rule-value">
                          Quiet PBM rule
                        </div>
                      </div>
                      <div className="preview-rule">
                        <div className="preview-rule-label">Ignore</div>
                        <div className="preview-rule-value">
                          Earnings beat noise
                        </div>
                      </div>
                      <div className="preview-rule">
                        <div className="preview-rule-label">Contrarian</div>
                        <div className="preview-rule-value">
                          Boring infra wins
                        </div>
                      </div>
                    </div>

                    <div className="preview-foot">
                      <span>Workflow Blueprint synced 6:59 AM</span>
                      <span>Idempotent · single send</span>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="marquee" aria-hidden>
          <div className="marquee-track">
            <span>AI</span>
            <span>Markets</span>
            <span>Business</span>
            <span>CPG &amp; Startups</span>
            <span>Cannabis</span>
            <span>Chicago</span>
            <span>Colorado</span>
            <span>Asymmetric Upside</span>
            <span>Sports when it matters</span>
            <span>One contrarian take</span>
            <span>One thing to watch</span>
            <span>One thing to ignore</span>
            <span>AI</span>
            <span>Markets</span>
            <span>Business</span>
            <span>CPG &amp; Startups</span>
            <span>Cannabis</span>
            <span>Chicago</span>
            <span>Colorado</span>
            <span>Asymmetric Upside</span>
            <span>Sports when it matters</span>
            <span>One contrarian take</span>
            <span>One thing to watch</span>
            <span>One thing to ignore</span>
          </div>
        </div>

        {/* BEATS */}
        <section className="section" id="beats">
          <div className="container">
            <div className="section-head">
              <div className="title">
                <span className="eyebrow">The beats</span>
                <h2>
                  Nine threads,
                  <br />
                  <span className="italic" style={{ color: "var(--accent)" }}>
                    one coherent
                  </span>{" "}
                  morning.
                </h2>
              </div>
              <p className="desc">
                Every beat is curated against a single test: does it change a
                decision you&apos;ll make this week? If the answer is no, it
                doesn&apos;t make the brief.
              </p>
            </div>

            <div className="bento">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={`bento-card ${topic.variant}`}
                >
                  <div className="bento-card-num">{topic.num}</div>
                  <div>
                    <h3>
                      {topic.id === "ai" ? (
                        <>
                          The{" "}
                          <span className="accent italic">AI</span>{" "}
                          beat, written for
                          operators.
                        </>
                      ) : (
                        topic.title
                      )}
                    </h3>
                    <p>{topic.blurb}</p>
                  </div>
                  {topic.tag ? (
                    <span className="tag tag-accent bento-card-tag">
                      {topic.tag}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section" id="how">
          <div className="container">
            <div className="section-head">
              <div className="title">
                <span className="eyebrow">How it works</span>
                <h2>
                  A pipeline,
                  <br />
                  not a newsletter.
                </h2>
              </div>
              <p className="desc">
                Built on Next.js, Vercel Cron, Workflow Blueprint, and Resend.
                Every step is observable, idempotent, and fail-closed — so the
                brief either lands clean or doesn&apos;t land at all.
              </p>
            </div>

            <div className="pipeline">
              {pipeline.map((step) => (
                <div className="pipeline-step" key={step.no}>
                  <div className="icon" aria-hidden>
                    {step.glyph}
                  </div>
                  <div className="step-no">{step.no} · Stage</div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ANATOMY */}
        <section className="section" id="anatomy">
          <div className="container">
            <div className="section-head">
              <div className="title">
                <span className="eyebrow">Anatomy of an issue</span>
                <h2>
                  Four sections.
                  <br />
                  <span
                    className="italic"
                    style={{ color: "var(--accent)" }}
                  >
                    Every morning.
                  </span>
                </h2>
              </div>
              <p className="desc">
                The shape never changes. The signal does. That&apos;s the
                point — you learn to read it the way you read a familiar
                street.
              </p>
            </div>

            <div className="anatomy">
              <ol className="anatomy-list">
                {anatomy.map((item) => (
                  <li className="anatomy-item" key={item.num}>
                    <div className="num">§ {item.num}</div>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <aside className="preview" aria-hidden>
                <div className="preview-stack" style={{ transform: "rotate(-1.5deg)" }}>
                  <article className="preview-card">
                    <div className="preview-window">
                      <div className="preview-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="preview-from">
                        Issue 116 · archive
                      </div>
                    </div>

                    <div className="preview-subject">
                      <h3>
                        On the <span className="italic">desk</span>
                      </h3>
                      <span className="preview-time">§ I</span>
                    </div>
                    <p className="preview-story" style={{ marginBottom: 14 }}>
                      Three calls before noon, one promised draft, and the
                      Elevated Organics distro check-in moved earlier — start
                      with the draft.
                    </p>

                    <div className="preview-section">
                      <div className="preview-section-head">
                        <h4>Asymmetric Upside</h4>
                        <span className="tag tag-signal">Signal</span>
                      </div>
                      <p className="preview-story">
                        A small TX co. just published the cleanest open-source
                        evals harness yet — buy the picks-and-shovels read
                        here, not the model.
                      </p>
                    </div>

                    <div className="preview-section">
                      <div className="preview-section-head">
                        <h4>Contrarian take</h4>
                        <span className="tag tag-accent">§ IV</span>
                      </div>
                      <p className="preview-story">
                        The flight to &ldquo;agents&rdquo; is mostly a flight
                        from accountability. The teams that will win are the
                        ones still willing to ship deterministic software.
                      </p>
                    </div>

                    <div className="preview-foot">
                      <span>Brightline Labs · house view</span>
                      <span>~4 min read</span>
                    </div>
                  </article>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* MANIFESTO */}
        <section className="section manifesto" id="manifesto">
          <div className="container">
            <span className="eyebrow">House rules</span>
            <p className="manifesto-quote">
              We <span className="strike">summarize the news.</span>{" "}
              <span className="accent">We rank decisions.</span> One brief, one
              delivery, one read — every morning at six.
            </p>
            <div className="manifesto-meta">
              <span>Written for operators</span>
              <span aria-hidden>·</span>
              <span>Engineered for retries</span>
              <span aria-hidden>·</span>
              <span>Designed to be read in four minutes</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section" id="subscribe">
          <div className="container">
            <div className="cta">
              <div className="cta-inner">
                <div>
                  <span
                    className="eyebrow"
                    style={{ color: "#ffb380" }}
                  >
                    Subscribe
                  </span>
                  <h2 style={{ marginTop: 14 }}>
                    Start tomorrow at{" "}
                    <span className="accent">six</span>.
                  </h2>
                  <p>
                    One opinionated brief. No tracking pixels, no upsell, no
                    second send. If a morning has nothing worth your time,
                    you&apos;ll hear that too.
                  </p>
                  <div className="cta-actions" style={{ marginTop: 28 }}>
                    <a
                      className="btn btn-on-dark-primary"
                      href="mailto:hello@roymcfarland.news?subject=Subscribe%20me%20to%20the%20brief"
                    >
                      Subscribe by email
                      <span aria-hidden>→</span>
                    </a>
                    <a
                      className="btn btn-on-dark-ghost"
                      href="https://www.roymcfarland.news"
                    >
                      Read latest issue
                    </a>
                  </div>
                </div>

                <div className="cta-clock">
                  <div className="cta-clock-label">Next delivery</div>
                  <div className="cta-clock-time">06:00</div>
                  <div className="cta-clock-tz">Denver · America/Denver</div>
                  <p className="cta-clock-rule">
                    Vercel Cron fires once daily at 12:00 UTC. The brief is
                    idempotent, fail-closed, and skips itself when nothing has
                    changed since the last send.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">The Daily Brief</div>
          <div className="footer-links">
            <a href="#beats">Beats</a>
            <a href="#how">How it works</a>
            <a href="#anatomy">Anatomy</a>
            <a href="mailto:hello@roymcfarland.news">Contact</a>
          </div>
          <div className="footer-credit">
            © {currentYear} Roy McFarland · Made by{" "}
            <a href="https://brightline.io/" target="_blank" rel="noreferrer">
              Brightline Labs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
