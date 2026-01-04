import { NextResponse } from "next/server";
import { TopOfBook } from "../../../lib/types";

const CLOB_BASE = process.env.NEXT_PUBLIC_CLOB_BASE ?? "https://clob.polymarket.com";

interface RawLevel {
  price?: number | string;
  size?: number | string;
  outcome?: string;
  side?: string;
  ticker?: string;
}

function normalizePrice(value: number | string | undefined) {
  if (typeof value === "number") return value;
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function chooseOutcome(level: RawLevel) {
  const text = (level.outcome ?? level.ticker ?? level.side ?? "").toString().toUpperCase();
  if (text.includes("YES") || text === "1" || text === "Y") return "YES";
  if (text.includes("NO") || text === "0" || text === "N") return "NO";
  return undefined;
}

function update(top: TopOfBook, level: RawLevel, intent: "bid" | "ask") {
  const price = normalizePrice(level.price);
  const size = normalizePrice(level.size);
  const outcome = chooseOutcome(level);
  if (price === undefined || size === undefined || !outcome) return top;
  const target = outcome === "YES" ? top.yes : top.no;
  if (intent === "bid") {
    if (!target.bid || price > target.bid.price) target.bid = { price, size };
  } else {
    if (!target.ask || price < target.ask.price) target.ask = { price, size };
  }
  return top;
}

async function fetchCandidate(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return res;
  } catch (err) {
    console.error("Orderbook fetch error", err);
    return undefined;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("marketId");
  if (!marketId) {
    return NextResponse.json({ error: "marketId required" }, { status: 400 });
  }

  const endpoints = [
    `${CLOB_BASE}/orderbook?market=${marketId}&limit=1`,
    `${CLOB_BASE}/markets/${marketId}/orderbook?limit=1`,
  ];

  let lastStatus = 500;
  for (const url of endpoints) {
    const res = await fetchCandidate(url);
    if (!res) continue;
    lastStatus = res.status;
    if (res.status === 429) {
      return NextResponse.json({ yes: {}, no: {}, rateLimited: true }, { status: 429 });
    }
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ yes: {}, no: {}, requiresAuth: true }, { status: res.status });
    }
    if (!res.ok) continue;
    const data = await res.json();
    const top: TopOfBook = { yes: {}, no: {} };

    const bids: RawLevel[] = data.bids ?? data.bid ?? data.data?.bids ?? [];
    const asks: RawLevel[] = data.asks ?? data.ask ?? data.data?.asks ?? [];

    bids.forEach((b) => update(top, b, "bid"));
    asks.forEach((a) => update(top, a, "ask"));

    if (top.yes.ask || top.no.ask || top.yes.bid || top.no.bid) {
      return NextResponse.json(top, { status: 200 });
    }
  }

  return NextResponse.json({ yes: {}, no: {}, requiresAuth: lastStatus === 401 || lastStatus === 403 }, { status: lastStatus });
}
