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
          <div className="section-heading">
            <p className="eyebrow">System design</p>
            <h2 id="architecture-title">Architecture</h2>
            <p>Language is interpreted at the edge. Business facts stay behind typed, replaceable services.</p>
          </div>
          <div className="flow" aria-label="Support routing flow">
            <FlowCard step="01" title="Incoming message" detail="Simulated WhatsApp" />
            <FlowArrow />
            <FlowCard step="02" title="Normalize" detail="Clean & extract entities" />
            <FlowArrow />
            <FlowCard step="03" title="Intent router" detail="Deterministic rules" accent />
            <FlowArrow />
            <div className="branch-grid">
              <FlowCard step="A" title="Order status" detail="OrderService → answer / human" />
              <FlowCard step="B" title="FAQ" detail="Approved knowledge → answer / human" />
              <FlowCard step="C" title="Return" detail="Human → future Returns API" />
              <FlowCard step="D" title="Human / unknown" detail="Human support" />
            </div>
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

function FlowCard({ step, title, detail, accent = false }: { step: string; title: string; detail: string; accent?: boolean }) {
  return <div className={`flow-card ${accent ? "accent" : ""}`}><span>{step}</span><strong>{title}</strong><small>{detail}</small></div>;
}

function FlowArrow() { return <div className="flow-arrow" aria-hidden="true"><span>→</span></div>; }

function Responsibility({ title, marker, items, featured = false }: { title: string; marker: string; items: string[]; featured?: boolean }) {
  return <article className={`responsibility-card ${featured ? "featured" : ""}`}><div><span>{marker}</span><h3>{title}</h3></div><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>;
}
