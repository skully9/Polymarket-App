import { useEffect, useState, Dispatch, SetStateAction } from "react";
import { PortfolioState, ScannerSettings } from "./types";

const PORTFOLIO_KEY = "polymarket-paper-portfolio";
const SETTINGS_KEY = "polymarket-paper-settings";

export function defaultPortfolio(): PortfolioState {
  return {
    cash: 100,
    realizedPnl: 0,
    positions: {},
    orders: [],
    logs: [],
  };
}

export function defaultSettings(): ScannerSettings {
  return {
    pollIntervalMs: 3000,
    minEdge: 0.02,
    orderSize: 10,
    maxWaitMs: 2000,
    topN: 50,
    minVolume: 10000,
  };
}

export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setValue({ ...initial, ...JSON.parse(stored) });
      } catch (err) {
        console.warn("Failed to parse localStorage", err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export function usePortfolioState() {
  return usePersistentState<PortfolioState>(PORTFOLIO_KEY, defaultPortfolio());
}

export function useSettingsState() {
  return usePersistentState<ScannerSettings>(SETTINGS_KEY, defaultSettings());
}
