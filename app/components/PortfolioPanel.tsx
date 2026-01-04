"use client";

import { PortfolioState } from "../../lib/types";

interface Props {
  state: PortfolioState;
}

export default function PortfolioPanel({ state }: Props) {
  const positions = Object.values(state.positions).filter((p) => p.yesShares > 0 || p.noShares > 0);

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Portfolio</h3>
          <p className="text-sm text-slate-400">Paper-only balances with local persistence.</p>
        </div>
        <div className="text-right text-sm">
          <div>Cash: ${state.cash.toFixed(2)}</div>
          <div className="text-green-300">Realized PnL: ${state.realizedPnl.toFixed(2)}</div>
        </div>
      </div>
      <div className="text-sm text-slate-300">Open positions: {positions.length}</div>
      {positions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-400">
                <th className="py-2 text-left">Market</th>
                <th className="py-2 text-left">YES</th>
                <th className="py-2 text-left">NO</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.marketId} className="border-t border-slate-800">
                  <td className="py-2 pr-2">{p.title}</td>
                  <td className="py-2 pr-2">{p.yesShares} @ {p.averagePriceYes.toFixed(3)}</td>
                  <td className="py-2 pr-2">{p.noShares} @ {p.averagePriceNo.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
