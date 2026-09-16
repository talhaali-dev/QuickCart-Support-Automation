import type { Order } from "./support-types";

export interface OrderService {
  readonly sourceName: string;
  findByOrderId(orderId: string): Promise<Order | null>;
  findByPhone(phone: string): Promise<Order[]>;
}

const MOCK_ORDERS: Order[] = [
  {
    orderId: "QC-88012",
    status: "IN_TRANSIT",
    estimatedDelivery: "2026-09-18",
    phone: "+1-555-0110",
    lastUpdated: "2026-09-16T15:22:00Z",
  },
  {
    orderId: "QC-88013",
    status: "DELIVERED",
    deliveredAt: "2026-09-14T17:08:00Z",
    phone: "+44-7700-9001",
    lastUpdated: "2026-09-14T17:08:00Z",
  },
  {
    orderId: "QC-88014",
    status: "PROCESSING",
    estimatedDelivery: "2026-09-21",
    phone: "+92-300-1234",
    lastUpdated: "2026-09-16T12:40:00Z",
  },
];

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export class MockOrderService implements OrderService {
  readonly sourceName = "QuickCart Order API · mock adapter";

  async findByOrderId(orderId: string) {
    return MOCK_ORDERS.find((order) => order.orderId === orderId) ?? null;
  }

  async findByPhone(phone: string) {
    const normalized = digits(phone);
    return MOCK_ORDERS.filter((order) => digits(order.phone) === normalized);
  }
}

export class HttpOrderService implements OrderService {
  readonly sourceName = "QuickCart Order API · HTTP adapter";

  constructor(private readonly baseUrl: string) {}

  private async request(params: URLSearchParams): Promise<Order[]> {
    const response = await fetch(`${this.baseUrl}/orders?${params}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });

    if (!response.ok) {
      throw new Error(`Order API returned ${response.status}`);
    }

    const body: unknown = await response.json();
    const candidates = Array.isArray(body)
      ? body
      : typeof body === "object" && body !== null && "orders" in body
        ? (body as { orders: unknown }).orders
        : [body];

    if (!Array.isArray(candidates)) {
      throw new Error("Order API returned an unexpected response");
    }

    return candidates.filter(isOrder);
  }

  async findByOrderId(orderId: string) {
    const orders = await this.request(
      new URLSearchParams({ order_id: orderId }),
    );
    return orders.length === 1 ? orders[0] : null;
  }

  findByPhone(phone: string) {
    return this.request(new URLSearchParams({ phone }));
  }
}

function isOrder(value: unknown): value is Order {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Partial<Order>;
  return (
    typeof order.orderId === "string" &&
    typeof order.phone === "string" &&
    typeof order.lastUpdated === "string" &&
    ["IN_TRANSIT", "DELIVERED", "PROCESSING"].includes(order.status ?? "")
  );
}

export function getOrderService(): OrderService {
  const useMock = process.env.USE_MOCK_ORDER_API !== "false";
  const apiUrl = process.env.ORDER_API_URL;

  if (!useMock && apiUrl) return new HttpOrderService(apiUrl.replace(/\/$/, ""));
  return new MockOrderService();
}
