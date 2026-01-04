export interface GammaMarket {
  id: string;
  question: string;
  slug?: string;
  volume?: number;
  liquidity?: number;
  closed?: boolean;
  active?: boolean;
  category?: string;
  outcomes?: string[];
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface TopOfBook {
  yes: {
    bid?: OrderBookLevel;
    ask?: OrderBookLevel;
  };
  no: {
    bid?: OrderBookLevel;
    ask?: OrderBookLevel;
  };
  requiresAuth?: boolean;
}

export interface Opportunity {
  marketId: string;
  title: string;
  buyCost: number;
  edge: number;
  yesAskSize?: number;
  noAskSize?: number;
  timestamp: number;
}

export type OrderStatus = "FILLED" | "OPEN" | "CANCELLED" | "FAILED_ATOMIC";

export interface PaperOrder {
  id: string;
  marketId: string;
  side: "YES" | "NO";
  action: "BUY" | "SELL";
  type: "LIMIT";
  price: number;
  size: number;
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
  note?: string;
}

export interface Position {
  marketId: string;
  title: string;
  yesShares: number;
  noShares: number;
  averagePriceYes: number;
  averagePriceNo: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  marketId: string;
  title: string;
  message: string;
  pnlImpact?: number;
}

export interface PortfolioState {
  cash: number;
  realizedPnl: number;
  positions: Record<string, Position>;
  orders: PaperOrder[];
  logs: ActivityLogEntry[];
}

export interface ScannerSettings {
  pollIntervalMs: number;
  minEdge: number;
  orderSize: number;
  maxWaitMs: number;
  topN: number;
  minVolume: number;
}
