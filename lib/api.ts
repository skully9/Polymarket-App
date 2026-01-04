import { GammaMarket, TopOfBook } from "./types";

export const DEFAULT_GAMMA_BASE = process.env.NEXT_PUBLIC_GAMMA_BASE ?? "https://gamma-api.polymarket.com";
export const DEFAULT_CLOB_BASE = process.env.NEXT_PUBLIC_CLOB_BASE ?? "https://clob.polymarket.com";

export async function fetchMarkets(params?: { search?: string; minVolume?: number; openOnly?: boolean; category?: string }): Promise<GammaMarket[]> {
  const query = new URLSearchParams();
  query.set("limit", "200");
  if (params?.search) query.set("query", params.search);
  if (params?.category) query.set("category", params.category);
  // Gamma supports sorting by volume via ordering param; keep simple
  const res = await fetch(`/api/markets?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch markets (${res.status})`);
  const data = await res.json();
  let markets: GammaMarket[] = data.markets ?? data ?? [];
  if (params?.openOnly) {
    markets = markets.filter((m) => !m.closed && m.active !== false);
  }
  if (params?.minVolume) {
    markets = markets.filter((m) => (m.volume ?? 0) >= params.minVolume);
  }
  return markets;
}

export async function fetchOrderBook(marketId: string): Promise<TopOfBook> {
  const res = await fetch(`/api/orderbook?marketId=${marketId}`);
  if (res.status === 429) {
    return { yes: {}, no: {}, requiresAuth: false };
  }
  if (!res.ok) {
    throw new Error(`Failed to load orderbook (${res.status})`);
  }
  return res.json();
}
