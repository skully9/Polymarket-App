import { NextResponse } from "next/server";

const GAMMA_BASE = process.env.NEXT_PUBLIC_GAMMA_BASE ?? "https://gamma-api.polymarket.com";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const category = searchParams.get("category");
  const limit = searchParams.get("limit") ?? "200";

  const gammaUrl = new URL(`${GAMMA_BASE}/markets`);
  gammaUrl.searchParams.set("limit", limit);
  if (query) gammaUrl.searchParams.set("query", query);
  if (category) gammaUrl.searchParams.set("category", category);

  try {
    const res = await fetch(gammaUrl.toString(), { next: { revalidate: 5 } });
    if (res.status === 429) {
      return NextResponse.json({ markets: [], rateLimited: true }, { status: 429 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to load markets" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({ markets: data.markets ?? data });
  } catch (error) {
    console.error("Gamma fetch error", error);
    return NextResponse.json({ markets: [], error: "Network error" }, { status: 500 });
  }
}
