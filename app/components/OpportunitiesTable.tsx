"use client";

import { useEffect, useState } from "react";
import { fetchOrderBook } from "../../lib/api";
import { GammaMarket, Opportunity, TopOfBook } from "../../lib/types";

interface Props {
  markets: GammaMarket[];
  running: boolean;
  minEdge: number;
  orderSize: number;
  pollInterval: number;
  topN: number;
  onExecute: (opp: Opportunity, top: TopOfBook) => void;
  onRateLimit: () => void;
}

export default function OpportunitiesTable({
  markets,
  running,
  minEdge,
  orderSize,
  pollInterval,
  topN,
  onExecute,
  onRateLimit,
}: Props) {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;

    const scan = async () => {
      const candidates = markets
        .filter((m) => !m.closed && m.active !== false)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
        .slice(0, topN);
      const found: Opportunity[] = [];
      for (const m of candidates) {
        try {
          const top = await fetchOrderBook(m.id);
          if ((top as any).rateLimited) {
            onRateLimit();
            continue;
          }
          const buyCost = (top.yes.ask?.price ?? 0) + (top.no.ask?.price ?? 0);
          const edge = 1 - buyCost;
          if (edge >= minEdge && (top.yes.ask?.size ?? 0) >= orderSize && (top.no.ask?.size ?? 0) >= orderSize) {
            found.push({
              marketId: m.id,
              title: m.question,
              buyCost,
              edge,
              yesAskSize: top.yes.ask?.size,
              noAskSize: top.no.ask?.size,
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          console.error("scan error", err);
        }
      }
      if (!cancelled) {
        setOpps(found);
        setLastUpdated(Date.now());
      }
    };

    scan();
    const interval = setInterval(scan, pollInterval);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [markets, running, minEdge, orderSize, pollInterval, topN, onRateLimit]);

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Opportunities</h3>
        <div className="text-xs text-slate-400">{lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : ""}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="py-2">Market</th>
              <th className="py-2">buy_cost</th>
              <th className="py-2">edge</th>
              <th className="py-2">YES ask</th>
              <th className="py-2">NO ask</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {opps.map((o) => (
              <tr key={o.marketId} className="border-t border-slate-800">
                <td className="py-2 pr-2">{o.title}</td>
                <td className="py-2 pr-2">{o.buyCost.toFixed(4)}</td>
                <td className="py-2 pr-2 text-green-300">{o.edge.toFixed(4)}</td>
                <td className="py-2 pr-2">{o.yesAskSize}</td>
                <td className="py-2 pr-2">{o.noAskSize}</td>
                <td className="py-2">
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      try {
                        const top = await fetchOrderBook(o.marketId);
                        onExecute(o, top);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    Paper Execute
                  </button>
                </td>
              </tr>
            ))}
            {opps.length === 0 && (
              <tr>
                <td className="py-3 text-slate-400" colSpan={6}>
                  No opportunities found at current thresholds.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
