import { ActivityLogEntry, PaperOrder, PortfolioState, Position, TopOfBook } from "./types";

const now = () => Date.now();
const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function addLog(state: PortfolioState, entry: Omit<ActivityLogEntry, "id">): PortfolioState {
  const log: ActivityLogEntry = { id: uuid(), ...entry };
  return { ...state, logs: [log, ...state.logs].slice(0, 200) };
}

function ensurePosition(state: PortfolioState, marketId: string, title: string): Position {
  const existing = state.positions[marketId];
  if (existing) return existing;
  return {
    marketId,
    title,
    yesShares: 0,
    noShares: 0,
    averagePriceYes: 0,
    averagePriceNo: 0,
  };
}

export function simulateFill(
  state: PortfolioState,
  order: PaperOrder,
  top: TopOfBook,
): { state: PortfolioState; order: PaperOrder } {
  const bookSide = order.side === "YES" ? top.yes : top.no;
  const fillable = order.action === "BUY" ? bookSide.ask : bookSide.bid;
  const price = fillable?.price;
  const sizeAvailable = fillable?.size ?? 0;

  let updatedOrder = { ...order };
  let updatedState = { ...state };

  if (price === undefined || sizeAvailable < order.size) {
    updatedOrder.status = "OPEN";
    return { state: updatedState, order: updatedOrder };
  }

  const priceOk =
    order.action === "BUY" ? order.price >= price : order.price <= price;
  if (!priceOk) {
    updatedOrder.status = "OPEN";
    return { state: updatedState, order: updatedOrder };
  }

  // Fill immediately at best price (conservative)
  updatedOrder = { ...order, status: "FILLED", filledAt: now(), price };

  const pos = ensurePosition(updatedState, order.marketId, order.marketId);
  if (order.action === "BUY") {
    updatedState.cash -= price * order.size;
    if (order.side === "YES") {
      const totalCost = pos.averagePriceYes * pos.yesShares + price * order.size;
      const newSize = pos.yesShares + order.size;
      pos.yesShares = newSize;
      pos.averagePriceYes = totalCost / newSize;
    } else {
      const totalCost = pos.averagePriceNo * pos.noShares + price * order.size;
      const newSize = pos.noShares + order.size;
      pos.noShares = newSize;
      pos.averagePriceNo = totalCost / newSize;
    }
  } else {
    updatedState.cash += price * order.size;
    if (order.side === "YES") {
      pos.yesShares = Math.max(0, pos.yesShares - order.size);
    } else {
      pos.noShares = Math.max(0, pos.noShares - order.size);
    }
  }

  updatedState.positions = { ...updatedState.positions, [order.marketId]: pos };
  return { state: updatedState, order: updatedOrder };
}

export function attemptAtomicHedge(
  state: PortfolioState,
  marketId: string,
  title: string,
  top: TopOfBook,
  size: number,
  maxWaitMs: number,
): { state: PortfolioState; orders: PaperOrder[] } {
  const baseOrder = (side: "YES" | "NO"): PaperOrder => ({
    id: uuid(),
    marketId,
    side,
    action: "BUY",
    type: "LIMIT",
    price: side === "YES" ? top.yes.ask?.price ?? 1 : top.no.ask?.price ?? 1,
    size,
    status: "OPEN",
    createdAt: now(),
    note: title,
  });

  let updatedState = { ...state };
  const yesOrder = baseOrder("YES");
  const noOrder = baseOrder("NO");

  const fillYes = simulateFill(updatedState, yesOrder, top);
  updatedState = fillYes.state;
  const filledYes = fillYes.order;

  const fillNo = simulateFill(updatedState, noOrder, top);
  updatedState = fillNo.state;
  const filledNo = fillNo.order;

  const orders: PaperOrder[] = [];

  if (filledYes.status === "FILLED" && filledNo.status === "FILLED") {
    updatedState = addLog(updatedState, {
      marketId,
      title,
      timestamp: now(),
      message: `Opened hedged position (YES @ ${filledYes.price?.toFixed(3)}, NO @ ${filledNo.price?.toFixed(3)})`,
    });
    orders.push(filledYes, filledNo);
    return { state: updatedState, orders };
  }

  // If only one leg filled, unwind it immediately at best bid
  const unwind = (order: PaperOrder) => {
    const book = order.side === "YES" ? top.yes : top.no;
    const bid = book.bid;
    if (!bid) return { ...order, status: "FAILED_ATOMIC" as const };
    const sellOrder: PaperOrder = {
      id: uuid(),
      marketId,
      side: order.side,
      action: "SELL",
      type: "LIMIT",
      price: bid.price,
      size,
      status: "OPEN",
      createdAt: now(),
      note: "Atomic unwind",
    };
    const fill = simulateFill(updatedState, sellOrder, top);
    updatedState = fill.state;
    return { ...order, status: "FAILED_ATOMIC", note: `Unwound at ${bid.price.toFixed(3)}` };
  };

  const filledLeg = filledYes.status === "FILLED" ? filledYes : filledNo.status === "FILLED" ? filledNo : undefined;
  if (filledLeg) {
    const unwindResult = unwind(filledLeg);
    orders.push(unwindResult);
    updatedState = addLog(updatedState, {
      marketId,
      title,
      timestamp: now(),
      message: `Atomic safety: only one leg filled (${filledLeg.side}). Attempted unwind.`,
    });
  }

  // Cancel the other order if open
  orders.push({ ...filledYes, status: filledYes.status === "OPEN" ? "CANCELLED" : filledYes.status });
  orders.push({ ...filledNo, status: filledNo.status === "OPEN" ? "CANCELLED" : filledNo.status });

  return { state: updatedState, orders };
}

export function closePosition(
  state: PortfolioState,
  marketId: string,
  title: string,
  top: TopOfBook,
): { state: PortfolioState; orders: PaperOrder[] } {
  const pos = state.positions[marketId];
  if (!pos || (pos.yesShares === 0 && pos.noShares === 0)) {
    return { state, orders: [] };
  }

  let updatedState = { ...state };
  const orders: PaperOrder[] = [];

  const attemptSell = (side: "YES" | "NO", size: number) => {
    if (size <= 0) return;
    const order: PaperOrder = {
      id: uuid(),
      marketId,
      side,
      action: "SELL",
      type: "LIMIT",
      price: side === "YES" ? top.yes.bid?.price ?? 0 : top.no.bid?.price ?? 0,
      size,
      status: "OPEN",
      createdAt: now(),
      note: "Close position",
    };
    const result = simulateFill(updatedState, order, top);
    updatedState = result.state;
    orders.push(result.order);
  };

  attemptSell("YES", pos.yesShares);
  attemptSell("NO", pos.noShares);

  updatedState = addLog(updatedState, {
    marketId,
    title,
    timestamp: now(),
    message: "Closed hedged position at top-of-book bids",
  });

  return { state: updatedState, orders };
}

export function summarize(state: PortfolioState) {
  const openPositions = Object.values(state.positions).filter((p) => p.yesShares > 0 || p.noShares > 0);
  return {
    cash: state.cash,
    realizedPnl: state.realizedPnl,
    positions: openPositions.length,
  };
}

export function computeAutoExit(
  pos: Position | undefined,
  top: TopOfBook,
  exitFeeBuffer: number,
): boolean {
  if (!pos) return false;
  const sellValue = (top.yes.bid?.price ?? 0) + (top.no.bid?.price ?? 0);
  return sellValue >= 1 - exitFeeBuffer;
}
