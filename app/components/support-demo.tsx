"use client";

import { FormEvent, useRef, useState } from "react";
import type { SupportResponse } from "@/lib/support-types";

type Message = { id: number; role: "user" | "assistant"; text: string };

type Scenario = {
  label: string;
  helper: string;
  message: string;
  icon: IconName;
  simulateFailure?: boolean;
};

const scenarios: readonly Scenario[] = [
  { label: "Track Order", helper: "Successful lookup", message: "Where is my order QC-88012?", icon: "package" },
  { label: "Ask FAQ", helper: "Approved demo content", message: "What are your shipping times?", icon: "book" },
  { label: "Request Return", helper: "Safe escalation", message: "I want to return order QC-88012.", icon: "return" },
  { label: "Talk to Human", helper: "Direct handoff", message: "I want to talk to a human.", icon: "person" },
  { label: "Simulate API Failure", helper: "Fail-safe behavior", message: "Where is my order QC-88012?", icon: "alert", simulateFailure: true },
];

const initialMessages: Message[] = [{ id: 1, role: "assistant", text: "Hi — I’m the QuickCart support demo. Ask about an order, a common FAQ, or request a person." }];

export function SupportDemo() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [trace, setTrace] = useState<SupportResponse | null>(null);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const nextId = useRef(2);

  async function sendMessage(message: string, simulateFailure = false) {
    const trimmed = message.trim();
    if (!trimmed || isPending) return;
    setInput("");
    setIsPending(true);
    setMessages((current) => [...current, { id: nextId.current++, role: "user", text: trimmed }]);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, simulateFailure }),
      });
      if (!response.ok) throw new Error("Support route failed");
      const result = (await response.json()) as SupportResponse;
      setTrace(result);
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", text: result.reply }]);
    } catch {
      const fallback: SupportResponse = {
        reply: "The support workflow is unavailable. Please try again or contact a support agent.",
        trace: [
          { label: "Outcome", value: "WORKFLOW_FAILURE", tone: "warning" },
          { label: "Decision", value: "HUMAN_HANDOFF", tone: "warning" },
        ],
      };
      setTrace(fallback);
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", text: fallback.reply }]);
    } finally {
      setIsPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <>
      <section aria-labelledby="scenarios-title" className="scenario-section">
        <div className="section-kicker-row">
          <div><p className="eyebrow">Quick scenarios</p><h2 id="scenarios-title">Try the decision paths</h2></div>
          <p className="scenario-hint">Each path is deterministic and inspectable.</p>
        </div>
        <div className="scenario-grid">
          {scenarios.map((scenario) => (
            <button type="button" className={`scenario-button ${scenario.simulateFailure ? "scenario-danger" : ""}`} key={scenario.label} disabled={isPending} onClick={() => void sendMessage(scenario.message, Boolean(scenario.simulateFailure))}>
              <span className="scenario-icon" aria-hidden="true"><Icon name={scenario.icon} /></span>
              <span><strong>{scenario.label}</strong><small>{scenario.helper}</small></span>
              <span className="scenario-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>

      <section className="workspace" aria-label="Support automation demo">
        <div className="panel chat-panel">
          <div className="panel-header">
            <div className="agent-identity">
              <span className="agent-mark"><Icon name="spark" /></span>
              <div><h2>Customer conversation</h2><p><span className="online-dot" /> Automation online</p></div>
            </div>
            <span className="channel-badge">SIMULATED WHATSAPP</span>
          </div>

          <div className="messages" aria-live="polite">
            <div className="day-label"><span>Today</span></div>
            {messages.map((message) => (
              <div className={`message-row ${message.role}`} key={message.id}>
                {message.role === "assistant" && <span className="message-avatar"><Icon name="spark" /></span>}
                <div className="message-wrap">
                  <p className="message-sender">{message.role === "assistant" ? "QuickCart Automation" : "You"}</p>
                  <div className="message-bubble">{message.text}</div>
                </div>
              </div>
            ))}
            {isPending && <div className="message-row assistant"><span className="message-avatar"><Icon name="spark" /></span><div className="typing" aria-label="Processing message"><i /><i /><i /></div></div>}
          </div>

          <form className="composer" onSubmit={onSubmit}>
            <label htmlFor="support-message" className="sr-only">Customer message</label>
            <input id="support-message" value={input} onChange={(event) => setInput(event.target.value)} disabled={isPending} maxLength={1000} placeholder="Type a customer message…" />
            <button type="submit" disabled={isPending || !input.trim()} aria-label="Send message"><Icon name="send" /></button>
          </form>
          <p className="composer-note"><Icon name="shield" /> Demo only · Messages are not stored</p>
        </div>

        <aside className="panel trace-panel" aria-labelledby="trace-title">
          <div className="panel-header trace-header">
            <div><p className="eyebrow">Live explainability</p><h2 id="trace-title">Decision Trace</h2></div>
            <span className="trace-status"><span /> {trace ? "PROCESSED" : "READY"}</span>
          </div>
          <div className="trace-body">
            {!trace ? (
              <div className="trace-empty"><span><Icon name="route" /></span><h3>No message processed yet</h3><p>Choose a quick scenario or send a message to inspect the routing decision.</p></div>
            ) : (
              <>
                <div className="trace-list">
                  {trace.trace.map((entry, index) => <div className="trace-row" key={`${entry.label}-${index}`}><span>{entry.label}</span><strong className={entry.tone ? `tone-${entry.tone}` : ""}>{entry.value}</strong></div>)}
                </div>
                {trace.handoff && (
                  <div className="handoff-card">
                    <div className="handoff-title"><span><Icon name="person" /></span><div><p>Structured handoff</p><small>Ready for agent inbox</small></div></div>
                    <dl>
                      <div><dt>Customer</dt><dd>{trace.handoff.customer}</dd></div>
                      <div><dt>Intent</dt><dd>{trace.handoff.intent}</dd></div>
                      <div><dt>Reason</dt><dd>{trace.handoff.reason}</dd></div>
                      {trace.handoff.orderId && <div><dt>Order</dt><dd>{trace.handoff.orderId}</dd></div>}
                      <div className="summary"><dt>Summary</dt><dd>{trace.handoff.conversationSummary}</dd></div>
                    </dl>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="trace-footer"><Icon name="lock" /> Business facts remain system-sourced</div>
        </aside>
      </section>
    </>
  );
}

type IconName = "package" | "book" | "return" | "person" | "alert" | "spark" | "send" | "shield" | "route" | "lock";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    package: <><path d="m3.5 6 8.5 4.8L20.5 6M12 21V10.8"/><path d="m3.5 6 8.5-4.8L20.5 6v10L12 21l-8.5-5V6Z"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
    return: <><path d="m9 14-4-4 4-4"/><path d="M5 10h9a5 5 0 0 1 5 5v3"/></>,
    person: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    alert: <><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.6 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/></>,
    spark: <><path d="m12 3-1 4a5 5 0 0 1-4 4l-4 1 4 1a5 5 0 0 1 4 4l1 4 1-4a5 5 0 0 1 4-4l4-1-4-1a5 5 0 0 1-4-4l-1-4Z"/><path d="m5 3-.3 1.2A2 2 0 0 1 3.2 5.7L2 6l1.2.3a2 2 0 0 1 1.5 1.5L5 9l.3-1.2a2 2 0 0 1 1.5-1.5L8 6l-1.2-.3a2 2 0 0 1-1.5-1.5L5 3Z"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    shield: <><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z"/><path d="m9 12 2 2 4-4"/></>,
    route: <><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M8.5 17.5 15.5 6.5M6 5h5M6 5v5"/></>,
    lock: <><rect width="16" height="11" x="4" y="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
