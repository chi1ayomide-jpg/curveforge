/**
 * Deterministic Simulation Engine for Meteora DBC
 * Implements multi-segment crossing, dynamic fee deduction, and exact price discovery.
 */

import { CompiledCurve } from '../curve/curve-builder';
import { CurveConfiguration } from '../curve/curve-types';
import {
  computeBaseForSegment,
  computeQuoteForSegment,
  sqrtPriceX64ToPrice,
  calculatePriceImpact,
  Q64,
} from '../curve/curve-math';
import {
  SimulatedTradeInput,
  SimulationResult,
  TradeStepResult,
} from './simulation-types';

export class SimulationEngine {
  private config: CurveConfiguration;
  private compiled: CompiledCurve;
  private currentSqrtPrice: bigint;
  private currentSegmentIndex: number;
  private quoteReserveAtoms: bigint;
  private baseRemainingAtoms: bigint;
  private targetQuoteThresholdAtoms: bigint;
  private baseScale: number;
  private quoteScale: number;

  constructor(config: CurveConfiguration, compiled: CompiledCurve) {
    this.config = config;
    this.compiled = compiled;
    this.currentSqrtPrice = compiled.sqrtPricesX64[0];
    this.currentSegmentIndex = 0;
    this.quoteReserveAtoms = 0n;
    this.baseRemainingAtoms = compiled.totalBaseCapacity;
    this.targetQuoteThresholdAtoms = config.curve.targetMigrationQuoteThreshold;
    this.baseScale = Math.pow(10, config.token.tokenBaseDecimal);
    this.quoteScale = Math.pow(10, config.token.tokenQuoteDecimal);
  }

  /**
   * Resets simulation to initial empty pool state
   */
  public reset(): void {
    this.currentSqrtPrice = this.compiled.sqrtPricesX64[0];
    this.currentSegmentIndex = 0;
    this.quoteReserveAtoms = 0n;
    this.baseRemainingAtoms = this.compiled.totalBaseCapacity;
  }

