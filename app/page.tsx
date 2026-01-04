"use client";

import { useMemo, useState } from "react";
import MarketBrowser from "./components/MarketBrowser";
import ScannerControls from "./components/ScannerControls";
import OpportunitiesTable from "./components/OpportunitiesTable";
import PortfolioPanel from "./components/PortfolioPanel";
import ActivityLog from "./components/ActivityLog";
import { GammaMarket, Opportunity, TopOfBook } from "../lib/types";
import { attemptAtomicHedge, closePosition } from "../lib/paperEngine";
import { usePortfolioState, useSettingsState } from "../lib/storage";

export default function Home() {
  const [portfolio, setPortfolio] = usePortfolioState();
  const [settings, setSettings] = useSettingsState();
  const [running, setRunning] = useState(false);
  const [watchlist, setWatchlist] = useState<GammaMarket[]>([]);
  const [rateLimited, setRateLimited] = useState(false);

  const selectedTitles = useMemo(() => new Set(watchlist.map((m) => m.id)), [watchlist]);

  const handleExecute = (opp: Opportunity, top: TopOfBook) => {
    const result = attemptAtomicHedge(
      { ...portfolio, logs: portfolio.logs },
      opp.marketId,
      opp.title,
      top,
      settings.orderSize,
      settings.maxWaitMs,
    );
    setPortfolio((prev) => ({
      ...result.state,
      orders: [...result.orders, ...prev.orders].slice(0, 200),
    }));
  };

  const handleRateLimit = () => setRateLimited(true);

  return (
    <main className="space-y-6">
      {rateLimited && (
        <div className="card bg-amber-900 text-amber-100 border-amber-700">
          Rate limit detected. Slowing down requests. Consider increasing poll interval.
        </div>
      )}
      <ScannerControls
        settings={settings}
        onChange={(next) => setSettings(next)}
        running={running}
        onToggle={() => setRunning((x) => !x)}
      />
      <OpportunitiesTable
        markets={watchlist}
        running={running}
        minEdge={settings.minEdge}
        orderSize={settings.orderSize}
        pollInterval={settings.pollIntervalMs}
        topN={settings.topN}
        onExecute={handleExecute}
        onRateLimit={handleRateLimit}
      />
      <div className="grid md:grid-cols-2 gap-4">
        <MarketBrowser
          onSelect={(m) => setWatchlist((prev) => (selectedTitles.has(m.id) ? prev : [...prev, m]))}
          minVolume={settings.minVolume}
          openOnly
          onMarketsLoaded={(data) => setWatchlist(data.slice(0, settings.topN))}
        />
        <PortfolioPanel state={portfolio} />
      </div>
      <ActivityLog entries={portfolio.logs} />
    </main>
  );
}
