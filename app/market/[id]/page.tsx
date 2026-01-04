"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchMarkets, fetchOrderBook } from "../../../lib/api";
import { GammaMarket, TopOfBook } from "../../../lib/types";
import OrderBookCard from "../../components/OrderBookCard";
import { attemptAtomicHedge, closePosition } from "../../../lib/paperEngine";
import { usePortfolioState } from "../../../lib/storage";

export default function MarketPage() {
  const params = useParams<{ id: string }>();
  const marketId = params.id;
  const [market, setMarket] = useState<GammaMarket | null>(null);
  const [top, setTop] = useState<TopOfBook>({ yes: {}, no: {} });
  const [portfolio, setPortfolio] = usePortfolioState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMarket = async () => {
      setLoading(true);
      try {
        const list = await fetchMarkets({ search: marketId });
        const m = list.find((x) => x.id === marketId || x.slug === marketId) ?? null;
        setMarket(m);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load market");
      } finally {
        setLoading(false);
      }
    };
    loadMarket();
  }, [marketId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetchOrderBook(marketId);
        if (!active) return;
        setTop(res);
      } catch (err) {
        console.error(err);
      }
    };
    load();
    const interval = setInterval(load, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [marketId]);

  const pos = portfolio.positions[marketId];

  const handleExecute = () => {
    if (!market) return;
    const result = attemptAtomicHedge(
      portfolio,
      marketId,
      market.question,
      top,
      10,
      2000,
    );
    setPortfolio((prev) => ({
      ...result.state,
      orders: [...result.orders, ...prev.orders].slice(0, 200),
    }));
  };

  const handleClose = () => {
    if (!market) return;
    const result = closePosition(portfolio, marketId, market.question, top);
    setPortfolio((prev) => ({
      ...result.state,
      orders: [...result.orders, ...prev.orders].slice(0, 200),
    }));
  };

  return (
    <main className="space-y-4">
      <div className="card">
        {loading && <div>Loading market...</div>}
        {error && <div className="text-amber-400">{error}</div>}
        {market && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{market.question}</h2>
            <div className="text-sm text-slate-400">Market ID: {market.id}</div>
            <div className="flex items-center gap-2">
              {market.closed || market.active === false ? (
                <span className="badge-red">Closed</span>
              ) : (
                <span className="badge-green">Open</span>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={handleExecute}>
                Paper Execute (buy YES+NO)
              </button>
              <button className="btn-secondary" onClick={handleClose} disabled={!pos}>
                Close Position
              </button>
            </div>
          </div>
        )}
      </div>
      <OrderBookCard marketId={marketId} />
      {pos && (
        <div className="card text-sm">
          <h3 className="font-semibold mb-2">Position</h3>
          <div>YES: {pos.yesShares} @ {pos.averagePriceYes.toFixed(3)}</div>
          <div>NO: {pos.noShares} @ {pos.averagePriceNo.toFixed(3)}</div>
        </div>
      )}
    </main>
  );
}