  /**
   * Executes a single BUY trade with exact multi-segment crossing
   */
  public executeBuy(
    quoteAmount: number,
    tradeIndex: number,
    timeElapsedSeconds = 0
  ): TradeStepResult {
    const rawQuoteInAtoms = BigInt(Math.floor(quoteAmount * this.quoteScale));
    if (rawQuoteInAtoms <= 0n) {
      throw new Error('Buy amount must be positive');
    }

    const priceBefore = sqrtPriceX64ToPrice(
      this.currentSqrtPrice,
      this.config.token.tokenBaseDecimal,
      this.config.token.tokenQuoteDecimal
    );

    // Calculate trading fee
    const feeBps = this.computeFeeBps(timeElapsedSeconds);
    const feeAtoms = (rawQuoteInAtoms * BigInt(feeBps)) / 10000n;
    const netQuoteInAtoms = rawQuoteInAtoms - feeAtoms;

    let remainingQuote = netQuoteInAtoms;
    let totalBaseOutAtoms = 0n;
    let segmentsCrossed = 0;

    // Advance through segments until input quote is consumed or migration is reached
    while (remainingQuote > 0n && this.currentSegmentIndex < this.compiled.segments.length) {
      const segment = this.compiled.segments[this.currentSegmentIndex];
      const liquidity = this.compiled.liquidityPerSegment[this.currentSegmentIndex];

      // Calculate maximum quote needed to finish current segment
      const quoteNeededForSegment = computeQuoteForSegment(
        liquidity,
        this.currentSqrtPrice,
        segment.sqrtPriceUpper
      );

      if (remainingQuote >= quoteNeededForSegment) {
        // Entire remaining segment is bought out
        const baseFromSegment = computeBaseForSegment(
          liquidity,
          this.currentSqrtPrice,
          segment.sqrtPriceUpper
        );
        totalBaseOutAtoms += baseFromSegment;
        remainingQuote -= quoteNeededForSegment;
        this.quoteReserveAtoms += quoteNeededForSegment;
        this.baseRemainingAtoms -= baseFromSegment;

        // Move to next segment boundary
        this.currentSqrtPrice = segment.sqrtPriceUpper;
        if (this.currentSegmentIndex < this.compiled.segments.length - 1) {
          this.currentSegmentIndex++;
          segmentsCrossed++;
        } else {
          // Reached migration ceiling
          break;
        }
      } else {
        // Trade finishes inside this segment
        // sqrt(P_new) = sqrt(P_curr) + (remainingQuote * 2^64) / L
        const deltaSqrt = (remainingQuote * Q64) / liquidity;
        const newSqrtPrice = this.currentSqrtPrice + deltaSqrt;

        const baseFromSegment = computeBaseForSegment(
          liquidity,
          this.currentSqrtPrice,
          newSqrtPrice
        );

        totalBaseOutAtoms += baseFromSegment;
        this.quoteReserveAtoms += remainingQuote;
        this.baseRemainingAtoms -= baseFromSegment;
        this.currentSqrtPrice = newSqrtPrice;
        remainingQuote = 0n;
      }
    }

    const priceAfter = sqrtPriceX64ToPrice(
      this.currentSqrtPrice,
      this.config.token.tokenBaseDecimal,
      this.config.token.tokenQuoteDecimal
    );

    const outputAmountBase = Number(totalBaseOutAtoms) / this.baseScale;
    const feeAmountQuote = Number(feeAtoms) / this.quoteScale;
    const effectivePrice = outputAmountBase > 0 ? quoteAmount / outputAmountBase : priceAfter;
    const impact = calculatePriceImpact(priceBefore, priceAfter);
    const isAtMigrationPrice =
      this.currentSqrtPrice >= this.compiled.sqrtPricesX64[this.compiled.sqrtPricesX64.length - 1];
    const isThresholdMet =
      this.quoteReserveAtoms >= this.targetQuoteThresholdAtoms ||
      (this.targetQuoteThresholdAtoms > 0n &&
        this.targetQuoteThresholdAtoms - this.quoteReserveAtoms <= 10000n);
    const isCapacityFilled = this.quoteReserveAtoms >= this.compiled.totalQuoteCapacity;
    const isGraduated = isAtMigrationPrice || isThresholdMet || isCapacityFilled;

    const progress = isGraduated
      ? 100
      : Number(
          this.targetQuoteThresholdAtoms > 0n
            ? (this.quoteReserveAtoms * 10000n) / this.targetQuoteThresholdAtoms
            : 10000n
        ) / 100;

    return {
      tradeIndex,
      type: 'BUY',
      inputAmount: quoteAmount,
      outputAmount: outputAmountBase,
      feeAmount: feeAmountQuote,
      effectivePrice,
      priceBefore,
      priceAfter,
      priceImpactPercent: impact,
      graduated: isGraduated,
      cumulativeQuoteReserve: Number(this.quoteReserveAtoms) / this.quoteScale,
      cumulativeBaseRemaining: Number(this.baseRemainingAtoms) / this.baseScale,
      progressPercent: Math.min(100, Math.max(0, progress)),
      segmentsCrossed,
    };
  }

