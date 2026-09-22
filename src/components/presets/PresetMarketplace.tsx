import React from 'react';
import { Bookmark, ArrowRight, ShieldCheck, Zap, Cpu, Award, BarChart2 } from 'lucide-react';
import { CURVEFORGE_PRESETS } from '../../domain/presets/preset-library';
import { CurveConfiguration } from '../../domain/curve/curve-types';

interface PresetMarketplaceProps {
  onSelectPreset: (config: CurveConfiguration) => void;
  activeConfigId?: string;
}

export const PresetMarketplace: React.FC<PresetMarketplaceProps> = ({ onSelectPreset, activeConfigId }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'equity':
        return <Award className="w-4 h-4 text-sky-400" />;
      case 'rwa':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'ai_agent':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'community':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'custom':
        return <BarChart2 className="w-4 h-4 text-cyan-400" />;
      default:
        return <Bookmark className="w-4 h-4 text-cf-muted" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'equity':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'rwa':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'ai_agent':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'community':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'custom':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-cf-card border border-cf-border p-6 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-cf-accent" />
              Institutional & Production Curve Presets
            </h2>
            <p className="text-xs text-cf-muted mt-1">
              Engineered configurations optimized for specific market structures, anti-sniper protection, real-world assets, and automated graduation.
            </p>
          </div>
          <div className="text-xs font-mono text-cf-muted bg-cf-dark px-3 py-1.5 rounded border border-cf-border/60">
            {CURVEFORGE_PRESETS.length} Battle-Tested Architectures
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CURVEFORGE_PRESETS.map((preset: CurveConfiguration) => {
          const isSelected = activeConfigId === preset.id;
          const segmentCount = preset.curve.liquidityWeights.length;
          const initialPrice = preset.curve.startPrice;
          const finalPrice = preset.curve.migrationPrice;
          const priceMultiple = (finalPrice / Math.max(1e-12, initialPrice)).toFixed(1);
          const graduationTarget = Number(preset.curve.targetMigrationQuoteThreshold) / Math.pow(10, preset.token.tokenQuoteDecimal);
          const totalSupply = Number(preset.token.totalTokenSupply) / Math.pow(10, preset.token.tokenBaseDecimal);

          return (
            <div
              key={preset.id}
              className={`bg-cf-card border rounded-lg p-5 flex flex-col justify-between transition-all duration-200 hover:border-cf-accent/50 ${
                isSelected ? 'border-cf-accent ring-1 ring-cf-accent/30' : 'border-cf-border'
              }`}
            >
              <div>
                {/* Header tags */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border uppercase ${getCategoryBadgeClass(preset.category)}`}>
                    {getCategoryIcon(preset.category)}
                    {preset.category.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-cf-muted bg-cf-dark px-2 py-0.5 rounded border border-cf-border/50">
                    Quote: {preset.quote.symbol}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-white font-mono mb-2">
                  {preset.name} ({preset.symbol})
                </h3>
                <p className="text-xs text-cf-muted leading-relaxed mb-4 line-clamp-3">
                  {preset.description}
                </p>

                {/* Quantitative Parameters Grid */}
                <div className="grid grid-cols-2 gap-2 bg-cf-dark p-3 rounded border border-cf-border/50 font-mono text-xs mb-4">
                  <div>
                    <span className="text-cf-muted text-[10px] uppercase">Segments</span>
                    <div className="text-white font-medium">{segmentCount} piecewise zones</div>
                  </div>
                  <div>
                    <span className="text-cf-muted text-[10px] uppercase">Price Expansion</span>
                    <div className="text-cf-accent font-medium">{priceMultiple}x range</div>
                  </div>
                  <div>
                    <span className="text-cf-muted text-[10px] uppercase">Graduation Target</span>
                    <div className="text-white font-medium">
                      {graduationTarget.toLocaleString()} {preset.quote.symbol}
                    </div>
                  </div>
                  <div>
                    <span className="text-cf-muted text-[10px] uppercase">Base Fee Schedule</span>
                    <div className="text-cf-emerald font-medium">
                      {(preset.fee.fixedFeeBps / 100).toFixed(2)}%
                      {preset.fee.scheduler && ' (Scheduler)'}
                    </div>
                  </div>
                </div>

                {/* Key Architecture Highlights */}
                <div className="space-y-1 mb-4">
                  <div className="text-[10px] font-mono text-cf-muted uppercase tracking-wider mb-1">Architecture Highlights:</div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li className="text-[11px] text-slate-400">
                      Start: ${initialPrice.toFixed(6)} → End: ${finalPrice.toFixed(6)}
                    </li>
                    <li className="text-[11px] text-slate-400">
                      Total Supply: {(totalSupply / 1_000_000).toFixed(1)}M {preset.symbol}
                    </li>
                    <li className="text-[11px] text-slate-400">
                      Fee split: {preset.fee.creatorTradingFeePercentage}% creator / {100 - preset.fee.creatorTradingFeePercentage}% LP
                    </li>
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-cf-border/60">
                <button
                  onClick={() => onSelectPreset(preset)}
                  className={`w-full py-2 px-3 rounded font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-cf-accent/15 text-cf-accent border border-cf-accent/40 cursor-default'
                      : 'bg-cf-dark hover:bg-cf-accent hover:text-black text-white border border-cf-border hover:border-cf-accent'
                  }`}
                >
                  {isSelected ? (
                    <>Active in Curve Lab</>
                  ) : (
                    <>
                      Load into Curve Lab <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
