# CurveForge: Programmable Liquidity Infrastructure for Meteora Dynamic Bonding Curves

> **"CurveForge turns liquidity design into programmable infrastructure."**

Built natively for the **Meteora Dynamic Bonding Curve (DBC)** ecosystem on Solana.

---

## Technical Verification & Protocol Audit Report

> [!NOTE]
> A comprehensive, line-by-line protocol verification and mathematical audit report against `@meteora-ag/dynamic-bonding-curve-sdk` v1.5.12 is available at:  
> **[docs/PROTOCOL-VERIFICATION.md](docs/PROTOCOL-VERIFICATION.md)**

---

## Executive Summary

Traditional token launchpads enforce rigid, single-formula curves (e.g. basic constant product or linear bonding) with zero nuance for real-world asset (RWA) valuation, treasury vesting schedules, or anti-sniper volatility controls. When pools transition to automated market makers, they suffer severe liquidity shocks, asymmetric sniper extraction, or stranded capital.

**CurveForge** transforms liquidity design into programmable, deterministic financial infrastructure by harnessing the full mathematical power of **Meteora's Dynamic Bonding Curve (`dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`)**.

With CurveForge, builders, DAOs, RWA syndicates, and AI agent developers can:
1. **Design multi-segment piecewise bonding curves** (up to 16 continuous segments) with custom quote and base capacities.
2. **Configure dynamic fee structures** featuring linear/exponential fee decay schedules that penalize front-running bots while smoothly ramping down for community participants.
3. **Execute deterministic multi-segment trade simulations** across complex retail, whale, and graduation scenarios with bidirectional buy/sell modeling before risking capital on-chain.
4. **Deploy directly to Solana** (Devnet and Mainnet-Beta) via a verified 9-step deployment pipeline with pure wallet-adapter mediation and truthful dry-run compilation.
5. **Seamlessly graduate liquidity to Meteora DAMM v2** (`cp-swap`) with immutable 100% permanent LP locking.

---

## Key Capabilities & Technical Architecture

```
                                  +---------------------------------------+
                                  |         CurveForge Studio             |
                                  |   (Visual Designer / Trade Simulator) |
                                  +-------------------+-------------------+
                                                      |
                                     (Validated Curve Specification)
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |      Meteora DBC On-Chain Adapter     |
                                  |       (@meteora-ag/dynamic-bonding)   |
                                  +-------------------+-------------------+
                                                      |
                 +------------------------------------+------------------------------------+
                 |                                                                         |
                 v                                                                         v
+----------------------------------+                                      +----------------------------------+
|  Step 1: DBC Config Account      |                                      |  Step 2: DBC Pool Initialization |
|  - Up to 16 Piecewise Segments   |                                      |  - Base Token Minting & Deposit  |
|  - Q64.64 Sqrt Price Invariant   |                                      |  - Quote Token Pair (SOL/USDC)   |
|  - Dynamic Decay Fee Schedule    |                                      |  - Escrow Key Verification       |
+-----------------+----------------+                                      +-----------------+----------------+
                  |                                                                         |
                  +-----------------------------------+-------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |      Dynamic Trading Phase            |
                                  |  - Piecewise Constant-Product Trades  |
                                  |  - Bidirectional Buy / Sell Modeling  |
                                  |  - Real-Time Reserve Telemetry        |
                                  +-------------------+-------------------+
                                                      |
                                         (Quote Target Met: 100%)
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |    Meteora DAMM v2 Migration          |
                                  |   - Permissionless Crank Execution    |
                                  |   - Initializes DAMM v2 CP-Swap Pool  |
                                  |   - 100% Permanently Locks LP Position|
                                  +---------------------------------------+
```

---

## Mathematical Formalism

Meteora DBC models bonding curves as **piecewise constant-product AMM segments**. CurveForge implements protocol-aligned deterministic formulas matching the on-chain program:

### 1. Sqrt Price in Q64.64 Representation
All prices are converted to 64.64 fixed-point numbers:
$$\text{sqrt\_price\_q64} = \left\lfloor \sqrt{P \cdot 10^{\text{quoteDec} - \text{baseDec}}} \times 2^{64} \right\rfloor$$

### 2. Segment Liquidity & Capacity Relations
For any segment $i$ spanning lower price boundary $\sqrt{P}_{l, i}$ and upper price boundary $\sqrt{P}_{u, i}$:
- **Quote Token Capacity ($\Delta y_i$)**: The quote liquidity absorbed across segment $i$:
  $$\Delta y_i = \frac{L_i \cdot (\sqrt{P}_{u, i} - \sqrt{P}_{l, i})}{2^{64}}$$
