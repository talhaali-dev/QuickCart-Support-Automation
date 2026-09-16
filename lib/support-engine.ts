import { getOrderService, type OrderService } from "./order-service";
import type {
  Handoff,
  Intent,
  Order,
  SupportResponse,
  TraceItem,
} from "./support-types";

const DEMO_FAQS = [
  {
    id: "SHIPPING",
    patterns: ["shipping", "delivery time", "how long"],
    answer:
      "Demo FAQ: Standard shipping typically takes 3–5 business days after dispatch.",
  },
  {
    id: "HOURS",
    patterns: ["hours", "open", "opening"],
    answer:
      "Demo FAQ: Support hours are Monday–Friday, 9:00 AM–5:00 PM local time.",
  },
  {
    id: "CONTACT",
    patterns: ["contact", "email", "phone number"],
    answer:
      "Demo FAQ: You can reach the support team through the contact channel listed in your order confirmation.",
  },
  {
    id: "RETURN_POLICY",
    patterns: ["return policy", "returns policy"],
    answer:
      "Demo FAQ: Unused items may be eligible for return within 30 days. A support agent must confirm eligibility before any return is started.",
  },
] as const;

type ProcessOptions = {
  simulateFailure?: boolean;
  customer?: string;
  service?: OrderService;
};

export async function processSupportMessage(
  rawMessage: string,
  options: ProcessOptions = {},
): Promise<SupportResponse> {
  const message = rawMessage.trim();
  const normalized = message.toLowerCase().replace(/\s+/g, " ");
  const orderId = message.match(/\bQC-\d+\b/i)?.[0].toUpperCase();
  const phone = extractPhone(message);
  const intent = classifyIntent(normalized, Boolean(orderId || phone));
  const customer = options.customer ?? "Web demo visitor";

  if (intent === "RETURN_REQUEST") {
    return handoffResponse(
      "I can’t execute a return because no transactional returns system is connected. I’ll route this to a support agent with the order context.",
      customer,
      intent,
      "RETURNS_API_NOT_AVAILABLE",
      message,
      orderId,
      [
        item("Intent", intent),
        item("Decision", "HUMAN_HANDOFF", "warning"),
        item("Reason", "RETURNS_API_NOT_AVAILABLE"),
        ...(orderId ? [item("Order ID", orderId)] : []),
        item("Human handoff", "YES", "warning"),
      ],
    );
  }

  if (intent === "HUMAN_REQUEST") {
    return handoffResponse(
      "Of course — I’ll route this conversation to a support agent.",
      customer,
      intent,
      "CUSTOMER_REQUESTED_HUMAN",
      message,
      orderId,
      [
        item("Intent", intent),
        item("Decision", "HUMAN_HANDOFF", "warning"),
        item("Reason", "CUSTOMER_REQUESTED_HUMAN"),
        item("Human handoff", "YES", "warning"),
      ],
    );
  }

  if (intent === "ORDER_STATUS") {
    return handleOrderStatus(message, customer, orderId, phone, options);
  }

  if (intent === "FAQ") {
    const faq = DEMO_FAQS.find((entry) =>
      entry.patterns.some((pattern) => normalized.includes(pattern)),
    );

    if (faq) {
      return {
        reply: faq.answer,
        trace: [
          item("Intent", "FAQ"),
          item("Decision", "APPROVED_KNOWLEDGE_LOOKUP"),
          item("Data source", "Illustrative demo FAQ"),
          item("Knowledge item", faq.id),
          item("Outcome", "DEMO_CONTENT", "success"),
          item("Human handoff", "NO", "success"),
        ],
      };
    }
  }

  return handoffResponse(
    "I don’t have approved information to answer that safely. I’ll route your message to a support agent.",
    customer,
    "UNKNOWN",
    "NO_APPROVED_KNOWLEDGE",
    message,
    orderId,
    [
      item("Intent", "UNKNOWN"),
      item("Decision", "HUMAN_HANDOFF", "warning"),
      item("Reason", "NO_APPROVED_KNOWLEDGE"),
      item("Human handoff", "YES", "warning"),
    ],
  );
}

function classifyIntent(message: string, hasOrderReference: boolean): Intent {
  const isPolicyQuestion = /return(s)? policy/.test(message);
  if (!isPolicyQuestion && /\b(return|refund|send back)\b/.test(message)) {
    return "RETURN_REQUEST";
  }
  if (/\b(human|agent|person|representative)\b/.test(message)) {
    return "HUMAN_REQUEST";
  }
  if (
    hasOrderReference ||
    /\b(track|tracking|where is|order status|delivery status)\b/.test(message)
  ) {
    return "ORDER_STATUS";
  }
  if (DEMO_FAQS.some((faq) => faq.patterns.some((p) => message.includes(p)))) {
    return "FAQ";
  }
  return "UNKNOWN";
}

