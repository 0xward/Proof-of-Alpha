import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ForensicTerminal } from './components/ForensicTerminal';
import { MiniPayDonation } from './components/MiniPayDonation';
import { LandingPage } from './components/LandingPage';
import { TermsPage } from './components/TermsPage';
import { PrivacyPage } from './components/PrivacyPage';
import { AlphaArena } from './components/AlphaArena';
import { AlphaVault } from './components/AlphaVault';
import { ProfilePage } from './components/ProfilePage';
import { ClaimPage } from './components/ClaimPage';
import { Providers } from './components/Providers';
import { useAutoConnect } from './hooks/useAutoConnect';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { size?: string };
    }
  }
}

export type AppView = 'terminal' | 'arena' | 'vault' | 'profile' | 'claim';

function AppInner() {
  useAutoConnect();
  const path = window.location.pathname;
  if (path === '/terms')   return <TermsPage />;
  if (path === '/privacy') return <PrivacyPage />;
  return <MainApp />;
}

function MainApp() {
  const [hasEntered, setHasEntered] = useState<boolean>(() =>
    sessionStorage.getItem('poa_entered') === 'true'
  );
  const [activeView, setActiveView] = useState<AppView>(() =>
    (sessionStorage.getItem('poa_view') as AppView) || 'terminal'
  );

  useEffect(() => {
    document.title = 'Proof of Alpha';
    const metaName    = 'talentapp:project_verification';
    const metaContent = 'b71148c8d6676da5cb26c62c8c123b41cedf044e79c7eddf153cd58c4749710995f7edf9399e665bccb5965478d5c2e3bb2b5d148cd3c98ba7a15fb90e2b28c7';
    let meta = document.querySelector(`meta[name="${metaName}"]`);
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', metaName); document.head.appendChild(meta); }
    meta.setAttribute('content', metaContent);
  }, []);

  useEffect(() => {
    const handlePop = () => { if (sessionStorage.getItem('poa_entered') === 'true') setHasEntered(true); };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const handleEnter = (view: AppView = 'terminal') => {
    sessionStorage.setItem('poa_entered', 'true');
    sessionStorage.setItem('poa_view', view);
    setActiveView(view);
    setHasEntered(true);
  };

  const handleBack = () => {
    sessionStorage.removeItem('poa_entered');
    sessionStorage.removeItem('poa_view');
    setHasEntered(false);
  };

  const handleSwitchView = (view: AppView) => {
    sessionStorage.setItem('poa_view', view);
    setActiveView(view);
  };

  if (!hasEntered) return <LandingPage onEnter={handleEnter} />;

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-[#FFB800] selection:bg-[#FFB800] selection:text-[#050505]">
      {/* CRT scanline — opacity minimal supaya font crisp */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.01] bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_3px]" />

      <Header onBack={handleBack} activeView={activeView} onSwitchView={handleSwitchView} />

      <main className="pb-24">
        {activeView === 'terminal' && <ForensicTerminal />}
        {activeView === 'arena'    && <AlphaArena />}
        {activeView === 'vault'    && <AlphaVault />}
        {activeView === 'profile'  && <ProfilePage />}
        {activeView === 'claim'    && <ClaimPage />}
      </main>

      <MiniPayDonation />

      <footer className="border-t border-[#FFB800]/20 px-6 py-5 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-[#FFB800]/30 font-mono">
          <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
              Status: Operational
            </span>
            <span>Network: Celo_Mainnet</span>
          </div>
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <a href="/terms"   className="hover:text-[#FFB800] transition-colors">TERMS</a>
            <a href="/privacy" className="hover:text-[#FFB800] transition-colors">PRIVACY</a>
            <a href="mailto:0xward.dev@gmail.com" className="hover:text-[#FFB800] transition-colors">SUPPORT</a>
            <a
              href="https://celoscan.io/address/0x80E98C8a0d4aeF4b800E861298Eca15C97Cf1c6E"
              target="_blank" rel="noreferrer"
              className="hover:text-[#FFB800] transition-colors"
            >
              CONTRACT
            </a>
            <span>© 2026 PROOF OF ALPHA // TERMINAL_V3.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <AppInner />
    </Providers>
  );
}
