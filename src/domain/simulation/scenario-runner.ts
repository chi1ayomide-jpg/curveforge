import { SimulatedTradeInput } from './simulation-types';

export type ScenarioPresetType =
  | 'RETAIL_LADDER'
  | 'WHALE_ENTRY'
  | 'GRADUATION_RUSH'
  | 'MICRO_TRADES'
  | 'MIXED_SWAPS'
  | 'ARBITRAGE_CYCLE';

export interface ScenarioDefinition {
  id: ScenarioPresetType;
  name: string;
  description: string;
  generateTrades: (totalQuoteThreshold: number) => SimulatedTradeInput[];
}

export const SCENARIOS: Record<ScenarioPresetType, ScenarioDefinition> = {
  RETAIL_LADDER: {
    id: 'RETAIL_LADDER',
    name: 'Retail Buy Ladder',
    description: '15 sequential organic buys of moderate sizes, testing steady price appreciation across segments.',
    generateTrades: (threshold) => {
      const step = threshold / 25;
      const trades: SimulatedTradeInput[] = [];
      for (let i = 1; i <= 15; i++) {
        const variation = 0.8 + (i % 5) * 0.1;
        trades.push({
          type: 'BUY',
          amount: parseFloat((step * variation).toFixed(4)),
          timestampSeconds: 15,
        });
      }
      return trades;
    },
  },
  WHALE_ENTRY: {
    id: 'WHALE_ENTRY',
    name: 'Whale Entry & Follow-On',
    description: 'A single 35%-capacity buy order followed by 8 small retail market participants.',
    generateTrades: (threshold) => {
      const trades: SimulatedTradeInput[] = [
        {
          type: 'BUY',
          amount: parseFloat((threshold * 0.35).toFixed(4)),
          timestampSeconds: 5,
        },
      ];
      const smallStep = threshold / 40;
      for (let i = 1; i <= 8; i++) {
        trades.push({
          type: 'BUY',
          amount: parseFloat((smallStep * (0.9 + (i % 3) * 0.1)).toFixed(4)),
          timestampSeconds: 20,
        });
      }
      return trades;
    },
  },
  GRADUATION_RUSH: {
    id: 'GRADUATION_RUSH',
    name: 'Full Path to Graduation',
    description: 'Sufficient cumulative buy volume (1.2x threshold) to guarantee 100% migration into Meteora DAMM v2.',
    generateTrades: (threshold) => {
      const trades: SimulatedTradeInput[] = [];
      const portions = [0.20, 0.25, 0.25, 0.25, 0.15, 0.10];
      for (let i = 0; i < portions.length; i++) {
        trades.push({
          type: 'BUY',
          amount: parseFloat((threshold * portions[i]).toFixed(4)),
          timestampSeconds: 30,
        });
      }
      return trades;
    },
  },
  MICRO_TRADES: {
    id: 'MICRO_TRADES',
    name: 'High-Frequency Micro-Buys',
    description: '25 high-frequency low-value buys testing fee accumulation and per-segment price sensitivity.',
    generateTrades: (threshold) => {
      const step = threshold / 80;
      const trades: SimulatedTradeInput[] = [];
      for (let i = 1; i <= 25; i++) {
        trades.push({
          type: 'BUY',
          amount: parseFloat((step * (1 + (i % 4) * 0.05)).toFixed(4)),
          timestampSeconds: 5,
        });
      }
      return trades;
    },
  },
  MIXED_SWAPS: {
    id: 'MIXED_SWAPS',
    name: 'Alternating Buy / Sell Pressure',
    description: 'Interleaved BUY and SELL trades simulating real two-sided market activity. Tests reverse constant-product traversal and net price drift.',
    generateTrades: (threshold) => {
      // 3 large buys to build up quote reserve, then alternating small buys and sells
      const bigBuy = threshold * 0.18;
      const smallBuy = threshold * 0.07;
      const smallSell = threshold * 0.04; // sell is base→quote; amount is quote-equivalent context
      const trades: SimulatedTradeInput[] = [
        { type: 'BUY', amount: parseFloat(bigBuy.toFixed(4)), timestampSeconds: 10 },
        { type: 'BUY', amount: parseFloat(bigBuy.toFixed(4)), timestampSeconds: 10 },
        { type: 'BUY', amount: parseFloat(bigBuy.toFixed(4)), timestampSeconds: 10 },
        { type: 'SELL', amount: parseFloat(smallSell.toFixed(4)), timestampSeconds: 5 },
        { type: 'BUY', amount: parseFloat(smallBuy.toFixed(4)), timestampSeconds: 5 },
        { type: 'SELL', amount: parseFloat(smallSell.toFixed(4)), timestampSeconds: 5 },
        { type: 'BUY', amount: parseFloat(smallBuy.toFixed(4)), timestampSeconds: 5 },
        { type: 'SELL', amount: parseFloat((smallSell * 1.5).toFixed(4)), timestampSeconds: 5 },
        { type: 'BUY', amount: parseFloat((smallBuy * 1.2).toFixed(4)), timestampSeconds: 5 },
        { type: 'SELL', amount: parseFloat(smallSell.toFixed(4)), timestampSeconds: 5 },
        { type: 'BUY', amount: parseFloat(smallBuy.toFixed(4)), timestampSeconds: 5 },
        { type: 'BUY', amount: parseFloat((bigBuy * 0.8).toFixed(4)), timestampSeconds: 10 },
      ];
      return trades;
    },
  },
  ARBITRAGE_CYCLE: {
    id: 'ARBITRAGE_CYCLE',
    name: 'Arbitrage Cycle (Buy → Sell Reversal)',
    description: 'A large buy pushes price across multiple segments, followed by a proportional sell-back testing multi-segment reverse traversal and net slippage.',
    generateTrades: (threshold) => {
      // Buy up to 60% of curve, then sell back ~half
      const largeBuy = threshold * 0.30;
      const medBuy   = threshold * 0.20;
      const largeSell = threshold * 0.22; // expressed as quote-equivalent target
      const smallBuy = threshold * 0.08;
      const trades: SimulatedTradeInput[] = [
        { type: 'BUY',  amount: parseFloat(largeBuy.toFixed(4)),  timestampSeconds: 15 },
        { type: 'BUY',  amount: parseFloat(medBuy.toFixed(4)),    timestampSeconds: 10 },
        { type: 'SELL', amount: parseFloat(largeSell.toFixed(4)), timestampSeconds: 5  },
        { type: 'BUY',  amount: parseFloat(smallBuy.toFixed(4)),  timestampSeconds: 5  },
        { type: 'BUY',  amount: parseFloat((smallBuy * 0.7).toFixed(4)), timestampSeconds: 5 },
        { type: 'SELL', amount: parseFloat((largeSell * 0.4).toFixed(4)), timestampSeconds: 5 },
        { type: 'BUY',  amount: parseFloat(medBuy.toFixed(4)),    timestampSeconds: 10 },
      ];
      return trades;
    },
  },
};
