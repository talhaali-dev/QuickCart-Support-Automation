export type Intent =
  | "ORDER_STATUS"
  | "FAQ"
  | "RETURN_REQUEST"
  | "HUMAN_REQUEST"
  | "UNKNOWN";

export type TraceItem = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
};

export type Handoff = {
  customer: string;
  intent: Intent;
  reason: string;
  orderId?: string;
  conversationSummary: string;
};

export type SupportResponse = {
  reply: string;
  trace: TraceItem[];
  handoff?: Handoff;
};

export type OrderStatus = "IN_TRANSIT" | "DELIVERED" | "PROCESSING";

export type Order = {
  orderId: string;
  status: OrderStatus;
  phone: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  lastUpdated: string;
};
