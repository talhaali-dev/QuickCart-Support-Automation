import { getOrderService, type OrderService } from "./order-service";
import { interpretMessageDetailed, type DetailedInterpretation } from "../src/lib/messageInterpreter";
import type { Handoff, Intent, Order, SupportResponse, TraceItem, TraceSection } from "./support-types";

const DEMO_FAQS = [
  { id: "SHIPPING", patterns: ["shipping", "delivery time", "how long"], answer: "Demo FAQ: Standard shipping typically takes 3–5 business days after dispatch." },
  { id: "HOURS", patterns: ["hours", "open", "opening"], answer: "Demo FAQ: Support hours are Monday–Friday, 9:00 AM–5:00 PM local time." },
  { id: "CONTACT", patterns: ["contact", "email", "phone number"], answer: "Demo FAQ: You can reach the support team through the contact channel listed in your order confirmation." },
  { id: "RETURN_POLICY", patterns: ["return policy", "returns policy"], answer: "Demo FAQ: Unused items may be eligible for return within 30 days. A support agent must confirm eligibility before any return is started." },
] as const;

type ProcessOptions = { simulateFailure?: boolean; customer?: string; service?: OrderService };

export async function processSupportMessage(rawMessage: string, options: ProcessOptions = {}): Promise<SupportResponse> {
  const message = rawMessage.trim();
  const interpreted = await interpretMessageDetailed(message);
  const { interpretation } = interpreted;
  const customer = options.customer ?? "Web demo visitor";
  const understanding = understandingTrace(interpreted);

  if (interpretation.intent === "RETURN_REQUEST") {
    return handoffResponse(
      "I can’t execute a return because no transactional returns system is connected. I’ll route this to a support agent with the order context.",
      customer, interpretation.intent, "RETURNS_API_NOT_AVAILABLE", message, interpretation.orderId,
      understanding,
      executionTrace("No transaction executed", "NOT_EXECUTED"),
      decisionTrace("Handoff requested", "YES", "RETURNS_API_NOT_AVAILABLE"),
    );
  }

  if (interpretation.intent === "HUMAN_REQUEST") {
    return handoffResponse(
      "Of course — I’ll route this conversation to a support agent.",
      customer, interpretation.intent, "CUSTOMER_REQUESTED_HUMAN", message, interpretation.orderId,
      understanding,
      executionTrace("No business tool called", "NOT_EXECUTED"),
      decisionTrace("Handoff requested", "YES", "CUSTOMER_REQUESTED_HUMAN"),
    );
  }

  if (interpretation.intent === "ORDER_STATUS") {
    return handleOrderStatus(message, customer, interpretation, options, understanding);
  }

  if (interpretation.intent === "FAQ") {
    const normalized = message.toLowerCase();
    const faq = DEMO_FAQS.find((entry) =>
      entry.id.toLowerCase() === interpretation.faqTopic?.toLowerCase() || entry.patterns.some((pattern) => normalized.includes(pattern)),
    );
    if (faq) {
      return {
        reply: faq.answer,
        trace: [understanding, executionTrace("Approved demo FAQ", "DEMO_CONTENT"), decisionTrace("Reply sent", "NO", "Illustrative content only")],
      };
    }
  }

  return handoffResponse(
    "I don’t have approved information to answer that safely. I’ll route your message to a support agent.",
    customer, "UNKNOWN", "NO_APPROVED_KNOWLEDGE", message, interpretation.orderId,
    understanding,
    executionTrace("No approved knowledge match", "NOT_EXECUTED"),
    decisionTrace("Handoff requested", "YES", "NO_APPROVED_KNOWLEDGE"),
  );
}

