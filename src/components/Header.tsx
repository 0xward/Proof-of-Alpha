import { useAccount } from 'wagmi';
import { isMiniPay } from '../lib/web3';
import type { AppView } from '../App';
import { User, Gift } from 'lucide-react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { size?: string };
    }
  }
}

interface HeaderProps {
  onBack: () => void;
  activeView: AppView;
  onSwitchView: (view: AppView) => void;
}

const NAV_TABS: { id: AppView; label: string; short: string }[] = [
  { id: 'terminal', label: 'TERMINAL',    short: 'TRM' },
  { id: 'arena',    label: 'ALPHA_ARENA', short: 'ARN' },
  { id: 'vault',    label: 'ALPHA_VAULT', short: 'VLT' },
  { id: 'claim',    label: 'CLAIM_$PROOF',short: 'CLM' },
];

export function Header({ onBack, activeView, onSwitchView }: HeaderProps) {
  const { address, isConnected } = useAccount();

  return (
    <header className="border-b border-[#FFB800]/30 bg-[#0a0a0a] sticky top-0 z-40">
      {/* Top row */}
      <div className="h-14 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-[#FFB800]/40 hover:text-[#FFB800] transition-colors text-[10px] uppercase tracking-widest font-mono border border-[#FFB800]/20 px-2 py-1 hover:border-[#FFB800]/50"
            title="Back to home"
          >
            ← HOME
          </button>

          <div className="flex flex-col leading-none">
            <span className="text-base font-black tracking-tighter uppercase text-[#FFB800]">Proof of Alpha</span>
            <span className="text-[9px] text-green-500 font-bold tracking-widest">v3.0.0-STABLE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline text-[10px] uppercase tracking-widest text-[#FFB800]/30 font-mono">
            CELO_MAINNET
          </span>

          {/* Claim shortcut */}
          <button
            onClick={() => onSwitchView('claim')}
            className={`hidden sm:flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border px-2.5 py-1.5 transition-all ${
              activeView === 'claim'
                ? 'border-[#FFB800] text-[#FFB800] bg-[#FFB800]/10'
                : 'border-[#FFB800]/20 text-[#FFB800]/40 hover:border-[#FFB800]/50 hover:text-[#FFB800]/70'
            }`}
          >
            <Gift className="w-3 h-3" />
            CLAIM
          </button>

          {!isMiniPay && (
            isConnected && address ? (
              <button
                onClick={() => onSwitchView('profile')}
                className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest border px-2.5 py-1 transition-all ${
                  activeView === 'profile'
                    ? 'border-[#FFB800] text-[#FFB800] bg-[#FFB800]/10'
                    : 'border-[#FFB800]/30 text-[#FFB800]/70 hover:border-[#FFB800]/60 hover:text-[#FFB800]'
                }`}
                title="View profile"
              >
                <User className="w-3 h-3" />
                {address.slice(0, 6)}...{address.slice(-4)}
              </button>
            ) : (
              <appkit-button size="sm" />
            )
          )}

          {isMiniPay && isConnected && address && (
            <button
              onClick={() => onSwitchView('profile')}
              className="flex items-center gap-1.5 text-green-500 font-mono text-[10px] tracking-widest border border-green-500/30 px-2.5 py-1 hover:bg-green-500/10 transition-colors"
            >
              <User className="w-3 h-3" />
              {address.slice(0, 6)}...{address.slice(-4)}
            </button>
          )}
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex border-t border-[#FFB800]/10">
        {NAV_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onSwitchView(tab.id)}
            className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${
              activeView === tab.id
                ? 'border-[#FFB800] text-[#FFB800] bg-[#FFB800]/5'
                : 'border-transparent text-[#FFB800]/30 hover:text-[#FFB800]/60 hover:bg-[#FFB800]/3'
            } ${tab.id === 'claim' ? 'md:text-[10px]' : ''}`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.short}</span>
          </button>
        ))}

        {/* Profile tab — only show when connected */}
        <button
          onClick={() => onSwitchView('profile')}
          className={`px-4 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${
            activeView === 'profile'
              ? 'border-[#FFB800] text-[#FFB800] bg-[#FFB800]/5'
              : 'border-transparent text-[#FFB800]/30 hover:text-[#FFB800]/60 hover:bg-[#FFB800]/3'
          }`}
          title="Profile"
        >
          <User className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