- **Base Token Capacity ($\Delta x_i$)**: The base token supply sold across segment $i$:
  $$\Delta x_i = \frac{L_i \cdot (\sqrt{P}_{u, i} - \sqrt{P}_{l, i})}{(\sqrt{P}_{u, i} \cdot \sqrt{P}_{l, i}) / 2^{64}} = L_i \left(\frac{2^{64}}{\sqrt{P}_{l, i}} - \frac{2^{64}}{\sqrt{P}_{u, i}}\right)$$

### 3. Bidirectional Segment Traversal
- **BUY (Quote In $\rightarrow$ Base Out)**: Price moves upwards across segment upper bounds until input quote is consumed or migration threshold is met:
  $$\sqrt{P}_{\text{new}} = \sqrt{P}_{\text{curr}} + \frac{\Delta y \cdot 2^{64}}{L_i}$$
- **SELL (Base In $\rightarrow$ Quote Out)**: Price moves downwards across segment lower bounds until input base is consumed or start price floor is reached:
  $$\sqrt{P}_{\text{new}} = \frac{\sqrt{P}_{\text{curr}} \cdot L_i \cdot 2^{64}}{L_i \cdot 2^{64} + \Delta x \cdot \sqrt{P}_{\text{curr}}}$$

---

## 6 Curated Reference Presets

CurveForge ships with 6 reference presets designed for distinct token issuance archetypes:

| Preset Name | Target Archetype | Segments | Price Checkpoints | Fee Model | Architectural Intent |
|---|---|---|---|---|---|
| **Tokenized Equity Discovery** | Private Equity / Shares | 3 Segments | \$1.00 $\rightarrow$ \$4.50 | 5.0% $\rightarrow$ 0.3% Exponential | Deep initial floor with steep cap-table protection and fee decay |
| **RWA High-Depth Corridor** | Yield Instruments / Treasuries | 3 Segments | \$0.98 $\rightarrow$ \$1.05 | 0.20% Fixed | Concentrated liquidity corridor minimizing slippage for treasury allocations |
| **Autonomous AI Agent Utility** | AI Agent Infrastructure | 3 Segments | 0.03 $\mu$SOL $\rightarrow$ 0.25 $\mu$SOL | 3.0% $\rightarrow$ 1.0% Linear | 80% creator fee stream to continuously fund agent inference compute |
| **Exponential Fair Launch** | Community Distribution | 4 Segments | 0.02 $\mu$SOL $\rightarrow$ 0.35 $\mu$SOL | 1.00% Fixed | Progressive acceleration rewarding early community participants |
| **DeFi Protocol Bootstrap** | Governance & Utility | 3 Segments | \$0.005 $\rightarrow$ \$0.040 | 2.0% $\rightarrow$ 0.5% Linear | High buy-side absorption transitioning to sensitive price discovery |
| **Constant Product Benchmark** | Reference Baseline | 1 Segment | 0.05 $\mu$SOL $\rightarrow$ 0.25 $\mu$SOL | 1.00% Fixed | Pure constant-product ($x \cdot y = k$) reference baseline |

---

## 5-Stage Migration & Permanent LP Locking Architecture

CurveForge truthfully represents the complete on-chain graduation state machine:

1. **Stage 1: Pre-Graduation (Active DBC)**: Trades execute exclusively in Meteora DBC (`dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`).
2. **Stage 2: Threshold Reached**: Quote reserve reaches target threshold. Bonding curve trading freezes.
3. **Stage 3: Crank Processing**: Permissionless crank invokes `client.migration.migrateToDammV2(...)`. Two position NFT keypairs are generated and sign the transaction.
4. **Stage 4: DAMM v2 Pool Migrated**: Quote and base liquidity transferred to Meteora DAMM v2 (`cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`).
5. **Stage 5: 100% Permanent LP Lock**: `partnerPermanentLockedLiquidityPercentage: 100%`. LP position is deposited into Meteora Locker (`LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn`) with zero unlock schedule.

---

## Directory Structure