async function handleOrderStatus(message: string, customer: string, interpretation: DetailedInterpretation["interpretation"], options: ProcessOptions, understanding: TraceSection): Promise<SupportResponse> {
  const service = options.service ?? getOrderService();
  const phone = extractPhone(message);
  const orderId = interpretation.orderId;

  if (!orderId && !phone) {
    return handoffResponse(
      "I couldn’t identify an order unambiguously. I’ll route this to a support agent who can verify the details securely.",
      customer, "ORDER_STATUS", "ORDER_NOT_IDENTIFIED", message, undefined, understanding,
      executionTrace("OrderService", "AMBIGUOUS"), decisionTrace("Handoff requested", "YES", "ORDER_NOT_IDENTIFIED"),
    );
  }

  try {
    if (options.simulateFailure) throw new Error("Simulated order API failure");
    let order: Order | null = null;
    if (orderId) order = await service.findByOrderId(orderId);
    else if (phone) {
      const matches = await service.findByPhone(phone);
      if (matches.length !== 1) {
        return handoffResponse(
          matches.length > 1 ? "I found multiple orders for that phone number, so I won’t guess which one you mean. I’ll route this to a support agent." : "I couldn’t find a matching order, so I won’t provide an unverified status. I’ll route this to a support agent.",
          customer, "ORDER_STATUS", matches.length > 1 ? "MULTIPLE_ORDERS_FOUND" : "ORDER_NOT_FOUND", message, undefined, understanding,
          executionTrace("OrderService", matches.length > 1 ? "AMBIGUOUS" : "NOT_FOUND"), decisionTrace("Handoff requested", "YES", matches.length > 1 ? "MULTIPLE_ORDERS_FOUND" : "ORDER_NOT_FOUND"),
        );
      }
      order = matches[0];
    }

    if (!order) {
      return handoffResponse(
        "I couldn’t find a matching order, so I won’t provide an unverified status. I’ll route this to a support agent.",
        customer, "ORDER_STATUS", "ORDER_NOT_FOUND", message, orderId, understanding,
        executionTrace("OrderService", "NOT_FOUND"), decisionTrace("Handoff requested", "YES", "ORDER_NOT_FOUND"),
      );
    }

    return {
      reply: formatOrderReply(order),
      trace: [understanding, executionTrace("OrderService · " + service.sourceName, "SUCCESS", order.orderId), decisionTrace("Reply sent", "NO", "Verified status returned by OrderService")],
    };
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    const reason = isTimeout ? "ORDER_SERVICE_TIMEOUT" : "ORDER_API_UNAVAILABLE";
    return handoffResponse(
      "I’m having trouble accessing the order system right now. I’ll route this to a support agent so they can check it for you.",
      customer, "ORDER_STATUS", reason, message, orderId, understanding,
      executionTrace("OrderService", isTimeout ? "TIMEOUT" : "API_FAILURE"), decisionTrace("Handoff requested", "YES", reason),
    );
  }
}

function understandingTrace({ interpretation, method }: DetailedInterpretation): TraceSection {
  return section("Understanding", [
    item("Intent", interpretation.intent),
    item("Extracted order ID", interpretation.orderId ?? "NONE"),
    item("Language", interpretation.language),
    item("Confidence", interpretation.confidence.toFixed(2)),
    item("Method", method),
  ]);
}

function executionTrace(tool: string, result: string, orderId?: string): TraceSection {
  return section("Execution", [item("Tool", tool), ...(orderId ? [item("Order ID", orderId)] : []), item("Result", result, result === "SUCCESS" || result === "DEMO_CONTENT" ? "success" : result === "NOT_EXECUTED" ? "default" : "warning")]);
}

function decisionTrace(reply: string, handoff: string, reason: string): TraceSection {
  return section("Decision", [item("Reply", reply), item("Human handoff", handoff, handoff === "YES" ? "warning" : "success"), item("Reason", reason)]);
}

function section(title: TraceSection["title"], items: TraceItem[]): TraceSection { return { title, items }; }
function item(label: string, value: string, tone: TraceItem["tone"] = "default"): TraceItem { return { label, value, tone }; }

function handoffResponse(reply: string, customer: string, intent: Intent, reason: string, message: string, orderId: string | null | undefined, understanding: TraceSection, execution: TraceSection, decision: TraceSection): SupportResponse {
  const handoff: Handoff = { customer, intent, reason, ...(orderId ? { orderId } : {}), conversationSummary: `Customer message: “${message}”` };
  return { reply, trace: [understanding, execution, decision], handoff };
}

function formatOrderReply(order: Order) {
  if (order.status === "IN_TRANSIT") return `Order ${order.orderId} is in transit. The order system currently estimates delivery on ${formatDate(order.estimatedDelivery)}.`;
  if (order.status === "DELIVERED") return `Order ${order.orderId} was delivered${order.deliveredAt ? ` on ${formatDate(order.deliveredAt)}` : ""}, according to the order system.`;
  return `Order ${order.orderId} is processing. The order system currently estimates delivery on ${formatDate(order.estimatedDelivery)}.`;
}

function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value)) : "a date not yet available"; }
function extractPhone(message: string) { const candidates = message.match(/\+?\d[\d\s()-]{6,}\d/g) ?? []; return candidates.find((value) => value.replace(/\D/g, "").length >= 8)?.trim(); }
