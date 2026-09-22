import React, { useState, useMemo } from 'react';
import { CompiledCurve, sampleCurveCoordinates } from '../../domain/curve/curve-builder';

interface CurveChartProps {
  compiled: CompiledCurve;
  baseDecimals: number;
  quoteDecimals: number;
  quoteSymbol: string;
  baseSymbol: string;
  currentProgressPercent?: number;
}

export const CurveChart: React.FC<CurveChartProps> = ({
  compiled,
  baseDecimals,
  quoteDecimals,
  quoteSymbol,
  baseSymbol,
  currentProgressPercent = 0,
}) => {
  const [hoverCoord, setHoverCoord] = useState<{
    quote: number;
    price: number;
    base: number;
    progress: number;
    x: number;
    y: number;
  } | null>(null);

  // Generate 25 points per segment for high-resolution piecewise graph
  const sampled = useMemo(() => {
    try {
      return sampleCurveCoordinates(compiled, baseDecimals, quoteDecimals, 25);
    } catch {
      return [];
    }
  }, [compiled, baseDecimals, quoteDecimals]);

  const { minPrice, maxPrice, maxQuote } = useMemo(() => {
    if (sampled.length === 0) return { minPrice: 0, maxPrice: 1, maxQuote: 1 };
    let minP = sampled[0].price;
    let maxP = sampled[0].price;
    let maxQ = sampled[sampled.length - 1].quoteInvested;

    for (const pt of sampled) {
      if (pt.price < minP) minP = pt.price;
      if (pt.price > maxP) maxP = pt.price;
    }
    return { minPrice: minP * 0.9, maxPrice: maxP * 1.08, maxQuote: maxQ || 1 };
  }, [sampled]);

  // Chart dimensions
  const width = 800;
  const height = 340;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Coordinate projection
  const projectX = (quote: number) => padLeft + (quote / maxQuote) * chartW;
  const projectY = (price: number) =>
    padTop + chartH - ((price - minPrice) / (maxPrice - minPrice || 1)) * chartH;

  // Build SVG path
  const pathD = useMemo(() => {
    if (sampled.length < 2) return '';
    return sampled.reduce((acc, pt, i) => {
      const x = projectX(pt.quoteInvested);
      const y = projectY(pt.price);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [sampled, minPrice, maxPrice, maxQuote]);

  // Area fill path
  const areaD = useMemo(() => {
    if (!pathD || sampled.length < 2) return '';
    const lastX = projectX(sampled[sampled.length - 1].quoteInvested);
    const firstX = projectX(sampled[0].quoteInvested);
    const bottomY = padTop + chartH;
    return `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pathD, sampled, minPrice, maxPrice, maxQuote]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (mouseX - padLeft) / chartW));
    const targetQuote = ratio * maxQuote;

    // Find nearest point
    let closest = sampled[0];
    let minDiff = Infinity;
    for (const pt of sampled) {
      const diff = Math.abs(pt.quoteInvested - targetQuote);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }

    if (closest) {
      setHoverCoord({
        quote: closest.quoteInvested,
        price: closest.price,
        base: closest.baseCirculating,
        progress: closest.progressPercent,
        x: projectX(closest.quoteInvested),
        y: projectY(closest.price),
      });
    }
  };

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex flex-col gap-3 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
          <span className="font-semibold text-white">Piecewise DBC Bonding Curve</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">P = Quote / Base vs Total Quote Invested</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <div>
            Segments: <span className="text-brand-400 font-semibold">{compiled.segments.length}</span>
          </div>
          <div>
            Graduation: <span className="text-emerald-400 font-semibold">{maxQuote.toLocaleString(undefined, { maximumFractionDigits: 2 })} {quoteSymbol}</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCoord(null)}
        >
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="80%" stopColor="#ea580c" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#07090e" stopOpacity="0" />
            </linearGradient>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#161e2c" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect x={padLeft} y={padTop} width={chartW} height={chartH} fill="url(#grid)" />

          {/* Border lines */}
          <line x1={padLeft} y1={padTop + chartH} x2={padLeft + chartW} y2={padTop + chartH} stroke="#334460" strokeWidth="1.5" />
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + chartH} stroke="#334460" strokeWidth="1.5" />

          {/* Segment Boundary Dotted Vertical Lines */}
          {compiled.segments.map((_seg, idx) => {
            if (idx === 0) return null;
            // Cumulative quote up to this segment
            let cumQuote = 0;
            for (let j = 0; j < idx; j++) {
              cumQuote += Number(compiled.segments[j].quoteCapacity) / Math.pow(10, quoteDecimals);
            }
            const lineX = projectX(cumQuote);
            return (
              <g key={`boundary-${idx}`}>
                <line
                  x1={lineX}
                  y1={padTop}
                  x2={lineX}
                  y2={padTop + chartH}
                  stroke="#f97316"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity="0.4"
                />
                <text x={lineX + 4} y={padTop + 14} fill="#fb923c" fontSize="10" fontFamily="monospace" opacity="0.8">
                  Seg {idx + 1}
                </text>
              </g>
            );
          })}

          {/* Filled Area */}
          {areaD && <path d={areaD} fill="url(#curveGradient)" />}

          {/* Curve Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#f97316"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_2px_8px_rgba(249,115,22,0.4)]"
            />
          )}

          {/* Checkpoint Dots */}
          {compiled.checkpoints.map((p, idx) => {
            let quoteAtCheckpoint = 0;
            for (let j = 0; j < idx; j++) {
              quoteAtCheckpoint += Number(compiled.segments[j].quoteCapacity) / Math.pow(10, quoteDecimals);
            }
            const cx = projectX(quoteAtCheckpoint);
            const cy = projectY(p);
            return (
              <g key={`checkpoint-dot-${idx}`}>
                <circle cx={cx} cy={cy} r="5" fill="#07090e" stroke="#f97316" strokeWidth="2.5" />
                <circle cx={cx} cy={cy} r="2" fill="#fff" />
              </g>
            );
          })}

          {/* Current Progress Line (if active simulation/pool) */}
          {currentProgressPercent > 0 && (
            <g>
              <line
                x1={padLeft + (currentProgressPercent / 100) * chartW}
                y1={padTop}
                x2={padLeft + (currentProgressPercent / 100) * chartW}
                y2={padTop + chartH}
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="2 2"
              />
              <rect
                x={padLeft + (currentProgressPercent / 100) * chartW - 24}
                y={padTop + chartH - 22}
                width="48"
                height="18"
                rx="4"
                fill="#064e3b"
                stroke="#10b981"
                strokeWidth="1"
              />
              <text
                x={padLeft + (currentProgressPercent / 100) * chartW}
                y={padTop + chartH - 9}
                fill="#34d399"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {currentProgressPercent.toFixed(1)}%
              </text>
            </g>
          )}

          {/* Hover Crosshair & Dot */}
          {hoverCoord && (
            <g>
              <line
                x1={hoverCoord.x}
                y1={padTop}
                x2={hoverCoord.x}
                y2={padTop + chartH}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <line
                x1={padLeft}
                y1={hoverCoord.y}
                x2={padLeft + chartW}
                y2={hoverCoord.y}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <circle cx={hoverCoord.x} cy={hoverCoord.y} r="6" fill="#f97316" stroke="#fff" strokeWidth="2" />
            </g>
          )}

          {/* Y Axis Labels (Prices) */}
          <text x={padLeft - 8} y={padTop + 10} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
            {maxPrice.toFixed(maxPrice < 0.001 ? 8 : 4)}
          </text>
          <text x={padLeft - 8} y={padTop + chartH / 2} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
            {((minPrice + maxPrice) / 2).toFixed(maxPrice < 0.001 ? 8 : 4)}
          </text>
          <text x={padLeft - 8} y={padTop + chartH} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
            {minPrice.toFixed(maxPrice < 0.001 ? 8 : 4)}
          </text>

          {/* X Axis Labels (Quote Invested) */}
          <text x={padLeft} y={height - 12} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="start">
            0 {quoteSymbol}
          </text>
          <text x={padLeft + chartW / 2} y={height - 12} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
            {(maxQuote / 2).toLocaleString(undefined, { maximumFractionDigits: 1 })} {quoteSymbol}
          </text>
          <text x={padLeft + chartW} y={height - 12} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
            {maxQuote.toLocaleString(undefined, { maximumFractionDigits: 1 })} {quoteSymbol} (Graduation)
          </text>
        </svg>

        {/* Floating Tooltip */}
        {hoverCoord && (
          <div
            className="absolute z-20 pointer-events-none bg-dark-950/95 border border-brand-500/50 rounded-lg p-2.5 shadow-xl font-mono text-[11px] text-slate-200"
            style={{
              left: Math.min(width - 200, Math.max(80, hoverCoord.x - 70)),
              top: Math.max(10, hoverCoord.y - 75),
            }}
          >
            <div className="text-brand-400 font-semibold mb-1">
              Price: {hoverCoord.price.toFixed(hoverCoord.price < 0.001 ? 8 : 4)} {quoteSymbol}
            </div>
            <div className="text-slate-400">
              Invested: <span className="text-white">{hoverCoord.quote.toFixed(2)} {quoteSymbol}</span>
            </div>
            <div className="text-slate-400">
              Sold: <span className="text-white">{hoverCoord.base.toLocaleString(undefined, { maximumFractionDigits: 0 })} {baseSymbol}</span>
            </div>
            <div className="text-slate-400">
              Graduation: <span className="text-emerald-400">{hoverCoord.progress.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
