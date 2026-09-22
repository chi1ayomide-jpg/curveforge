import React, { useState } from 'react';
import { 
  Sliders, Activity, Bookmark, Code, Rocket, Radio, ExternalLink 
} from 'lucide-react';
import { Navbar } from './components/navigation/Navbar';
import { CurveLab } from './components/curvelab/CurveLab';
import { SimulatorPanel } from './components/simulator/SimulatorPanel';
import { PresetMarketplace } from './components/presets/PresetMarketplace';
import { ConfigInspector } from './components/inspector/ConfigInspector';
import { DeploymentWizard } from './components/deployment/DeploymentWizard';
import { PoolMonitor } from './components/monitor/PoolMonitor';
import { CurveConfiguration } from './domain/curve/curve-types';
import { TOKENIZED_EQUITY_PRESET } from './domain/presets/preset-library';

export type NavigationTab = 'lab' | 'simulator' | 'presets' | 'inspector' | 'deployment' | 'monitor';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('lab');
  const [cluster, setCluster] = useState<'devnet' | 'mainnet-beta'>('devnet');
  const [activeConfig, setActiveConfig] = useState<CurveConfiguration>(TOKENIZED_EQUITY_PRESET);
  
  // Wallet simulation state
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletPublicKey, setWalletPublicKey] = useState<string | null>(null);

  const handleConnectWallet = () => {
    if (!walletConnected) {
      setWalletConnected(true);
      setWalletPublicKey('7XpL9kF3qM2nB8vC2xZ1aD4eF7gH8jMeteoraDBC');
    } else {
      setWalletConnected(false);
      setWalletPublicKey(null);
    }
  };

  const handleSelectPreset = (config: CurveConfiguration) => {
    setActiveConfig(config);
    setActiveTab('lab');
  };

  return (
    <div className="min-h-screen bg-cf-darker text-slate-100 flex flex-col font-sans selection:bg-cf-accent selection:text-black">
      {/* Top Navbar */}
      <Navbar
        cluster={cluster}
        onClusterChange={setCluster}
        walletConnected={walletConnected}
        walletPublicKey={walletPublicKey}
        onConnectWallet={handleConnectWallet}
      />

      {/* Main Sub-Navigation Bar (Technical Financial Terminal Style) */}
      <div className="border-b border-cf-border bg-cf-card sticky top-[57px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto py-1.5 scrollbar-none">
            <div className="flex items-center space-x-1 sm:space-x-2 min-w-max">
              <button
                onClick={() => setActiveTab('lab')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium rounded transition-all ${
                  activeTab === 'lab'
                    ? 'bg-cf-accent text-black font-bold shadow'
                    : 'text-cf-muted hover:text-white hover:bg-cf-dark'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>1. Curve Lab</span>
              </button>

              <button
                onClick={() => setActiveTab('simulator')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium rounded transition-all ${
                  activeTab === 'simulator'
                    ? 'bg-cf-accent text-black font-bold shadow'
                    : 'text-cf-muted hover:text-white hover:bg-cf-dark'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>2. Trade Simulator</span>
              </button>

              <button
                onClick={() => setActiveTab('presets')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium rounded transition-all ${
                  activeTab === 'presets'
                    ? 'bg-cf-accent text-black font-bold shadow'
                    : 'text-cf-muted hover:text-white hover:bg-cf-dark'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>3. Preset Library</span>
              </button>

              <button
                onClick={() => setActiveTab('inspector')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium rounded transition-all ${
                  activeTab === 'inspector'
                    ? 'bg-cf-accent text-black font-bold shadow'
                    : 'text-cf-muted hover:text-white hover:bg-cf-dark'
                }`}
              >
                <Code className="w-4 h-4" />
                <span>4. Config Inspector & SDK</span>
              </button>

              <button
                onClick={() => setActiveTab('deployment')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium rounded transition-all ${
                  activeTab === 'deployment'
                    ? 'bg-cf-accent text-black font-bold shadow'
                    : 'text-cf-muted hover:text-white hover:bg-cf-dark'
                }`}
              >
                <Rocket className="w-4 h-4" />
                <span>5. Deployment Studio</span>
              </button>

              <button
                onClick={() => setActiveTab('monitor')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium rounded transition-all ${
                  activeTab === 'monitor'
                    ? 'bg-cf-accent text-black font-bold shadow'
                    : 'text-cf-muted hover:text-white hover:bg-cf-dark'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>6. Pool Monitor & Migration</span>
              </button>
            </div>

            <div className="hidden xl:flex items-center gap-3 font-mono text-[11px] text-cf-muted pl-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cf-emerald animate-pulse"></span>
                Meteora DBC v1.5.12
              </span>
              <span>•</span>
              <span className="text-white">
                Active: <span className="text-cf-accent font-bold">{activeConfig.symbol}</span> ({activeConfig.curve.liquidityWeights.length} segs)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'lab' && (
          <CurveLab
            config={activeConfig}
            onChangeConfig={setActiveConfig}
            onNavigateToSimulator={() => setActiveTab('simulator')}
            onNavigateToDeploy={() => setActiveTab('deployment')}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorPanel config={activeConfig} />
        )}

        {activeTab === 'presets' && (
          <PresetMarketplace
            onSelectPreset={handleSelectPreset}
            activeConfigId={activeConfig.id}
          />
        )}

        {activeTab === 'inspector' && (
          <ConfigInspector config={activeConfig} />
        )}

        {activeTab === 'deployment' && (
          <DeploymentWizard
            config={activeConfig}
            cluster={cluster}
            walletConnected={walletConnected}
            walletPublicKey={walletPublicKey}
            onConnectWallet={handleConnectWallet}
          />
        )}

        {activeTab === 'monitor' && (
          <PoolMonitor cluster={cluster} />
        )}
      </main>

      {/* Footer / Terminal Telemetry */}
      <footer className="border-t border-cf-border bg-cf-card py-4 text-xs font-mono text-cf-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wider">CURVEFORGE</span>
            <span>—</span>
            <span>Programmable Liquidity Infrastructure for Meteora Dynamic Bonding Curves</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-cf-muted">Program ID: <span className="text-white font-mono">dbcij3...DuSMaqN</span></span>
            <span>•</span>
            <a
              href="https://docs.meteora.ag/developer-guides/dbc"
              target="_blank"
              rel="noreferrer"
              className="text-cf-accent hover:underline flex items-center gap-1"
            >
              Meteora Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
