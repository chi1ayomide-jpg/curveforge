import { SimulatedTradeInput } from './simulation-types';

export type ScenarioPresetType =
  | 'RETAIL_LADDER'
  | 'WHALE_ENTRY'
  | 'GRADUATION_RUSH'
  | 'MICRO_TRADES';

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
    description: '15 sequential organic trades of moderate sizes testing steady price appreciation.',
    generateTrades: (threshold) => {
      const step = threshold / 25;
      const trades: SimulatedTradeInput[] = [];
      for (let i = 1; i <= 15; i++) {
        // Deterministic variation based on index
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
    description: 'A single 35% capacity buy order followed by 8 small market participants.',
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
    description: 'Sufficient volume to guarantee 100% completion into Meteora DAMM v2 migration.',
    generateTrades: (threshold) => {
      const trades: SimulatedTradeInput[] = [];
      const portions = [0.20, 0.25, 0.25, 0.25, 0.15, 0.10]; // Total 1.20x threshold (covers fee deduction)
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
    name: 'High Frequency Micro-Buys',
    description: '25 high-frequency low-value buys testing fee accumulation and curve sensitivity.',
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
};
