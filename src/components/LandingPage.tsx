import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { isMiniPay } from '../lib/web3';
import { NFT_TIERS } from '../constants/contract';
import { AaveLiveMarket } from './AaveLiveMarket';
import { MiniActivityFeed } from './MiniActivityFeed';
import type { AppView } from '../App';

// ── Logo asset ────────────────────────────────────────────────────────────────
// The PNG ships in the repo root; Vite resolves it at build time.
// Falls back to an inline SVG placeholder if the import fails.
const LOGO_URL = '/Proof_of_Alpha_Logo.png';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { size?: string };
    }
  }
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-[#FFB800]/20 bg-[#0a0a0a] p-4 text-center">
      <div className="text-2xl font-black text-[#FFB800] tracking-tight mb-1">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[#FFB800]/40 font-mono">{label}</div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#FFB800]/20 mb-2 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-[#FFB800]/5 transition-colors focus:outline-none"
      >
        <span className="text-xs uppercase tracking-widest font-bold text-[#FFB800]">{q}</span>
        <span className="text-[#FFB800]/60 text-lg leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-xs text-[#FFB800]/60 leading-relaxed font-mono border-t border-[#FFB800]/10">
          {a}
        </div>
      )}
    </div>
  );
}

function ConnectWalletDesktop() {
  const { address, isConnected } = useAccount();
  if (isMiniPay) return null;
  if (!isConnected) return <appkit-button size="sm" />;
  return (
    <span className="text-[#FFB800] font-mono text-xs tracking-widest border border-[#FFB800]/30 px-3 py-1">
      {address?.slice(0, 6)}...{address?.slice(-4)}
    </span>
  );
}

function useTypingEffect(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; }
      else clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