```
curveforge/
├── docs/
│   └── PROTOCOL-VERIFICATION.md # Full SDK 1.5.12 technical verification & mathematical audit
├── src/
│   ├── blockchain/              # Solana RPC & Meteora DBC Program Adapters
│   │   ├── meteora/
│   │   │   ├── config-builder.ts        # Maps CurveConfig -> Meteora DBC SDK parameters
│   │   │   ├── constants.ts             # Verified Program IDs & network constants
│   │   │   └── meteora-dbc-adapter.ts   # DynamicBondingCurveClient & Pool bridge
│   │   └── solana/
│   │       ├── cluster.ts               # Devnet / Mainnet-Beta RPC endpoints & explorer URLs
│   │       └── connection.ts            # Resilient Connection manager
│   ├── components/              # Technical Financial Terminal UI
│   │   ├── curvelab/
│   │   │   ├── CurveChart.tsx           # High-resolution SVG piecewise curve renderer
│   │   │   └── CurveLab.tsx             # Visual checkpoint editor & parameter controls
│   │   ├── deployment/
│   │   │   └── DeploymentWizard.tsx     # 9-step pre-flight deployment studio
│   │   ├── inspector/
│   │   │   └── ConfigInspector.tsx      # Q64 math breakdown, protocol audit & TypeScript SDK code
│   │   ├── monitor/
│   │   │   └── PoolMonitor.tsx          # Real-time on-chain pool viewer & DAMM v2 migration
│   │   ├── navigation/
│   │   │   └── Navbar.tsx               # Terminal header with cluster switch & wallet state
│   │   ├── presets/
│   │   │   └── PresetMarketplace.tsx    # 6 reference curve presets
│   │   └── simulator/
│   │       └── SimulatorPanel.tsx       # Multi-segment trade simulation & trajectory chart
│   ├── domain/                  # Pure Mathematical & Protocol Logic (Zero UI Dependencies)
│   │   ├── curve/
│   │   │   ├── curve-builder.ts         # Segment compilation & cumulative capacity sampling
│   │   │   ├── curve-math.ts            # Exact Q64.64 sqrt price & AMM invariant formulas
│   │   │   └── curve-types.ts           # Core domain models & quote token definitions
│   │   ├── presets/
│   │   │   └── preset-library.ts        # 6 reference presets
│   │   ├── simulation/
│   │   │   ├── scenario-runner.ts       # 4 quantitative stress-test scenarios
│   │   │   ├── simulation-engine.ts     # Bidirectional buy/sell multi-segment execution engine
│   │   │   └── simulation-types.ts      # Trade inputs & step telemetry schemas
│   │   └── validation/
│   │       └── curve-validator.ts       # Meteora protocol invariant validator
│   ├── tests/                   # Automated Unit Test Suites
│   │   ├── curve-math.test.ts           # Validates Q64.64 conversion & capacity calculus
│   │   ├── presets.test.ts              # Audits SDK compilability of all 6 reference presets
│   │   ├── simulation.test.ts           # Tests multi-segment trades & graduation triggers
│   │   ├── simulation-hardening.test.ts # TEST A through TEST I boundary condition suite
│   │   └── validation.test.ts           # Verifies on-chain boundary enforcement
│   ├── App.tsx                  # Root application container & tab coordinator
│   ├── index.css                # Dark technical terminal styling
│   └── main.tsx                 # React DOM entry point
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Verification & Testing

The CurveForge engine is covered by automated unit test suites with **22 passing tests**:

```bash
# Run complete test suite
npm run test
```

### Test Suite Summary
1. `src/tests/simulation-hardening.test.ts` (9 tests):
   - **TEST A**: Trade remains inside segment 1.
   - **TEST B**: Trade exactly reaches segment 1 boundary.
   - **TEST C**: Trade crosses segment 1 $\rightarrow$ 2.
   - **TEST D**: Trade crosses segment 1 $\rightarrow$ 2 $\rightarrow$ 3.
   - **TEST E**: Trade exceeds configured curve (liquidity limit/migration stop).
   - **TEST F**: Reverse-direction trade (`executeSell`).
   - **TEST G**: Large trade (high slippage & price impact).
   - **TEST H**: Very small trade (micro-swap underflow prevention).
   - **TEST I**: Non-integer decimal trade amounts.
2. `src/tests/presets.test.ts`: Compiles all 6 reference presets through `buildCurveWithCustomSqrtPrices`.
3. `src/tests/curve-math.test.ts`: Validates Q64.64 square root price derivation and segment calculus.
4. `src/tests/simulation.test.ts`: Validates multi-step scenario runner and time-decay fee scheduling.
5. `src/tests/validation.test.ts`: Enforces strictly monotonic checkpoint ordering and positive weight factors.

---

## Reproducibility & Local Setup

```bash
# 1. Clone repository
git clone https://github.com/CurveForge/curveforge.git
cd curveforge

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Run test suite
npm run test

# 4. Type check
npx tsc --noEmit

# 5. Production build
npm run build

# 6. Start local development server
npm run dev
```

Visit `http://localhost:5173` to access the CurveForge terminal.

---

## Meteora DBC Integration Details

- **Program ID**: `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`
- **SDK**: `@meteora-ag/dynamic-bonding-curve-sdk` (v1.5.12)
- **AMM Graduation Target**: Meteora DAMM v2 (`cp-swap` / `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`)
- **Locker Program ID**: `LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn`
- **Supported Quote Mints**:
  - Devnet SOL: `So11111111111111111111111111111111111111112`
  - Devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
  - Mainnet SOL: `So11111111111111111111111111111111111111112`
  - Mainnet USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
  - Mainnet USDG: `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo`

---

## License

MIT License. Designed and engineered for the Meteora Dynamic Bonding Curve Ecosystem.
