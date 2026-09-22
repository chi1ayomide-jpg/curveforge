/**
 * CurveForge Trade Simulation Types
 */

export type OrderType = 'BUY' | 'SELL';

export interface SimulatedTradeInput {
  type: OrderType;
  amount: number;       // Quote amount if BUY, Base token amount if SELL
  traderAddress?: string;
  timestampSeconds?: number;
}

export interface TradeStepResult {
  tradeIndex: number;
  type: OrderType;
  inputAmount: number;
  outputAmount: number;
  feeAmount: number;
  effectivePrice: number;
  priceBefore: number;
  priceAfter: number;
  priceImpactPercent: number;
  graduated: boolean;
  cumulativeQuoteReserve: number;
  cumulativeBaseRemaining: number;
  progressPercent: number;
  segmentsCrossed: number;
}

export interface SimulationResult {
  trades: TradeStepResult[];
  initialPrice: number;
  finalPrice: number;
  totalVolumeQuote: number;
  totalFeesCollectedQuote: number;
  isGraduated: boolean;
  graduationTradeIndex: number | null;
  finalQuoteReserve: number;
  finalBaseRemaining: number;
  finalProgressPercent: number;
}
