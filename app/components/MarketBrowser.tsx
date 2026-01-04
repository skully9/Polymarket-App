"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchMarkets } from "../../lib/api";
import { GammaMarket } from "../../lib/types";

interface Props {
  onSelect: (market: GammaMarket) => void;
  minVolume: number;
  openOnly: boolean;
  onMarketsLoaded?: (markets: GammaMarket[]) => void;
}

export default function MarketBrowser({ onSelect, minVolume, openOnly, onMarketsLoaded }: Props) {
  const [markets, setMarkets] = useState<GammaMarket[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMarkets({ search, minVolume, openOnly });
        if (!active) return;
        setMarkets(data);
        onMarketsLoaded?.(data);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Failed to load markets");
      } finally {
        if (active) setLoading(false);
      }
    };
    const timeout = setTimeout(load, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [search, minVolume, openOnly]);

  const tableData = useMemo(() => {
    return markets
      .filter((m) => (openOnly ? !m.closed && m.active !== false : true))
      .filter((m) => (minVolume ? (m.volume ?? 0) >= minVolume : true))
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
  }, [markets, openOnly, minVolume]);

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <input
          className="input"
          placeholder="Search markets"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="text-sm text-slate-400">{loading ? "Loading..." : `${tableData.length} markets`}</div>
      </div>
      {error && <div className="text-amber-400 text-sm">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 text-xs uppercase">
              <th className="py-2">Title</th>
              <th className="py-2">Market ID</th>
              <th className="py-2">Volume</th>
              <th className="py-2">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((m) => (
              <tr key={m.id} className="border-t border-slate-800">
                <td className="py-2 pr-2">{m.question}</td>
                <td className="py-2 pr-2 text-slate-400 text-xs">{m.slug ?? m.id}</td>
                <td className="py-2 pr-2">${(m.volume ?? 0).toLocaleString()}</td>
                <td className="py-2 pr-2">
                  {m.closed || m.active === false ? (
                    <span className="badge-red">Closed</span>
                  ) : (
                    <span className="badge-green">Open</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <button className="btn-primary" onClick={() => onSelect(m)}>
                    Select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
