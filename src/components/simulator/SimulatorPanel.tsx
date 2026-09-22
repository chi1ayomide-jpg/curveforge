import React, { useState, useMemo } from 'react';
import { Play, RotateCcw, CheckCircle2, TrendingUp, DollarSign, Activity, Layers } from 'lucide-react';
import { CurveConfiguration } from '../../domain/curve/curve-types';
import { compileCurve } from '../../domain/curve/curve-builder';
import { SimulationEngine } from '../../domain/simulation/simulation-engine';
import { SCENARIOS, ScenarioPresetType } from '../../domain/simulation/scenario-runner';
import { TradeStepResult, SimulationResult } from '../../domain/simulation/simulation-types';

interface SimulatorPanelProps {
  config: CurveConfiguration;
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({ config }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioPresetType>('RETAIL_LADDER');

  const compiled = useMemo(() => {
    try {
      return compileCurve(config);
    } catch {
      return null;
    }
  }, [config]);

  const quoteThreshold = useMemo(() => {
    return Number(config.curve.targetMigrationQuoteThreshold) / Math.pow(10, config.token.tokenQuoteDecimal);
  }, [config]);

  // Run selected scenario
  const scenarioResult: { scenario: typeof SCENARIOS['RETAIL_LADDER']; sim: SimulationResult } | null = useMemo(() => {
    if (!compiled) return null;
    const scenario = SCENARIOS[selectedScenarioId] || SCENARIOS.RETAIL_LADDER;
    const trades = scenario.generateTrades(quoteThreshold);
    const engine = new SimulationEngine(config, compiled);
    const sim = engine.runSimulation(trades);
    return { scenario, sim };
  }, [config, compiled, selectedScenarioId, quoteThreshold]);

  // Custom sandbox trade state
  const [customTradeAmount, setCustomTradeAmount] = useState<number>(10);
  const [customTradesHistory, setCustomTradesHistory] = useState<TradeStepResult[]>([]);
  const customEngine = useMemo(() => {
    if (!compiled) return null;
    return new SimulationEngine(config, compiled);
  }, [config, compiled]);

  const handleResetSandbox = () => {
    if (customEngine) {
      customEngine.reset();
    }
    setCustomTradesHistory([]);
  };

  const handleExecuteSandboxTrade = () => {
    if (!customEngine || customTradeAmount <= 0) return;
    const nextIndex = customTradesHistory.length + 1;
    const result = customEngine.executeBuy(customTradeAmount, nextIndex, nextIndex * 15);
    setCustomTradesHistory(prev => [...prev, result]);
  };

  // Trajectory coordinates for SVG plot
  const trajectoryPoints = useMemo(() => {
    if (!scenarioResult || scenarioResult.sim.trades.length === 0 || !compiled) return [];
    const minPrice = compiled.startPrice;
    const maxPrice = compiled.graduationPrice * 1.05;
    const trades = scenarioResult.sim.trades;
    const totalSteps = trades.length;

    return trades.map((res: TradeStepResult, index: number) => {
      const x = 50 + (index / Math.max(1, totalSteps - 1)) * 580;
      const normalizedY = (res.priceAfter - minPrice) / Math.max(1e-12, maxPrice - minPrice);
      const clampedY = Math.max(0, Math.min(1, normalizedY));
      const y = 200 - clampedY * 160;
      return { x, y, price: res.priceAfter, step: index + 1, impact: res.priceImpactPercent };
    });
  }, [scenarioResult, compiled]);

  if (!compiled) {
    return (
      <div className="bg-cf-card border border-cf-border p-6 rounded-lg text-center font-mono text-xs text-amber-400">
        Please configure valid curve checkpoints and prices in the Curve Lab first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Scenario Picker */}
      <div className="bg-cf-card border border-cf-border p-6 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cf-border/60 pb-5 mb-5">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-cf-accent" />
              Deterministic Multi-Segment Trade Simulator
            </h2>
            <p className="text-xs text-cf-muted mt-1">
              Executes exact constant-product trade slices across piecewise Meteora DBC liquidity segments with dynamic fee calculation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-cf-muted font-mono uppercase tracking-wider">Test Scenario:</span>
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value as ScenarioPresetType)}
              aria-label="Test Scenario"
              className="bg-cf-dark border border-cf-border text-white text-xs font-mono rounded px-3 py-2 focus:outline-none focus:border-cf-accent cursor-pointer"
            >
              {Object.values(SCENARIOS).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scenario description & key summary tiles */}
        {scenarioResult && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-cf-dark border border-cf-border/60 p-4 rounded">
                <div className="text-xs text-cf-muted uppercase font-mono">Final Quote Reserve</div>
                <div className="text-lg font-bold font-mono text-cf-accent mt-1">
                  {scenarioResult.sim.finalQuoteReserve.toLocaleString(undefined, { maximumFractionDigits: 2 })} {config.quote.symbol}
                </div>
                <div className="text-[11px] text-cf-muted mt-0.5">
                  Target: {quoteThreshold.toLocaleString()} {config.quote.symbol}
                </div>
              </div>

              <div className="bg-cf-dark border border-cf-border/60 p-4 rounded">
                <div className="text-xs text-cf-muted uppercase font-mono">Final Spot Price</div>
                <div className="text-lg font-bold font-mono text-white mt-1">
                  ${scenarioResult.sim.finalPrice.toFixed(6)}
                </div>
                <div className="text-[11px] text-cf-muted mt-0.5">
                  Base Remaining: {(scenarioResult.sim.finalBaseRemaining / 1_000_000).toFixed(2)}M
                </div>
              </div>

              <div className="bg-cf-dark border border-cf-border/60 p-4 rounded">
                <div className="text-xs text-cf-muted uppercase font-mono">Cumulative Fees</div>
                <div className="text-lg font-bold font-mono text-cf-emerald mt-1">
                  {scenarioResult.sim.totalFeesCollectedQuote.toFixed(4)} {config.quote.symbol}
                </div>
                <div className="text-[11px] text-cf-muted mt-0.5">
                  Base Fee: {(config.fee.fixedFeeBps / 100).toFixed(2)}%
                </div>
              </div>

              <div className="bg-cf-dark border border-cf-border/60 p-4 rounded">
                <div className="text-xs text-cf-muted uppercase font-mono">Graduation Status</div>
                <div className="flex items-center gap-2 mt-1">
                  {scenarioResult.sim.isGraduated ? (
                    <span className="flex items-center gap-1 text-sm font-bold text-cf-emerald font-mono bg-cf-emerald/10 px-2 py-0.5 rounded border border-cf-emerald/30">
                      <CheckCircle2 className="w-4 h-4" /> Ready for DAMM v2
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                      {scenarioResult.sim.finalProgressPercent.toFixed(1)}% of Target
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-cf-muted mt-0.5">
                  Trades: {scenarioResult.sim.trades.length} executed
                </div>
              </div>
            </div>

            {/* Price Trajectory SVG Chart */}
            <div className="border border-cf-border/70 rounded bg-cf-dark p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-medium text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cf-accent" /> Price Path Trajectory Across Scenario
                </span>
                <span className="text-[11px] font-mono text-cf-muted">
                  {scenarioResult.sim.trades.length} Simulated Trades Execution
                </span>
              </div>

              <div className="w-full h-56 relative bg-cf-darker rounded border border-cf-border/40 overflow-hidden">
                <svg viewBox="0 0 680 220" className="w-full h-full">
                  {/* Grid Lines */}
                  <line x1="50" y1="40" x2="630" y2="40" stroke="#22272e" strokeDasharray="3 3" />
                  <line x1="50" y1="95" x2="630" y2="95" stroke="#22272e" strokeDasharray="3 3" />
                  <line x1="50" y1="150" x2="630" y2="150" stroke="#22272e" strokeDasharray="3 3" />
                  <line x1="50" y1="200" x2="630" y2="200" stroke="#2a313c" />

                  {/* Graduation target line */}
                  <line x1="50" y1="50" x2="630" y2="50" stroke="#4ade80" strokeDasharray="4 4" strokeWidth="1" strokeOpacity="0.4" />
                  <text x="635" y="54" fill="#4ade80" fontSize="9" fontFamily="JetBrains Mono" opacity="0.7">Graduation</text>

                  {/* Trajectory Polyline */}
                  {trajectoryPoints.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      points={trajectoryPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  )}

                  {/* Trajectory Points */}
                  {trajectoryPoints.map((p, i) => (
                    <g key={i}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={p.impact > 5 ? 4.5 : 3}
                        fill={p.impact > 5 ? '#f59e0b' : '#38bdf8'}
                        stroke="#0b0f17"
                        strokeWidth="1.5"
                      />
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Trade Execution Ledger Table */}
      {scenarioResult && (
        <div className="bg-cf-card border border-cf-border p-6 rounded-lg">
          <h3 className="text-base font-bold text-white font-mono mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cf-accent" />
            Trade-by-Trade Execution Ledger ({scenarioResult.sim.trades.length} steps)
          </h3>

          <div className="overflow-x-auto border border-cf-border/60 rounded">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-cf-dark text-cf-muted uppercase border-b border-cf-border/60">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Input</th>
                  <th className="py-2.5 px-3">Output Base</th>
                  <th className="py-2.5 px-3">Effective Price</th>
                  <th className="py-2.5 px-3">Impact</th>
                  <th className="py-2.5 px-3">Fee Paid</th>
                  <th className="py-2.5 px-3">Crossed</th>
                  <th className="py-2.5 px-3">Quote Reserve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cf-border/40">
                {scenarioResult.sim.trades.map((res: TradeStepResult, idx: number) => (
                  <tr key={idx} className="hover:bg-cf-dark/60 transition-colors">
                    <td className="py-2 px-3 text-cf-muted">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cf-emerald/15 text-cf-emerald border border-cf-emerald/30">
                        {res.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-white">
                      {res.inputAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
                      <span className="text-cf-muted text-[10px]">{config.quote.symbol}</span>
                    </td>
                    <td className="py-2 px-3 text-white font-medium">
                      {res.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
                      <span className="text-cf-muted text-[10px]">{config.symbol}</span>
                    </td>
                    <td className="py-2 px-3 text-cf-accent">
                      ${res.effectivePrice.toFixed(6)}
                    </td>
                    <td className={`py-2 px-3 ${res.priceImpactPercent > 5 ? 'text-amber-400 font-bold' : 'text-cf-muted'}`}>
                      {res.priceImpactPercent.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-cf-muted">
                      {res.feeAmount.toFixed(4)} {config.quote.symbol}
                    </td>
                    <td className="py-2 px-3 text-white">
                      {res.segmentsCrossed > 0 ? (
                        <span className="text-amber-400 font-bold">+{res.segmentsCrossed} segs</span>
                      ) : (
                        <span className="text-cf-muted">0 segs</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-cf-muted">
                      {res.cumulativeQuoteReserve.toFixed(2)} {config.quote.symbol}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Interactive Sandbox Trader */}
      <div className="bg-cf-card border border-cf-border p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cf-accent" />
              Manual Sandbox Trade Executor
            </h3>
            <p className="text-xs text-cf-muted mt-0.5">
              Step through arbitrary live buys to test custom stress conditions against your piecewise curve configuration.
            </p>
          </div>
          <button
            onClick={handleResetSandbox}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-cf-muted hover:text-white bg-cf-dark border border-cf-border rounded hover:border-cf-border/80 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Sandbox
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-cf-dark p-4 rounded border border-cf-border/60">
          <div>
            <label className="block text-xs font-mono text-cf-muted mb-1">
              Buy Amount ({config.quote.symbol})
            </label>
            <input
              type="number"
              step="any"
              value={customTradeAmount}
              onChange={(e) => setCustomTradeAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-cf-card border border-cf-border text-white text-xs font-mono rounded px-3 py-2 focus:outline-none focus:border-cf-accent"
            />
          </div>

          <div className="text-xs font-mono">
            <span className="text-cf-muted">Sandbox Ledger:</span>
            <div className="text-white font-medium mt-0.5">
              Trades Executed: {customTradesHistory.length}
            </div>
            <div className="text-cf-accent text-[11px]">
              Latest Spot: $
              {customTradesHistory.length > 0
                ? customTradesHistory[customTradesHistory.length - 1].priceAfter.toFixed(6)
                : compiled.startPrice.toFixed(6)}
            </div>
          </div>

          <div>
            <button
              onClick={handleExecuteSandboxTrade}
              className="w-full bg-cf-accent hover:bg-cf-accent-hover text-black font-mono font-bold text-xs py-2 px-4 rounded flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cf-accent/10"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Execute Step
            </button>
          </div>
        </div>

        {/* Custom Trades History if any */}
        {customTradesHistory.length > 0 && (
          <div className="mt-4 border-t border-cf-border/60 pt-4">
            <div className="text-xs font-mono text-cf-muted mb-2">Sandbox Ledger ({customTradesHistory.length} trades executed):</div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {customTradesHistory.map((res: TradeStepResult, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs font-mono bg-cf-dark px-3 py-1.5 rounded border border-cf-border/40">
                  <span className="text-cf-emerald font-bold">
                    #{i + 1} BUY {res.inputAmount} {config.quote.symbol} → {res.outputAmount.toFixed(4)} {config.symbol}
                  </span>
                  <span className="text-cf-accent">Spot: ${res.priceAfter.toFixed(6)}</span>
                  <span className="text-cf-muted">Impact: {res.priceImpactPercent.toFixed(2)}%</span>
                  <span className="text-cf-muted">Quote Res: {res.cumulativeQuoteReserve.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
