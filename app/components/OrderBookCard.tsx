"use client";

import { useEffect, useState } from "react";
import { fetchOrderBook } from "../../lib/api";
import { TopOfBook } from "../../lib/types";

interface Props {
  marketId: string;
}

export default function OrderBookCard({ marketId }: Props) {
  const [top, setTop] = useState<TopOfBook>({ yes: {}, no: {} });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetchOrderBook(marketId);
        if (!active) return;
        setTop(res);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message ?? "Failed to load order book");
      }
    };
    load();
    const interval = setInterval(load, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [marketId]);

  const buyCost = (top.yes.ask?.price ?? 0) + (top.no.ask?.price ?? 0);
  const sellValue = (top.yes.bid?.price ?? 0) + (top.no.bid?.price ?? 0);

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Top of book</h3>
        {error && <span className="text-amber-400 text-xs">{error}</span>}
        {top.requiresAuth && <span className="text-amber-400 text-xs">Orderbook requires auth</span>}
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="table-heading mb-1">YES</div>
          <div className="space-y-1">
            <div>Bid: {top.yes.bid ? `${top.yes.bid.price.toFixed(3)} (${top.yes.bid.size})` : "-"}</div>
            <div>Ask: {top.yes.ask ? `${top.yes.ask.price.toFixed(3)} (${top.yes.ask.size})` : "-"}</div>
          </div>
        </div>
        <div>
          <div className="table-heading mb-1">NO</div>
          <div className="space-y-1">
            <div>Bid: {top.no.bid ? `${top.no.bid.price.toFixed(3)} (${top.no.bid.size})` : "-"}</div>
            <div>Ask: {top.no.ask ? `${top.no.ask.price.toFixed(3)} (${top.no.ask.size})` : "-"}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div>buy_cost: {buyCost ? buyCost.toFixed(4) : "-"}</div>
        <div>sell_value: {sellValue ? sellValue.toFixed(4) : "-"}</div>
        <div>edge: {buyCost ? (1 - buyCost).toFixed(4) : "-"}</div>
      </div>
    </div>
  );
}
