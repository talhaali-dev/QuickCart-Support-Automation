# QuickCart Support Automation

A small, production-minded interview demo showing how customer-support automation can classify messages, retrieve trusted business data, answer bounded FAQs, and hand unsupported work to a person.

## Problem

Support automation is useful only when it can distinguish language understanding from business truth. This prototype makes that boundary visible: order status comes only from an `OrderService`, informational answers come only from an explicit demo FAQ set, and transactional or uncertain cases escalate safely.

## Architecture

The Next.js App Router UI sends messages to `POST /api/support`. A deterministic support engine normalizes the message, classifies it as `ORDER_STATUS`, `FAQ`, `RETURN_REQUEST`, `HUMAN_REQUEST`, or `UNKNOWN`, extracts an order ID or phone number, and selects a safe action.

Order data is accessed through an `OrderService` interface:

- `MockOrderService` is the default and makes the deployed demo self-contained.
- `HttpOrderService` demonstrates integration with `GET /orders?order_id=...` and `GET /orders?phone=...`, with a four-second timeout and no caching.

Every result includes a Decision Trace. Escalated results also include a structured handoff object with customer, intent, reason, order context, and conversation summary.

## What the prototype demonstrates

- Deterministic routing with no external LLM
- Optional low-cost LLM interpretation for intent, language, and entity extraction (rules remain the default and fallback)
- Trusted order lookup by ID or phone
- Safe failure, not-found, ambiguous, and timeout behavior
- Clearly labeled illustrative FAQ content
- Human handoff for returns, explicit human requests, and unknown questions
- Responsive, accessible single-page interview flow
- Zero persistence, authentication, or external service dependency in demo mode

## Assumptions

The supplied order API is the order-status source of truth but is hosted on a private network, so the demo uses a mock adapter. No approved FAQ source or Returns API was supplied. WhatsApp is represented by the chat UI. Production use would require privacy, PII, security, and operational controls.

## Local setup

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and use the five quick scenarios.

Quality checks:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `USE_MOCK_ORDER_API` | `true` | Uses the self-contained mock order adapter. Set exactly to `false` to enable HTTP mode. |
| `ORDER_API_URL` | unset | Base URL for the real order service. Required only when mock mode is disabled. |
| `AI_ENABLED` | `false` | Enables the optional message interpretation layer only when set to `true`. |
| `OPENROUTER_API_KEY` | unset | OpenRouter API key. Use this with the free router when enabling AI. |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter’s OpenAI-compatible API base URL. |
| `OPENROUTER_MODEL` | `openrouter/free` | Free-model router; it selects an available free model for each request. |
| `OPENROUTER_SITE_URL` | unset | Optional site URL attribution header for OpenRouter. |
| `OPENROUTER_APP_NAME` | `QuickCart Support Automation` | Optional app-name attribution header for OpenRouter. |
| `OPENAI_API_KEY` | unset | Generic OpenAI-compatible fallback key if OpenRouter variables are absent. |
| `OPENAI_BASE_URL` | unset | Generic OpenAI-compatible fallback base URL. |
| `OPENAI_MODEL` | unset | Generic OpenAI-compatible fallback model. |

If `USE_MOCK_ORDER_API=false` but `ORDER_API_URL` is absent, the application safely falls back to the mock adapter. No private-network access is required for local or Vercel deployment.

When `AI_ENABLED=false` or no API key is present, the deterministic interpreter is used. To try OpenRouter’s free route locally, set `AI_ENABLED=true` and `OPENROUTER_API_KEY` (the default model is `openrouter/free`). If the optional model times out or returns invalid JSON, the same rules path is used automatically. The model can classify language and extract an order ID, but the `OrderService` remains the only source of order status and no model output can execute returns, refunds, or other transactions.

## Deploy to Vercel

Import the repository into Vercel and deploy with the detected Next.js defaults. No environment variables are required: mock mode is the default. Optionally set `USE_MOCK_ORDER_API=true` explicitly in the Vercel project settings.

Do not point a public deployment at the supplied private IP unless network connectivity and access controls have been deliberately configured.

## What changes for production

A production version would add WhatsApp Cloud API webhook verification, idempotent event processing, conversation state, an approved and versioned knowledge source, a transactional Returns API, agent inbox or CRM integration, monitoring and alerting, PII controls and retention policy, multilingual evaluation, and secure service-to-service authentication.

The proposed pilot metric is **Eligible Order Status Containment Rate**: successfully automated eligible order-status conversations divided by total eligible order-status conversations. The target is 90% only when `OrderService` is healthy and the order is identified unambiguously. This is a proposed target, not a result from the sample data. The safety requirement is zero fabricated order statuses.
