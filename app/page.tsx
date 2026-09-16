import { SupportDemo } from "./components/support-demo";

const assumptions = [
  "The supplied order API is the source of truth for order status.",
  "The deployed demo uses a mock adapter because the supplied endpoint is on a private network.",
  "No approved FAQ source was supplied, so FAQ content is illustrative.",
  "No Returns API was supplied, so transactional returns are escalated.",
  "This prototype does not persist customer conversations.",
  "WhatsApp transport is simulated by the chat UI.",
  "Production requires privacy and PII controls.",
];

const productionNotes = [
  "WhatsApp Cloud API integration", "Webhook verification", "Idempotency & duplicate handling",
  "Conversation state", "Approved knowledge source", "Returns API integration",
  "Agent inbox / CRM integration", "Monitoring & alerting", "PII controls",
  "Multilingual support & evaluation",
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <div className="brand-mark" aria-hidden="true"><span>Q</span></div>
          <div className="brand-copy">
            <div className="title-row"><h1>QuickCart Support Automation</h1><span className="demo-badge">DEMO</span></div>
            <p>Production-minded proof of concept for WhatsApp customer support automation.</p>
          </div>
          <div className="header-proof"><span /><div><strong>Deterministic routing</strong><small>No external AI or persistence</small></div></div>
        </div>
      </header>

      <div className="shell page-content">
        <SupportDemo />

        <section className="architecture-section" aria-labelledby="architecture-title">
          <div className="section-heading architecture-heading">
            <div><p className="eyebrow">System design</p><h2 id="architecture-title">Architecture</h2></div>
            <p>Every message follows the same observable path: understand the request, consult only an approved system, then answer or escalate safely.</p>
          </div>
          <div className="architecture-diagram" aria-label="QuickCart support automation architecture diagram">
            <div className="diagram-ingress">
              <DiagramNode index="01" title="Incoming message" detail="Simulated WhatsApp" icon="◎" />
              <span className="diagram-line vertical" aria-hidden="true" />
              <DiagramNode index="02" title="Normalize" detail="Clean text · extract order ID / phone" icon="⌁" />
            </div>
            <span className="diagram-line horizontal" aria-hidden="true" />
            <div className="diagram-router">
              <span className="diagram-index">03 · DECISION POINT</span>
              <strong>Intent router</strong>
              <p>Deterministic rules classify the message. No LLM and no invented business facts.</p>
              <div className="intent-tags"><span>ORDER_STATUS</span><span>FAQ</span><span>RETURN</span><span>HUMAN / UNKNOWN</span></div>
            </div>
            <span className="diagram-line horizontal" aria-hidden="true" />
            <div className="diagram-outcomes">
              <OutcomeCard tone="green" title="Order status" detail="OrderService → verified status or human" />
              <OutcomeCard tone="blue" title="FAQ" detail="Illustrative approved content or human" />
              <OutcomeCard tone="amber" title="Return request" detail="Human handoff · future Returns API" />
              <OutcomeCard tone="slate" title="Human / unknown" detail="Structured handoff to support" />
            </div>
          </div>
          <div className="architecture-boundaries">
            <div><span>TRUSTED SYSTEM</span><strong>OrderService</strong><small>Mock by default · HTTP adapter available</small></div>
            <div><span>SAFE KNOWLEDGE</span><strong>Demo FAQ</strong><small>Shipping · hours · contact · return policy</small></div>
            <div><span>ESCALATION OBJECT</span><strong>Human handoff</strong><small>Customer · intent · reason · order context</small></div>
          </div>
        </section>

        <section className="tech-stack-section" aria-labelledby="tech-stack-title">
          <div className="tech-stack-intro"><p className="eyebrow">Implementation</p><h2 id="tech-stack-title">Tech stack</h2><p>Small surface area, deployable by default, and easy to replace piece by piece in production.</p></div>
          <div className="stack-grid">
            <StackItem label="Next.js 16" detail="App Router + static homepage" />
            <StackItem label="TypeScript" detail="Typed routing and service contracts" />
            <StackItem label="Tailwind CSS" detail="Responsive enterprise UI" />
            <StackItem label="Route Handlers" detail="POST /api/support" />
            <StackItem label="OrderService" detail="Mock + HTTP adapters" />
            <StackItem label="Vercel-ready" detail="No DB, auth, or external AI" />
          </div>
        </section>

        <section className="responsibility-section" aria-labelledby="responsibility-title">
          <div className="responsibility-intro">
            <p className="eyebrow">Clear boundaries</p>
            <h2 id="responsibility-title">Who decides what?</h2>
            <p>AI should understand language — never invent business facts.</p>
          </div>
          <div className="responsibility-grid">
            <Responsibility title="AI / language layer" marker="01" items={["Understand customer messages", "Identify intent", "Extract entities", "Generate natural responses"]} />
            <Responsibility title="Deterministic systems" marker="02" featured items={["Actual order status", "Refund eligibility", "Transaction execution", "Business rules"]} />
            <Responsibility title="Human" marker="03" items={["Disputes", "Exceptions", "Unsupported actions", "Explicit human requests"]} />
          </div>
        </section>

        <section className="details-grid">
          <article className="detail-card">
            <div className="detail-heading"><span>01</span><div><p className="eyebrow">Boundaries</p><h2>Assumptions</h2></div></div>
            <ol className="assumption-list">{assumptions.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>)}</ol>
          </article>
          <article className="detail-card">
            <div className="detail-heading"><span>02</span><div><p className="eyebrow">Path to production</p><h2>Production Notes</h2></div></div>
            <div className="production-list">{productionNotes.map((item) => <div key={item}><span>✓</span>{item}</div>)}</div>
          </article>
        </section>

        <section className="metric-card" aria-labelledby="metric-title">
          <div className="metric-main"><p className="eyebrow">Proposed pilot metric</p><h2 id="metric-title">Eligible Order Status<br />Containment Rate</h2><p className="metric-note">A target for a controlled pilot — not a claim based on this incomplete sample.</p></div>
          <div className="metric-formula"><span>successfully automated eligible order-status conversations</span><i /><span>total eligible order-status conversations</span></div>
          <div className="metric-target"><strong>90%</strong><span>Pilot target</span><small>When OrderService is healthy and the order is unambiguous.</small></div>
          <div className="metric-safety"><strong>0</strong><span>Fabricated order statuses</span><small>Non-negotiable safety requirement</small></div>
        </section>
      </div>

      <footer><div className="shell"><span>QuickCart Support Automation · Interview demo</span><span>Next.js · TypeScript · No external AI</span></div></footer>
    </main>
  );
}

function DiagramNode({ index, title, detail, icon }: { index: string; title: string; detail: string; icon: string }) {
  return <div className="diagram-node"><span className="diagram-node-icon">{icon}</span><div><span className="diagram-index">{index}</span><strong>{title}</strong><small>{detail}</small></div></div>;
}

function OutcomeCard({ tone, title, detail }: { tone: string; title: string; detail: string }) {
  return <div className={`outcome-card ${tone}`}><span className="outcome-dot" /><div><strong>{title}</strong><small>{detail}</small></div><span className="outcome-arrow">↗</span></div>;
}

function StackItem({ label, detail }: { label: string; detail: string }) {
  return <div className="stack-item"><span className="stack-check">✓</span><div><strong>{label}</strong><small>{detail}</small></div></div>;
}

function Responsibility({ title, marker, items, featured = false }: { title: string; marker: string; items: string[]; featured?: boolean }) {
  return <article className={`responsibility-card ${featured ? "featured" : ""}`}><div><span>{marker}</span><h3>{title}</h3></div><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>;
}
