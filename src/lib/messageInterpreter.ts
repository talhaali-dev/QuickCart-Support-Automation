import type { Intent } from "../../lib/support-types";

export type MessageInterpretation = {
  intent: Intent;
  orderId: string | null;
  faqTopic: string | null;
  language: string;
  confidence: number;
};

export type InterpretationMethod = "AI" | "RULES";

export type DetailedInterpretation = {
  interpretation: MessageInterpretation;
  method: InterpretationMethod;
};

const INTENTS = new Set<Intent>([
  "ORDER_STATUS",
  "FAQ",
  "RETURN_REQUEST",
  "HUMAN_REQUEST",
  "UNKNOWN",
]);

const SYSTEM_PROMPT = `You are QuickCart's message interpretation layer. Classify the customer's request and extract only language-level information.

Rules:
- classify the customer's request as ORDER_STATUS, FAQ, RETURN_REQUEST, HUMAN_REQUEST, or UNKNOWN
- extract an order ID matching QC-xxxxx if present
- detect the message language (use a practical BCP-47 label such as en or ur-Latn)
- never invent an order status
- never determine refund eligibility
- never claim that an action has been completed
- output structured data only, matching the requested JSON shape`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", enum: [...INTENTS] },
    orderId: { type: ["string", "null"] },
    faqTopic: { type: ["string", "null"] },
    language: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["intent", "orderId", "faqTopic", "language", "confidence"],
} as const;

export async function interpretMessage(message: string): Promise<MessageInterpretation> {
  const result = await interpretMessageDetailed(message);
  return result.interpretation;
}

export async function interpretMessageDetailed(message: string): Promise<DetailedInterpretation> {
  const fallback = interpretWithRules(message);

  if (process.env.AI_ENABLED !== "true" || !process.env.OPENAI_API_KEY) {
    return { interpretation: fallback, method: "RULES" };
  }

  try {
    const response = await fetch(
      `${(process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          temperature: 0,
          max_tokens: 120,
          response_format: { type: "json_schema", json_schema: { name: "message_interpretation", strict: true, schema: RESPONSE_SCHEMA } },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: message },
          ],
        }),
        signal: AbortSignal.timeout(3_000),
        cache: "no-store",
      },
    );

    if (!response.ok) throw new Error(`Interpreter returned ${response.status}`);
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Interpreter returned no content");

    const parsed = JSON.parse(stripCodeFence(content)) as unknown;
    const interpretation = validateInterpretation(parsed, message);
    return { interpretation, method: "AI" };
  } catch {
    return { interpretation: fallback, method: "RULES" };
  }
}

export function interpretWithRules(message: string): MessageInterpretation {
  const normalized = message.toLowerCase().replace(/\s+/g, " ");
  const orderId = message.match(/\bQC-\d+\b/i)?.[0].toUpperCase() ?? null;
  const isPolicyQuestion = /return(s)? policy/.test(normalized);
  let intent: Intent = "UNKNOWN";
  let faqTopic: string | null = null;

  if (!isPolicyQuestion && /\b(return|refund|send back)\b/.test(normalized)) intent = "RETURN_REQUEST";
  else if (/\b(human|agent|person|representative)\b/.test(normalized)) intent = "HUMAN_REQUEST";
  else if (orderId || /\b(track|tracking|where is|order status|delivery status)\b/.test(normalized)) intent = "ORDER_STATUS";
  else {
    const topic = [
      ["SHIPPING", ["shipping", "delivery time", "how long"]],
      ["HOURS", ["hours", "open", "opening"]],
      ["CONTACT", ["contact", "email", "phone number"]],
      ["RETURN_POLICY", ["return policy", "returns policy"]],
    ] as const;
    const match = topic.find(([, patterns]) => patterns.some((pattern) => normalized.includes(pattern)));
    if (match) {
      intent = "FAQ";
      faqTopic = match[0];
    }
  }

  return { intent, orderId, faqTopic, language: "en", confidence: intent === "UNKNOWN" ? 0.55 : 0.88 };
}

function validateInterpretation(value: unknown, message: string): MessageInterpretation {
  if (typeof value !== "object" || value === null) throw new Error("Invalid interpretation");
  const candidate = value as Partial<MessageInterpretation>;
  if (typeof candidate.intent !== "string" || !INTENTS.has(candidate.intent as Intent)) throw new Error("Invalid intent");
  if (typeof candidate.language !== "string" || !candidate.language.trim()) throw new Error("Invalid language");
  if (typeof candidate.confidence !== "number" || !Number.isFinite(candidate.confidence)) throw new Error("Invalid confidence");
  if (candidate.orderId !== null && typeof candidate.orderId !== "string") throw new Error("Invalid order ID");
  if (candidate.faqTopic !== null && typeof candidate.faqTopic !== "string") throw new Error("Invalid FAQ topic");

  // The message itself is the boundary for extracted entities: the model cannot introduce a new order ID.
  const mentionedOrderId = message.match(/\bQC-\d+\b/i)?.[0].toUpperCase() ?? null;
  return {
    intent: candidate.intent as Intent,
    orderId: mentionedOrderId,
    faqTopic: candidate.faqTopic?.trim() || null,
    language: candidate.language.trim().slice(0, 32),
    confidence: Math.min(1, Math.max(0, candidate.confidence)),
  };
}

function stripCodeFence(content: string) {
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}
