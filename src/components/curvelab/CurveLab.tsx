import React, { useState, useMemo } from 'react';
import {
  CurveConfiguration,
  SUPPORTED_QUOTE_TOKENS,
  QuoteMintSymbol,
  BaseFeeModeType,
} from '../../domain/curve/curve-types';
import { compileCurve } from '../../domain/curve/curve-builder';
import { validateCurveConfiguration } from '../../domain/validation/curve-validator';
import { CurveChart } from './CurveChart';
import {
  Sliders,
  DollarSign,
  Zap,
  AlertCircle,
  Plus,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';

interface CurveLabProps {
  config: CurveConfiguration;
  onChangeConfig: (newConfig: CurveConfiguration) => void;
  onNavigateToSimulator: () => void;
  onNavigateToDeploy: () => void;
}

export const CurveLab: React.FC<CurveLabProps> = ({
  config,
  onChangeConfig,
  onNavigateToSimulator,
  onNavigateToDeploy,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'curve' | 'fees' | 'token'>('curve');

  // Compile current curve configuration
  const compiled = useMemo(() => {
    try {
      return compileCurve(config);
    } catch {
      return null;
    }
  }, [config]);

  // Validate current parameters
  const validation = useMemo(() => {
    return validateCurveConfiguration(config);
  }, [config]);

  // Derived telemetry metrics
  const metrics = useMemo(() => {
    const startP = config.curve.checkpoints[0];
    const endP = config.curve.checkpoints[config.curve.checkpoints.length - 1];
    const multiplier = startP > 0 ? endP / startP : 1;
    const quoteThreshold = Number(config.curve.targetMigrationQuoteThreshold) / Math.pow(10, config.token.tokenQuoteDecimal);
    const totalSupply = Number(config.token.totalTokenSupply) / Math.pow(10, config.token.tokenBaseDecimal);
    const fdvGraduation = endP * totalSupply;

    return {
      startPrice: startP,
      endPrice: endP,
      multiplier,
      quoteThreshold,
      totalSupply,
      fdvGraduation,
    };
  }, [config]);

  // Checkpoint handlers
  const handleUpdateCheckpoint = (index: number, newPrice: number) => {
    const updated = [...config.curve.checkpoints];
    updated[index] = newPrice;
    onChangeConfig({
      ...config,
      curve: {
        ...config.curve,
        startPrice: updated[0],
        migrationPrice: updated[updated.length - 1],
        checkpoints: updated,
      },
    });
  };

  const handleUpdateWeight = (index: number, newWeight: number) => {
    const updated = [...config.curve.liquidityWeights];
    updated[index] = Math.max(1, newWeight);
    onChangeConfig({
      ...config,
      curve: {
        ...config.curve,
        liquidityWeights: updated,
      },
    });
  };

  const handleAddCheckpoint = () => {
    if (config.curve.checkpoints.length >= 17) return;
    const cp = config.curve.checkpoints;
    const lastPrice = cp[cp.length - 1];
    const newPrice = lastPrice * 1.5;
    const updatedCp = [...cp, newPrice];
    const updatedWeights = [...config.curve.liquidityWeights, 1];

    onChangeConfig({
      ...config,
      curve: {
        ...config.curve,
        migrationPrice: newPrice,
        checkpoints: updatedCp,
        liquidityWeights: updatedWeights,
      },
    });
  };

  const handleRemoveCheckpoint = (index: number) => {
    if (config.curve.checkpoints.length <= 2) return;
    const updatedCp = config.curve.checkpoints.filter((_, i) => i !== index);
    const updatedWeights = config.curve.liquidityWeights.slice(0, updatedCp.length - 1);

    onChangeConfig({
      ...config,
      curve: {
        ...config.curve,
        startPrice: updatedCp[0],
        migrationPrice: updatedCp[updatedCp.length - 1],
        checkpoints: updatedCp,
        liquidityWeights: updatedWeights,
      },
    });
  };

  const handleQuoteChange = (symbol: QuoteMintSymbol) => {
    const quoteToken = SUPPORTED_QUOTE_TOKENS[symbol];
    onChangeConfig({
      ...config,
      quote: quoteToken,
      token: {
        ...config.token,
        tokenQuoteDecimal: quoteToken.decimals,
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono text-white tracking-tight">Curve Lab</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-dark-800 text-slate-300 border border-dark-700">
              {config.name}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30 uppercase">
              {config.category}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Visual piecewise parameter designer for Meteora Dynamic Bonding Curves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700 font-mono text-xs transition-all"
          >
            Simulate Trades
            <ArrowUpRight className="w-3.5 h-3.5 text-brand-400" />
          </button>
          <button
            onClick={onNavigateToDeploy}
            disabled={!validation.isValid}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono text-xs font-semibold shadow-md shadow-brand-500/20 transition-all"
          >
            Proceed to Deploy
          </button>
        </div>
      </div>

      {/* Real-time Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-dark-900 border border-dark-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400">Start Price</div>
          <div className="text-sm font-bold font-mono text-white mt-1">
            {metrics.startPrice.toFixed(metrics.startPrice < 0.001 ? 8 : 4)}
          </div>
          <div className="text-[10px] font-mono text-slate-500">{config.quote.symbol}</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400">Migration Price</div>
          <div className="text-sm font-bold font-mono text-brand-400 mt-1">
            {metrics.endPrice.toFixed(metrics.endPrice < 0.001 ? 8 : 4)}
          </div>
          <div className="text-[10px] font-mono text-slate-500">{config.quote.symbol}</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400">Price Multiple</div>
          <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
            {metrics.multiplier.toFixed(2)}x
          </div>
          <div className="text-[10px] font-mono text-slate-500">Discovery Corridor</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400">Graduation Target</div>
          <div className="text-sm font-bold font-mono text-white mt-1">
            {metrics.quoteThreshold.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-slate-500">{config.quote.symbol} Reserve</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400">Implied FDV @ Grad</div>
          <div className="text-sm font-bold font-mono text-amber-400 mt-1">
            ${(metrics.fdvGraduation).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] font-mono text-slate-500">Post-Migration Cap</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400">Curve Segments</div>
          <div className="text-sm font-bold font-mono text-white mt-1">
            {config.curve.checkpoints.length - 1} / 16
          </div>
          <div className="text-[10px] font-mono text-slate-500">Meteora Limit</div>
        </div>
      </div>

      {/* Interactive Visual Curve Chart */}
      {compiled ? (
        <CurveChart
          compiled={compiled}
          baseDecimals={config.token.tokenBaseDecimal}
          quoteDecimals={config.token.tokenQuoteDecimal}
          quoteSymbol={config.quote.symbol}
          baseSymbol={config.symbol}
        />
      ) : (
        <div className="p-8 bg-dark-900 border border-dark-800 rounded-xl text-center text-rose-400 font-mono text-xs">
          Invalid curve geometry. Please ensure checkpoint prices strictly increase.
        </div>
      )}

      {/* Validation Warnings / Errors Banner */}
      {!validation.isValid && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs font-mono text-rose-300">
            <div className="font-semibold mb-1">Meteora Configuration Validation Failed:</div>
            <ul className="list-disc list-inside space-y-0.5">
              {validation.issues
                .filter((i) => i.severity === 'error')
                .map((iss, idx) => (
                  <li key={idx}>{iss.message}</li>
                ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tabbed Configuration Control Section */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
        <div className="flex items-center gap-4 border-b border-dark-800 pb-3 mb-5">
          <button
            onClick={() => setActiveSubTab('curve')}
            className={`flex items-center gap-2 pb-2 text-xs font-mono font-semibold border-b-2 transition-all ${
              activeSubTab === 'curve'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Checkpoints & Weights
          </button>
          <button
            onClick={() => setActiveSubTab('fees')}
            className={`flex items-center gap-2 pb-2 text-xs font-mono font-semibold border-b-2 transition-all ${
              activeSubTab === 'fees'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Fees & Dynamic Schedulers
          </button>
          <button
            onClick={() => setActiveSubTab('token')}
            className={`flex items-center gap-2 pb-2 text-xs font-mono font-semibold border-b-2 transition-all ${
              activeSubTab === 'token'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Token & Quote Asset
          </button>
        </div>

        {/* SUBTAB 1: Checkpoints & Weights */}
        {activeSubTab === 'curve' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300">
                Curve Segments ({config.curve.checkpoints.length - 1})
              </span>
              <button
                onClick={handleAddCheckpoint}
                disabled={config.curve.checkpoints.length >= 17}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-brand-400 border border-dark-700 text-xs font-mono disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add Segment
              </button>
            </div>

            <div className="space-y-3">
              {config.curve.checkpoints.map((cpPrice, idx) => {
                const isStart = idx === 0;
                const isEnd = idx === config.curve.checkpoints.length - 1;
                const weight = !isEnd ? config.curve.liquidityWeights[idx] : null;

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-950 p-3 rounded-lg border border-dark-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center font-mono text-[11px] text-brand-400">
                        {idx}
                      </div>
                      <div>
                        <div className="text-xs font-mono font-medium text-white">
                          {isStart ? 'Starting Price' : isEnd ? 'Migration Graduation Price' : `Checkpoint ${idx}`}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {isStart ? 'Lower bound' : isEnd ? 'Graduation threshold' : `Segment ${idx} upper bound`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Price Input */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-400">Price:</span>
                        <input
                          type="number"
                          step="any"
                          value={cpPrice}
                          onChange={(e) => handleUpdateCheckpoint(idx, parseFloat(e.target.value) || 0)}
                          className="w-32 bg-dark-900 border border-dark-700 rounded px-2 py-1 font-mono text-xs text-white focus:outline-none focus:border-brand-500"
                        />
                        <span className="text-[11px] font-mono text-slate-400">{config.quote.symbol}</span>
                      </div>

                      {/* Weight Input (if not last checkpoint) */}
                      {weight !== null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono text-slate-400">Weight:</span>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={weight}
                            onChange={(e) => handleUpdateWeight(idx, parseInt(e.target.value) || 1)}
                            className="w-16 bg-dark-900 border border-dark-700 rounded px-2 py-1 font-mono text-xs text-white focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      )}

                      {/* Delete Button (only intermediate checkpoints) */}
                      {!isStart && !isEnd && (
                        <button
                          onClick={() => handleRemoveCheckpoint(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove Checkpoint"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 2: Fees & Dynamic Schedulers */}
        {activeSubTab === 'fees' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <label className="text-xs font-mono text-slate-300 font-semibold">Base Fee Mode</label>
              <select
                value={config.fee.baseFeeMode}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    fee: {
                      ...config.fee,
                      baseFeeMode: e.target.value as BaseFeeModeType,
                    },
                  })
                }
                className="bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
              >
                <option value="Fixed">Fixed Fee</option>
                <option value="FeeSchedulerLinear">Linear Fee Scheduler (Decays over time)</option>
                <option value="FeeSchedulerExponential">Exponential Fee Scheduler (Anti-Snipe decay)</option>
                <option value="RateLimiter">Rate Limiter (Fees scale with trade size)</option>
              </select>

              {config.fee.baseFeeMode === 'Fixed' && (
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Trading Fee (BPS)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.fee.fixedFeeBps}
                      onChange={(e) =>
                        onChangeConfig({
                          ...config,
                          fee: {
                            ...config.fee,
                            fixedFeeBps: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white w-28 focus:outline-none focus:border-brand-500"
                    />
                    <span className="text-xs font-mono text-slate-400">
                      = {(config.fee.fixedFeeBps / 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              {config.fee.baseFeeMode !== 'Fixed' && config.fee.scheduler && (
                <div className="bg-dark-950 border border-dark-800 p-3 rounded-lg space-y-3">
                  <div className="text-[11px] font-mono text-brand-400 font-semibold">
                    Fee Scheduler Parameters
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Starting Fee (BPS):</span>
                      <input
                        type="number"
                        value={config.fee.scheduler.startingFeeBps}
                        onChange={(e) =>
                          onChangeConfig({
                            ...config,
                            fee: {
                              ...config.fee,
                              scheduler: {
                                ...config.fee.scheduler!,
                                startingFeeBps: parseInt(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-full bg-dark-900 border border-dark-700 rounded px-2 py-1 text-xs font-mono text-white mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Ending Fee (BPS):</span>
                      <input
                        type="number"
                        value={config.fee.scheduler.endingFeeBps}
                        onChange={(e) =>
                          onChangeConfig({
                            ...config,
                            fee: {
                              ...config.fee,
                              scheduler: {
                                ...config.fee.scheduler!,
                                endingFeeBps: parseInt(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-full bg-dark-900 border border-dark-700 rounded px-2 py-1 text-xs font-mono text-white mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Duration (Seconds):</span>
                      <input
                        type="number"
                        value={config.fee.scheduler.totalDurationSeconds}
                        onChange={(e) =>
                          onChangeConfig({
                            ...config,
                            fee: {
                              ...config.fee,
                              scheduler: {
                                ...config.fee.scheduler!,
                                totalDurationSeconds: parseInt(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-full bg-dark-900 border border-dark-700 rounded px-2 py-1 text-xs font-mono text-white mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-dark-950 border border-dark-800 p-3 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300 font-semibold">Dynamic Volatility Fee</span>
                  <input
                    type="checkbox"
                    checked={config.fee.dynamicFee.enabled}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        fee: {
                          ...config.fee,
                          dynamicFee: { enabled: e.target.checked },
                        },
                      })
                    }
                    className="w-4 h-4 rounded text-brand-500 bg-dark-800 border-dark-700"
                  />
                </div>
                <p className="text-[11px] font-mono text-slate-400">
                  Meteora DBC automatically accumulates volatility during rapid price discovery, raising fees during frenzies and decaying when trading stabilizes.
                </p>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">
                  Creator Fee Share: {config.fee.creatorTradingFeePercentage}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.fee.creatorTradingFeePercentage}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      fee: {
                        ...config.fee,
                        creatorTradingFeePercentage: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full accent-brand-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>0% (All to Partner)</span>
                  <span>50% Split</span>
                  <span>100% (All to Creator)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: Token & Quote Asset */}
        {activeSubTab === 'token' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Quote Asset</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SOL', 'USDC', 'USDG'] as QuoteMintSymbol[]).map((sym) => (
                    <button
                      key={sym}
                      onClick={() => handleQuoteChange(sym)}
                      className={`p-2.5 rounded-lg border font-mono text-xs flex items-center justify-center gap-2 transition-all ${
                        config.quote.symbol === sym
                          ? 'bg-brand-500/20 border-brand-500 text-white font-bold'
                          : 'bg-dark-950 border-dark-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-brand-400">{SUPPORTED_QUOTE_TOKENS[sym].icon}</span>
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Token Name</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => onChangeConfig({ ...config, name: e.target.value })}
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Token Symbol</label>
                <input
                  type="text"
                  value={config.symbol}
                  onChange={(e) => onChangeConfig({ ...config, symbol: e.target.value })}
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">
                  Migration Quote Threshold ({config.quote.symbol})
                </label>
                <input
                  type="number"
                  value={metrics.quoteThreshold}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1;
                    const atoms = BigInt(Math.floor(val * Math.pow(10, config.token.tokenQuoteDecimal)));
                    onChangeConfig({
                      ...config,
                      curve: {
                        ...config.curve,
                        targetMigrationQuoteThreshold: atoms,
                      },
                    });
                  }}
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                />
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  When pool accumulates this quote volume, it triggers graduation to Meteora DAMM v2.
                </p>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Total Token Supply</label>
                <input
                  type="number"
                  value={metrics.totalSupply}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1;
                    const atoms = BigInt(Math.floor(val * Math.pow(10, config.token.tokenBaseDecimal)));
                    onChangeConfig({
                      ...config,
                      token: {
                        ...config.token,
                        totalTokenSupply: atoms,
                      },
                    });
                  }}
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