interface LandingPageProps {
  onEnter: (view?: AppView) => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const tagline = useTypingEffect('ANALYZE. COMPETE. EARN. PROVE YOUR ALPHA ON-CHAIN.', 35);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#050505] text-[#FFB800] font-mono">
      {/* CRT overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.025] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-[#FFB800]/20 bg-[#050505]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#FFB800]/30 flex-shrink-0 bg-[#111]">
              <img
                src={LOGO_URL}
                alt="Proof of Alpha"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <span className="text-[#FFB800] text-sm tracking-widest uppercase font-black">PROOF OF ALPHA</span>
          </div>

          <div className="flex items-center gap-6 text-[10px] tracking-widest">
            <a href="#about"  className="text-white/50 hover:text-[#FFB800] transition-colors uppercase hidden sm:inline">ABOUT</a>
            <a href="#how"    className="text-white/50 hover:text-[#FFB800] transition-colors uppercase hidden sm:inline">HOW IT WORKS</a>
            <a href="#arena"  className="text-white/50 hover:text-[#FFB800] transition-colors uppercase hidden sm:inline">ARENA</a>
            <a href="#vault"  className="text-white/50 hover:text-[#FFB800] transition-colors uppercase hidden sm:inline">VAULT</a>
            <a href="#faq"    className="text-white/50 hover:text-[#FFB800] transition-colors uppercase hidden sm:inline">FAQ</a>
            <ConnectWalletDesktop />
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-start px-4 pt-16 pb-12 text-center relative overflow-hidden" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top, 0px) + 3rem)' }}>
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#FFB800 1px, transparent 1px), linear-gradient(90deg, #FFB800 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />

        {/* ── Logo watermark / background shadow ── */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <img
            src={LOGO_URL}
            alt=""
            className="w-[520px] h-[520px] md:w-[700px] md:h-[700px] object-contain select-none"
            style={{
              opacity: 0.045,
              filter: 'blur(18px) saturate(0.6)',
              transform: 'translateY(-5%)',
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        {/* Extra gold radial glow behind logo */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(255,184,0,0.07) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-[#FFB800]/30 px-4 py-1.5 text-[10px] uppercase tracking-widest text-[#FFB800]/60 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Built on Celo • Powered by Groq AI • V3.0.0
          </div>

          <h1
            className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 leading-none"
            style={{ textShadow: '0 0 40px rgba(255,184,0,0.4), 0 0 80px rgba(255,184,0,0.15)' }}
          >
            PROOF OF<br />ALPHA
          </h1>

          <p className="text-sm md:text-base text-[#FFB800]/70 tracking-widest uppercase mb-2 h-6 min-h-[1.5rem]">
            {tagline}
            <span className={`${blink ? 'opacity-100' : 'opacity-0'} transition-opacity`}>█</span>
          </p>

          <p className="text-xs text-[#FFB800]/40 tracking-widest uppercase mb-12 max-w-lg mx-auto leading-relaxed">
            Three tools. One ecosystem. Analyze any EVM transaction, compete in the Alpha Arena, and earn real DeFi yield in the Alpha Vault.
          </p>

          {/* ── 3 CTAs ── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              onClick={() => onEnter('terminal')}
              className="w-full sm:w-auto bg-[#FFB800] text-[#050505] px-8 py-4 font-black text-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,184,0,0.3)]"
            >
              {'>'} LAUNCH TERMINAL
            </button>
            <button
              onClick={() => onEnter('arena')}
              className="w-full sm:w-auto border-2 border-[#FFB800] text-[#FFB800] px-8 py-4 font-black text-sm uppercase tracking-widest hover:bg-[#FFB800]/10 active:scale-95 transition-all"
            >
              ⚔ ENTER ARENA
            </button>
            <button
              onClick={() => onEnter('vault')}
              className="w-full sm:w-auto border border-[#FFB800]/40 text-[#FFB800]/70 px-8 py-4 font-black text-sm uppercase tracking-widest hover:border-[#FFB800] hover:text-[#FFB800] active:scale-95 transition-all"
            >
              ◈ ALPHA VAULT
            </button>
          </div>

          <p className="text-[10px] text-[#FFB800]/25 uppercase tracking-widest">
            TERMINAL_V3.0.0 // CELO_MAINNET // AI_ENGINE: GROQ_LLAMA_3.3_70B
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
          <span className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">SCROLL</span>
          <div className="w-px h-8 bg-gradient-to-b from-[#FFB800]/30 to-transparent" />
        </div>
      </section>

      {/* ── MINI ACTIVITY FEED (shown when wallet connected) ── */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <MiniActivityFeed />
      </div>

      {/* ── AAVE LIVE MARKET — injected right after Hero CTA ── */}
      <AaveLiveMarket />

      {/* ── About ── */}
      <section id="about" className="py-24 px-4 border-t border-[#FFB800]/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest mb-3">// 01</div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-8 text-[#FFB800]">
            WHAT IS PROOF OF ALPHA?
          </h2>
          <div className="space-y-4 text-sm text-[#FFB800]/70 leading-relaxed max-w-2xl">
            <p>
              Proof of Alpha is a full on-chain intelligence ecosystem built on Celo. It combines three
              products into one platform: a forensic analysis terminal powered by Groq AI, a competitive
              arena where wallets battle for supremacy, and a DeFi vault that puts your idle assets to work.
            </p>
            <p>
              At its core, every transaction you analyze generates a unique Alpha Score — a number from 1
              to 100 reflecting the sophistication of your on-chain activity. That score becomes a Soulbound
              Token: a non-transferable, permanent, on-chain credential bound to your wallet. It cannot be
              sold, moved, or forged.
            </p>
            <p>
              Earn real DeFi yield in the Alpha Vault via Aave V3 on Celo. Compete daily in Alpha Hunt.
              Your SBT is your entry pass into the full ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            <StatCard value="3"     label="PRODUCTS" />
            <StatCard value="CELO"  label="MAINNET" />
            <StatCard value="GROQ"  label="AI ENGINE" />
            <StatCard value="AAVE"  label="YIELD LAYER" />
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="py-24 px-4 border-t border-[#FFB800]/20 bg-[#080808]">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest mb-3">// 02</div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-12 text-[#FFB800]">HOW IT WORKS</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01', icon: '🔍', title: 'PASTE TX HASH',
                desc: 'Input any EVM transaction hash from Celo, Ethereum, Base, Arbitrum, or any major EVM chain. The forensic engine fetches raw on-chain data automatically.',
              },
              {
                step: '02', icon: '⚡', title: 'RUN ANALYSIS',
                desc: 'Groq AI (LLaMA 3.3 70B) scans the transaction — decoding contract calls, gas behavior, value flows, and event logs — to compute your Alpha Score.',
              },
              {
                step: '03', icon: '🏆', title: 'MINT YOUR SBT',
                desc: 'Lock your score permanently on Celo Mainnet as a Soulbound Token. Non-transferable. On-chain proof that belongs exclusively to your wallet.',
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="border border-[#FFB800]/20 bg-[#050505] p-6 relative">
                <div className="absolute top-4 right-4 text-4xl font-black text-[#FFB800]/5">{step}</div>
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-2">{title}</h3>
                <p className="text-[11px] text-[#FFB800]/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SBT Tier Preview ── */}
      <section className="py-24 px-4 border-t border-[#FFB800]/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest mb-3">// 03</div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-[#FFB800]">SBT TIER SYSTEM</h2>
          <p className="text-xs text-[#FFB800]/40 tracking-widest uppercase mb-10">
            Your Alpha Score determines which Soulbound Token you earn. Higher tier = bigger $PROOF multiplier in the Vault.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(NFT_TIERS).map(([key, tier], index) => (
              <div key={key} className="border border-[#FFB800]/20 bg-[#0a0a0a] p-5 flex flex-col items-center group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 text-[8px] font-bold uppercase tracking-widest text-green-500">
                  TIER {index + 1}
                </div>
                <div className="w-28 h-28 border border-[#FFB800]/30 mb-4 overflow-hidden">
                  <img src={tier.png} alt={tier.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#FFB800] mb-1">{tier.name}</h3>
                <p className="text-[10px] text-[#FFB800]/40 tracking-widest">SCORE: {tier.range[0]} — {tier.range[1]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Alpha Arena ── */}
      <section id="arena" className="py-24 px-4 border-t border-[#FFB800]/20 bg-[#080808]">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest mb-3">// 04</div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-[#FFB800]">ALPHA ARENA</h2>
          <p className="text-xs text-[#FFB800]/50 tracking-widest uppercase mb-10 max-w-2xl leading-relaxed">
            Two competitive game modes that use the Terminal as the scoring engine. Every submission is a real forensic analysis.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Alpha Hunt */}
            <div className="border border-[#FFB800]/30 bg-[#050505] p-6">
              <div className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3 flex items-center gap-2">
                <span className="text-lg">🎯</span> ALPHA HUNT
              </div>
              <p className="text-[11px] text-[#FFB800]/50 leading-relaxed mb-4">
                Every 24 hours, a new target wallet is revealed — notable traders, whales, and historic on-chain actors.
                Find a transaction from that wallet, submit it, and get it forensic-scored by AI.
                Highest score on the daily leaderboard wins. Resets every day.
              </p>
              <div className="text-[9px] text-green-400 uppercase tracking-widest">● LIVE NOW</div>
            </div>

            {/* Alpha Duel */}
            <div className="border border-[#FFB800]/10 bg-[#050505] p-6 opacity-70">
              <div className="text-xs font-black uppercase tracking-widest text-[#FFB800]/50 mb-3 flex items-center gap-2">
                <span className="text-lg">⚔️</span> ALPHA DUEL
              </div>
              <p className="text-[11px] text-[#FFB800]/30 leading-relaxed mb-4">
                Challenge any wallet head-to-head. Both players submit a TX hash. AI scores both. Higher score wins.
                ELO rating system, season leaderboard, and tier-based matchmaking. Requires a minted SBT to enter.
              </p>
              <div className="text-[9px] text-[#FFB800]/25 uppercase tracking-widest border border-[#FFB800]/10 inline-block px-2 py-0.5">COMING SOON</div>
            </div>
          </div>

          {/* ── SBT UTILITY callout ── */}
          <div className="border border-[#B6509E]/30 bg-[#B6509E]/5 p-6 mb-8 relative overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute -top-6 -right-6 w-32 h-32 opacity-10 pointer-events-none rounded-full"
              style={{ background: 'radial-gradient(circle, #B6509E, transparent)' }} />

            <div className="flex items-start gap-4">
              {/* $PROOF token badge with logo */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 border-[#B6509E]/50 bg-[#111] shadow-[0_0_16px_rgba(182,80,158,0.3)]">
                <img
                  src={LOGO_URL}
                  alt="$PROOF"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = 'none';
                    (t.parentElement as HTMLElement).innerHTML =
                      '<span style="color:#B6509E;font-size:18px;display:flex;align-items:center;justify-content:center;height:100%;font-weight:900">P</span>';
                  }}
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xs font-black uppercase tracking-widest text-[#B6509E]">
                    SBT UTILITY // FUTURE ROADMAP
                  </div>
                  <div className="text-[8px] text-[#B6509E]/60 border border-[#B6509E]/30 px-1.5 py-0.5 uppercase tracking-widest">
                    $PROOF TOKEN
                  </div>
                </div>

                <p className="text-[11px] text-[#FFB800]/60 leading-relaxed mb-3">
                  Your <span className="text-[#FFB800] font-bold">Soulbound Token (SBT)</span> is more than a score badge — it's your future access key to the entire Proof of Alpha ecosystem.
                  As the platform evolves, SBT holders will unlock exclusive utility tied to the <span className="text-[#B6509E] font-bold">$PROOF token</span>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      icon: '⚡',
                      title: 'MULTIPLIED YIELD',
                      desc: 'Higher SBT tier = larger $PROOF multiplier on your Vault deposits. God Mode holders earn maximum allocation.',
                    },
                    {
                      icon: '🗳',
                      title: 'GOVERNANCE POWER',
                      desc: 'SBT tier determines your voting weight in future protocol governance. Prove alpha, earn influence.',
                    },
                    {
                      icon: '🔓',
                      title: 'EXCLUSIVE ACCESS',
                      desc: 'SBT-gated features: private Alpha Hunt rounds, early arena seasons, and premium signal feeds — only for verified alpha hunters.',
                    },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="border border-[#B6509E]/15 bg-[#050505] p-3">
                      <div className="text-base mb-1">{icon}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-[#B6509E] mb-1">{title}</div>
                      <div className="text-[10px] text-[#FFB800]/40 leading-relaxed">{desc}</div>
                    </div>
                  ))}
                </div>

                <p className="text-[9px] text-[#FFB800]/25 uppercase tracking-widest mt-3 font-mono">
                  MINT YOUR SBT NOW TO LOCK IN YOUR TIER BEFORE $PROOF LISTING
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => onEnter('arena')}
            className="border-2 border-[#FFB800] text-[#FFB800] px-8 py-4 font-black text-sm uppercase tracking-widest hover:bg-[#FFB800]/10 active:scale-95 transition-all"
          >
            ⚔ ENTER ARENA
          </button>
        </div>
      </section>

      {/* ── Alpha Vault ── */}
      <section id="vault" className="py-24 px-4 border-t border-[#FFB800]/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest mb-3">// 05</div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-[#FFB800]">ALPHA VAULT</h2>
          <p className="text-xs text-[#FFB800]/50 tracking-widest uppercase mb-10 max-w-2xl leading-relaxed">
            Put your idle CELO and USDC to work. Supply to Aave V3 on Celo — the same battle-tested protocol securing
            billions across DeFi — and earn real yield automatically, every block.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="border border-green-500/30 bg-green-500/5 p-6">
              <div className="text-xs font-black uppercase tracking-widest text-green-400 mb-3">EARN NOW — REAL AAVE YIELD</div>
              <p className="text-[11px] text-green-400/70 leading-relaxed">
                Your supplied assets are deposited directly into Aave V3 on Celo Mainnet. You receive aTokens
                whose balance grows in real time from interest. Withdraw anytime — no lock period enforced by us.
                Full non-custodial. Full transparency.
              </p>
            </div>

            <div className="border border-[#FFB800]/30 bg-[#FFB800]/5 p-6">
              <div className="flex items-center gap-2 mb-3">
                {/* $PROOF token badge */}
                <div className="w-6 h-6 rounded-full overflow-hidden border border-[#FFB800]/40 bg-[#111] flex-shrink-0">
                  <img
                    src={LOGO_URL}
                    alt="$PROOF"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="text-xs font-black uppercase tracking-widest text-[#FFB800]">
                  $PROOF MULTIPLIER — AT LISTING
                </div>
              </div>
              <p className="text-[11px] text-[#FFB800]/70 leading-relaxed">
                Every CELO or USDC supplied to the Vault earns you a $PROOF allocation at token listing.
                Longer commitment + larger deposit = bigger multiplier. Supply now, earn real yield immediately,
                and accumulate $PROOF entitlement for when the token goes live.
              </p>
            </div>
          </div>

          <div className="border border-[#FFB800]/10 bg-[#0a0a0a] p-5 mb-8">
            <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-3">VAULT PARAMETERS</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Protocol',    value: 'Aave V3' },
                { label: 'Network',     value: 'Celo' },
                { label: 'Custody',     value: 'Non-custodial' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-sm font-black text-[#FFB800]">{value}</div>
                  <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onEnter('vault')}
            className="border border-[#FFB800]/40 text-[#FFB800]/70 px-8 py-4 font-black text-sm uppercase tracking-widest hover:border-[#FFB800] hover:text-[#FFB800] active:scale-95 transition-all"
          >
            ◈ OPEN ALPHA VAULT
          </button>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-4 border-t border-[#FFB800]/20 bg-[#080808]">
        <div className="max-w-3xl mx-auto">
          <div className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest mb-3">// 06</div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-10 text-[#FFB800]">FREQUENTLY ASKED QUESTIONS</h2>

          <FaqItem q="WHAT IS AN ALPHA SCORE?" a="Alpha Score is a value from 1 to 100 assigned by our Groq AI forensic engine. It reflects the sophistication, timing, and quality of a transaction — decoded from raw on-chain data including contract interactions, gas behavior, value flows, and event logs." />
          <FaqItem q="WHAT IS A SOULBOUND TOKEN (SBT)?" a="A Soulbound Token is a non-transferable NFT permanently bound to your wallet. It cannot be sold, moved, or forged — making it a true on-chain credential that belongs exclusively to you. Your SBT tier is determined by your Alpha Score and serves as your entry pass to the Alpha Arena." />
          <FaqItem q="WHAT IS ALPHA HUNT?" a="Alpha Hunt is a daily competitive game. Every 24 hours a new target wallet is revealed — notable on-chain actors, whales, or historic traders. You search for a real transaction from that wallet on-chain, submit the TX hash to our Terminal, and the AI scores it. Highest scorer wins the daily leaderboard." />
          <FaqItem q="HOW DOES THE ALPHA VAULT WORK?" a="Alpha Vault lets you supply CELO or USDC directly into Aave V3 on Celo Mainnet — a fully audited, non-custodial DeFi protocol. Your balance grows every block from interest. You also accumulate $PROOF token allocation based on how much you supply and for how long. Withdraw anytime." />
          <FaqItem q="WHAT IS $PROOF TOKEN?" a="$PROOF is the native token of the Proof of Alpha ecosystem, currently in pre-listing phase. Alpha Vault users accumulate $PROOF allocation based on their supplied amount and commitment period. The actual token distribution occurs at official listing. This is not a guarantee of specific value." />
          <FaqItem q="HOW DOES MY SBT AFFECT $PROOF REWARDS?" a="Your SBT tier acts as a permanent multiplier on your $PROOF allocation. A God Mode SBT (score 76–100) earns the highest multiplier, while Elite Scout and Initiate tiers earn proportionally less. The SBT also unlocks future governance rights and gated features — it is your on-chain identity in the ecosystem." />
          <FaqItem q="HOW MUCH DOES MINTING COST?" a="You only pay the Celo Mainnet gas fee, which is typically under $0.01. There are no platform fees for analysis or minting." />
          <FaqItem q="DOES IT WORK WITH MINIPAY?" a="Yes — Proof of Alpha is fully compatible with MiniPay. Open this app inside MiniPay for the best experience. Your wallet is automatically detected and connected." />
          <FaqItem q="WHICH NETWORKS ARE SUPPORTED FOR ANALYSIS?" a="You can analyze transactions from any major EVM network: Celo, Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, and Avalanche. Minting SBTs is exclusively on Celo Mainnet." />
          <FaqItem q="IS THE AAVE VAULT SAFE?" a="Your funds are deposited directly into Aave V3 smart contracts — one of the most audited DeFi protocols in existence. Proof of Alpha does not custody your assets at any point. Always verify contract addresses before signing. DeFi always carries smart contract risk." />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 border-t border-[#FFB800]/20 text-center">
        <div className="max-w-xl mx-auto">
          <h2
            className="text-3xl font-black uppercase tracking-tighter mb-4"
            style={{ textShadow: '0 0 30px rgba(255,184,0,0.3)' }}
          >
            THREE TOOLS.<br />ONE ALPHA PROOF.
          </h2>
          <p className="text-xs text-[#FFB800]/40 uppercase tracking-widest mb-10 leading-relaxed">
            Analyze any EVM transaction. Compete in the Arena.<br />Earn yield in the Vault. All on Celo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onEnter('terminal')}
              className="w-full sm:w-auto bg-[#FFB800] text-[#050505] px-8 py-4 font-black text-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,184,0,0.2)]"
            >
              {'>'} LAUNCH TERMINAL
            </button>
            <button
              onClick={() => onEnter('arena')}
              className="w-full sm:w-auto border-2 border-[#FFB800] text-[#FFB800] px-8 py-4 font-black text-sm uppercase tracking-widest hover:bg-[#FFB800]/10 active:scale-95 transition-all"
            >
              ⚔ ENTER ARENA
            </button>
            <button
              onClick={() => onEnter('vault')}
              className="w-full sm:w-auto border border-[#FFB800]/40 text-[#FFB800]/70 px-8 py-4 font-black text-sm uppercase tracking-widest hover:border-[#FFB800] hover:text-[#FFB800] active:scale-95 transition-all"
            >
              ◈ ALPHA VAULT
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#FFB800]/20 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-[10px] font-mono text-white/30 tracking-widest mb-4 uppercase">
            © 2026 PROOF OF ALPHA // TERMINAL_V3.0.0 // CELO_MAINNET // AAVE_V3
          </div>
          <div className="flex justify-center gap-6 text-[10px] font-mono text-white/25 uppercase tracking-widest flex-wrap">
            <a href="/terms"   className="hover:text-[#FFB800] transition-colors">TERMS</a>
            <a href="/privacy" className="hover:text-[#FFB800] transition-colors">PRIVACY</a>
            <a href="mailto:0xward.dev@gmail.com" className="hover:text-[#FFB800] transition-colors">SUPPORT</a>
            <a href="https://celoscan.io/address/0x80E98C8a0d4aeF4b800E861298Eca15C97Cf1c6E" target="_blank" rel="noreferrer" className="hover:text-[#FFB800] transition-colors">CONTRACT</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