  /**
   * Executes a single SELL trade (Base tokens in -> Quote tokens out)
   * with multi-segment reverse crossing down towards startSqrtPrice.
   */
  public executeSell(
    baseAmount: number,
    tradeIndex: number,
    timeElapsedSeconds = 0
  ): TradeStepResult {
    const rawBaseInAtoms = BigInt(Math.floor(baseAmount * this.baseScale));
    if (rawBaseInAtoms <= 0n) {
      throw new Error('Sell amount must be positive');
    }

    const priceBefore = sqrtPriceX64ToPrice(
      this.currentSqrtPrice,
      this.config.token.tokenBaseDecimal,
      this.config.token.tokenQuoteDecimal
    );

    // If pool has zero quote reserves or is already at start price, cannot sell
    if (this.quoteReserveAtoms <= 0n || this.currentSqrtPrice <= this.compiled.sqrtPricesX64[0]) {
      return {
        tradeIndex,
        type: 'SELL',
        inputAmount: baseAmount,
        outputAmount: 0,
        feeAmount: 0,
        effectivePrice: priceBefore,
        priceBefore,
        priceAfter: priceBefore,
        priceImpactPercent: 0,
        graduated: false,
        cumulativeQuoteReserve: Number(this.quoteReserveAtoms) / this.quoteScale,
        cumulativeBaseRemaining: Number(this.baseRemainingAtoms) / this.baseScale,
        progressPercent: 0,
        segmentsCrossed: 0,
      };
    }

    let remainingBase = rawBaseInAtoms;
    let grossQuoteOutAtoms = 0n;
    let segmentsCrossed = 0;

    // Move downwards across segments until input base is consumed or start price is reached
    while (remainingBase > 0n && this.currentSegmentIndex >= 0) {
      const segment = this.compiled.segments[this.currentSegmentIndex];
      const liquidity = this.compiled.liquidityPerSegment[this.currentSegmentIndex];

      // Base capacity needed to reach the lower boundary of current segment
      const baseNeededToBoundary = computeBaseForSegment(
        liquidity,
        segment.sqrtPriceLower,
        this.currentSqrtPrice
      );

      if (baseNeededToBoundary > 0n && remainingBase >= baseNeededToBoundary) {
        // Entire segment down to lower boundary is traversed
        const quoteFromSegment = computeQuoteForSegment(
          liquidity,
          segment.sqrtPriceLower,
          this.currentSqrtPrice
        );

        // Cap to available quote reserve
        const actualQuoteOut = quoteFromSegment > this.quoteReserveAtoms ? this.quoteReserveAtoms : quoteFromSegment;

        grossQuoteOutAtoms += actualQuoteOut;
        remainingBase -= baseNeededToBoundary;
        this.quoteReserveAtoms -= actualQuoteOut;
        this.baseRemainingAtoms += baseNeededToBoundary;
        this.currentSqrtPrice = segment.sqrtPriceLower;

        if (this.currentSegmentIndex > 0) {
          this.currentSegmentIndex--;
          segmentsCrossed++;
        } else {
          // Reached floor of curve (start price)
          break;
        }
      } else if (baseNeededToBoundary > 0n) {
        // Trade terminates inside current segment
        // sqrt(P_new) = (sqrt(P_curr) * L * 2^64) / (L * 2^64 + remainingBase * sqrt(P_curr))
        const numerator = this.currentSqrtPrice * liquidity * Q64;
        const denominator = (liquidity * Q64) + (remainingBase * this.currentSqrtPrice);
        let newSqrtPrice = denominator > 0n ? numerator / denominator : segment.sqrtPriceLower;

        if (newSqrtPrice < segment.sqrtPriceLower) {
          newSqrtPrice = segment.sqrtPriceLower;
        }

        const quoteFromSegment = computeQuoteForSegment(
          liquidity,
          newSqrtPrice,
          this.currentSqrtPrice
        );

        const actualQuoteOut = quoteFromSegment > this.quoteReserveAtoms ? this.quoteReserveAtoms : quoteFromSegment;

        grossQuoteOutAtoms += actualQuoteOut;
        this.quoteReserveAtoms -= actualQuoteOut;
        this.baseRemainingAtoms += remainingBase;
        this.currentSqrtPrice = newSqrtPrice;
        remainingBase = 0n;
        break;
      } else {
        // Already at lower boundary of this segment
        if (this.currentSegmentIndex > 0) {
          this.currentSegmentIndex--;
          segmentsCrossed++;
        } else {
          break;
        }
      }
    }

    // Trading fee deduction on Quote token output
    const feeBps = this.computeFeeBps(timeElapsedSeconds);
    const feeAtoms = (grossQuoteOutAtoms * BigInt(feeBps)) / 10000n;
    const netQuoteOutAtoms = grossQuoteOutAtoms - feeAtoms;

    const priceAfter = sqrtPriceX64ToPrice(
      this.currentSqrtPrice,
      this.config.token.tokenBaseDecimal,
      this.config.token.tokenQuoteDecimal
    );

    const outputAmountQuote = Number(netQuoteOutAtoms) / this.quoteScale;
    const feeAmountQuote = Number(feeAtoms) / this.quoteScale;
    const effectivePrice = baseAmount > 0 ? outputAmountQuote / baseAmount : priceAfter;
    const impact = calculatePriceImpact(priceBefore, priceAfter);
    const isAtMigrationPrice =
      this.currentSqrtPrice >= this.compiled.sqrtPricesX64[this.compiled.sqrtPricesX64.length - 1];
    const isThresholdMet =
      this.quoteReserveAtoms >= this.targetQuoteThresholdAtoms ||
      (this.targetQuoteThresholdAtoms > 0n &&
        this.targetQuoteThresholdAtoms - this.quoteReserveAtoms <= 10000n);
    const isCapacityFilled = this.quoteReserveAtoms >= this.compiled.totalQuoteCapacity;
    const isGraduated = isAtMigrationPrice || isThresholdMet || isCapacityFilled;

    const progress = isGraduated
      ? 100
      : Number(
          this.targetQuoteThresholdAtoms > 0n
            ? (this.quoteReserveAtoms * 10000n) / this.targetQuoteThresholdAtoms
            : 10000n
        ) / 100;

    return {
      tradeIndex,
      type: 'SELL',
      inputAmount: baseAmount,
      outputAmount: outputAmountQuote,
      feeAmount: feeAmountQuote,
      effectivePrice,
      priceBefore,
      priceAfter,
      priceImpactPercent: impact,
      graduated: isGraduated,
      cumulativeQuoteReserve: Number(this.quoteReserveAtoms) / this.quoteScale,
      cumulativeBaseRemaining: Number(this.baseRemainingAtoms) / this.baseScale,
      progressPercent: Math.min(100, Math.max(0, progress)),
      segmentsCrossed,
    };
  }