async function handleOrderStatus(
  message: string,
  customer: string,
  orderId: string | undefined,
  phone: string | undefined,
  options: ProcessOptions,
): Promise<SupportResponse> {
  const service = options.service ?? getOrderService();
  const baseTrace = [
    item("Intent", "ORDER_STATUS"),
    item("Decision", "ORDER_LOOKUP"),
    item("Tool", "OrderService"),
    item("Data source", service.sourceName),
  ];

  if (!orderId && !phone) {
    return handoffResponse(
      "I couldn’t identify an order unambiguously. I’ll route this to a support agent who can verify the details securely.",
      customer,
      "ORDER_STATUS",
      "ORDER_NOT_IDENTIFIED",
      message,
      undefined,
      [...baseTrace, item("Outcome", "AMBIGUOUS"), item("Decision", "HUMAN_HANDOFF", "warning"), item("Human handoff", "YES", "warning")],
    );
  }

  try {
    if (options.simulateFailure) throw new Error("Simulated order API failure");

    let order: Order | null = null;
    if (orderId) {
      order = await service.findByOrderId(orderId);
    } else if (phone) {
      const matches = await service.findByPhone(phone);
      if (matches.length > 1) {
        return handoffResponse(
          "I found multiple orders for that phone number, so I won’t guess which one you mean. I’ll route this to a support agent.",
          customer,
          "ORDER_STATUS",
          "MULTIPLE_ORDERS_FOUND",
          message,
          undefined,
          [...baseTrace, item("Phone", phone), item("Outcome", "AMBIGUOUS"), item("Decision", "HUMAN_HANDOFF", "warning"), item("Human handoff", "YES", "warning")],
        );
      }
      order = matches[0] ?? null;
    }

    if (!order) {
      return handoffResponse(
        "I couldn’t find a matching order, so I won’t provide an unverified status. I’ll route this to a support agent.",
        customer,
        "ORDER_STATUS",
        "ORDER_NOT_FOUND",
        message,
        orderId,
        [...baseTrace, ...(orderId ? [item("Order ID", orderId)] : []), item("Outcome", "NOT_FOUND"), item("Decision", "HUMAN_HANDOFF", "warning"), item("Human handoff", "YES", "warning")],
      );
    }

    return {
      reply: formatOrderReply(order),
      trace: [
        ...baseTrace,
        item("Order ID", order.orderId),
        item("Outcome", "SUCCESS", "success"),
        item("Human handoff", "NO", "success"),
      ],
    };
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    return handoffResponse(
      "I’m having trouble accessing the order system right now. I’ll route this to a support agent so they can check it for you.",
      customer,
      "ORDER_STATUS",
      isTimeout ? "ORDER_SERVICE_TIMEOUT" : "ORDER_API_UNAVAILABLE",
      message,
      orderId,
      [
        ...baseTrace,
        ...(orderId ? [item("Order ID", orderId)] : []),
        item("Outcome", isTimeout ? "TIMEOUT" : "API_FAILURE", "warning"),
        item("Decision", "HUMAN_HANDOFF", "warning"),
        item("Human handoff", "YES", "warning"),
      ],
    );
  }
}

function formatOrderReply(order: Order) {
  if (order.status === "IN_TRANSIT") {
    return `Order ${order.orderId} is in transit. The order system currently estimates delivery on ${formatDate(order.estimatedDelivery)}.`;
  }
  if (order.status === "DELIVERED") {
    return `Order ${order.orderId} was delivered${order.deliveredAt ? ` on ${formatDate(order.deliveredAt)}` : ""}, according to the order system.`;
  }
  return `Order ${order.orderId} is processing. The order system currently estimates delivery on ${formatDate(order.estimatedDelivery)}.`;
}

function formatDate(value?: string) {
  if (!value) return "a date not yet available";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function extractPhone(message: string) {
  const candidates = message.match(/\+?\d[\d\s()-]{6,}\d/g) ?? [];
  return candidates.find((value) => value.replace(/\D/g, "").length >= 8)?.trim();
}

function item(label: string, value: string, tone: TraceItem["tone"] = "default"): TraceItem {
  return { label, value, tone };
}

function handoffResponse(
  reply: string,
  customer: string,
  intent: Intent,
  reason: string,
  message: string,
  orderId: string | undefined,
  trace: TraceItem[],
): SupportResponse {
  const handoff: Handoff = {
    customer,
    intent,
    reason,
    ...(orderId ? { orderId } : {}),
    conversationSummary: `Customer message: “${message}”`,
  };
  return { reply, trace, handoff };
}
