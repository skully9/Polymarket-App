"use client";

import { ScannerSettings } from "../../lib/types";

interface Props {
  settings: ScannerSettings;
  onChange: (next: ScannerSettings) => void;
  running: boolean;
  onToggle: () => void;
}

export default function ScannerControls({ settings, onChange, running, onToggle }: Props) {
  const update = (key: keyof ScannerSettings, value: number) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Scanner controls</h3>
          <p className="text-sm text-slate-400">Adjust thresholds and polling interval.</p>
        </div>
        <button className={running ? "btn-secondary" : "btn-primary"} onClick={onToggle}>
          {running ? "Stop" : "Start"} scanner
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <label className="space-y-1">
          <span className="table-heading">Poll interval (ms)</span>
          <input
            className="input"
            type="number"
            value={settings.pollIntervalMs}
            onChange={(e) => update("pollIntervalMs", Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="table-heading">Min edge (1 - cost)</span>
          <input
            className="input"
            type="number"
            step="0.01"
            value={settings.minEdge}
            onChange={(e) => update("minEdge", Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="table-heading">Order size (shares)</span>
          <input
            className="input"
            type="number"
            value={settings.orderSize}
            onChange={(e) => update("orderSize", Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="table-heading">Max wait (ms)</span>
          <input
            className="input"
            type="number"
            value={settings.maxWaitMs}
            onChange={(e) => update("maxWaitMs", Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="table-heading">Top N by volume</span>
          <input
            className="input"
            type="number"
            value={settings.topN}
            onChange={(e) => update("topN", Number(e.target.value))}
          />
        </label>
        <label className="space-y-1">
          <span className="table-heading">Min volume filter</span>
          <input
            className="input"
            type="number"
            value={settings.minVolume}
            onChange={(e) => update("minVolume", Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
