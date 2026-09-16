import { processSupportMessage } from "@/lib/support-engine";

type SupportRequest = {
  message?: unknown;
  simulateFailure?: unknown;
};

export async function POST(request: Request) {
  let body: SupportRequest;

  try {
    body = (await request.json()) as SupportRequest;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return Response.json({ error: "A non-empty message is required." }, { status: 400 });
  }

  if (body.message.length > 1_000) {
    return Response.json({ error: "Message must be 1,000 characters or fewer." }, { status: 400 });
  }

  const result = await processSupportMessage(body.message, {
    simulateFailure: body.simulateFailure === true,
  });

  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