  /**
   * Executes a sequence of trades and returns complete analytics
   */
  public runSimulation(trades: SimulatedTradeInput[]): SimulationResult {
    this.reset();
    const initialPrice = this.compiled.startPrice;
    const results: TradeStepResult[] = [];
    let totalVolume = 0;
    let totalFees = 0;
    let graduationIndex: number | null = null;

    let timeSeconds = 0;
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      timeSeconds += trade.timestampSeconds ?? 10;

      const res =
        trade.type === 'SELL'
          ? this.executeSell(trade.amount, i + 1, timeSeconds)
          : this.executeBuy(trade.amount, i + 1, timeSeconds);

      results.push(res);
      const quoteVol = trade.type === 'SELL' ? res.outputAmount + res.feeAmount : trade.amount;
      totalVolume += quoteVol;
      totalFees += res.feeAmount;

      if (res.graduated && graduationIndex === null) {
        graduationIndex = i + 1;
      }
    }

    const finalRes = results[results.length - 1];
    return {
      trades: results,
      initialPrice,
      finalPrice: finalRes ? finalRes.priceAfter : initialPrice,
      totalVolumeQuote: totalVolume,
      totalFeesCollectedQuote: totalFees,
      isGraduated: graduationIndex !== null,
      graduationTradeIndex: graduationIndex,
      finalQuoteReserve: finalRes ? finalRes.cumulativeQuoteReserve : 0,
      finalBaseRemaining: finalRes ? finalRes.cumulativeBaseRemaining : Number(this.compiled.totalBaseCapacity) / this.baseScale,
      finalProgressPercent: finalRes ? finalRes.progressPercent : 0,
    };
  }

  private computeFeeBps(timeElapsedSeconds: number): number {
    const fee = this.config.fee;
    if (fee.baseFeeMode === 'Fixed') {
      return fee.fixedFeeBps;
    }

    if (fee.scheduler) {
      const { startingFeeBps, endingFeeBps, totalDurationSeconds } = fee.scheduler;
      if (timeElapsedSeconds >= totalDurationSeconds) {
        return endingFeeBps;
      }

      if (fee.baseFeeMode === 'FeeSchedulerLinear') {
        const progress = timeElapsedSeconds / totalDurationSeconds;
        return Math.round(startingFeeBps - progress * (startingFeeBps - endingFeeBps));
      }

      if (fee.baseFeeMode === 'FeeSchedulerExponential') {
        const progress = timeElapsedSeconds / totalDurationSeconds;
        // Exponential decay model
        const decay = Math.exp(-3 * progress);
        return Math.round(endingFeeBps + (startingFeeBps - endingFeeBps) * decay);
      }
    }

    return fee.fixedFeeBps;
  }
}
