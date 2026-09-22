import React from 'react';
import { Layers } from 'lucide-react';
import { SolanaCluster } from '../../blockchain/solana/cluster';

export type ActiveTab = 'curvelab' | 'simulator' | 'presets' | 'inspector' | 'deployment' | 'monitor';

export interface NavbarProps {
  cluster: SolanaCluster;
  onClusterChange?: (cluster: SolanaCluster) => void;
  setCluster?: (cluster: SolanaCluster) => void;
  walletConnected?: boolean;
  walletPublicKey?: string | null;
  walletAddress?: string | null;
  onConnectWallet?: () => void;
  connectWallet?: () => void;
  disconnectWallet?: () => void;
  activeTab?: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cluster,
  onClusterChange,
  setCluster,
  walletConnected,
  walletPublicKey,
  walletAddress,
  onConnectWallet,
  connectWallet,
  disconnectWallet,
}) => {
  const handleClusterSelect = (c: SolanaCluster) => {
    if (onClusterChange) onClusterChange(c);
    else if (setCluster) setCluster(c);
  };

  const handleConnect = () => {
    if (onConnectWallet) onConnectWallet();
    else if (connectWallet) connectWallet();
  };

  const handleDisconnect = () => {
    if (onConnectWallet) onConnectWallet();
    else if (disconnectWallet) disconnectWallet();
  };

  const displayAddress = walletPublicKey || walletAddress;
  const isConnected = walletConnected || !!walletAddress;

  return (
    <header className="border-b border-cf-border bg-cf-darker/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/40">
              <Layers className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white font-mono">CurveForge</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cf-accent/15 text-cf-accent border border-cf-accent/30 font-bold">METEORA DBC</span>
              </div>
              <p className="text-[11px] text-cf-muted font-mono hidden sm:block">Programmable Liquidity Infrastructure</p>
            </div>
          </div>
        </div>

        {/* Right Status / Wallet */}
        <div className="flex items-center gap-3">
          {/* Cluster Switcher */}
          <div className="flex items-center bg-cf-dark border border-cf-border rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => handleClusterSelect('devnet')}
              className={`px-2.5 py-1 rounded transition-all ${
                cluster === 'devnet'
                  ? 'bg-cf-emerald/20 text-cf-emerald font-semibold border border-cf-emerald/40'
                  : 'text-cf-muted hover:text-slate-200'
              }`}
            >
              Devnet
            </button>
            <button
              onClick={() => handleClusterSelect('mainnet-beta')}
              className={`px-2.5 py-1 rounded transition-all ${
                cluster === 'mainnet-beta'
                  ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/40'
                  : 'text-cf-muted hover:text-slate-200'
              }`}
            >
              Mainnet
            </button>
          </div>

          {/* Wallet Connect */}
          {isConnected && displayAddress ? (
            <div className="flex items-center gap-2 bg-cf-dark border border-cf-border px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-cf-emerald animate-pulse"></span>
              <span className="font-mono text-xs text-slate-200">
                {displayAddress.slice(0, 4)}...{displayAddress.slice(-4)}
              </span>
              <button
                onClick={handleDisconnect}
                className="text-[11px] font-mono text-cf-muted hover:text-rose-400 transition-colors ml-1"
                title="Disconnect Wallet"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="px-3.5 py-1.5 rounded-lg bg-cf-accent hover:bg-cf-accent-hover text-black font-mono text-xs font-bold transition-all shadow-md shadow-cf-accent/20"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
