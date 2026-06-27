import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Loader2, Edit2, Check, X, ExternalLink, Trophy, Zap, Shield } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ReferralPanel } from './ReferralPanel';
import { WalletIntelligenceReport } from './WalletIntelligenceReport';
import { StreakBanner } from './StreakBanner';

interface ProfileData {
  wallet: string;
  user: { displayName: string; totalHuntsWon: number; totalVaultDays: number; createdAt: any };
  points: { totalPoints: number; pendingPoints: number; claimedPoints: number; history: any[] };
  vault: { positions: any[]; totalPointsEarned: number };
  huntHistory: { date: string; score: number; verdict: string; txHash: string; won: boolean }[];
  nextClaimDate: string;
}

type RankTier = { label: string; min: number; color: string; bg: string; border: string };

const RANKS: RankTier[] = [
  { label: 'SCOUT',    min: 0,    color: 'text-gray-400',   bg: 'bg-gray-400/10',   border: 'border-gray-400/30'   },
  { label: 'HUNTER',  min: 500,  color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/30'   },
  { label: 'ELITE',   min: 2000, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  { label: 'GOD MODE',min: 5000, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
];

function getRank(pts: number): RankTier {
  return [...RANKS].reverse().find(r => pts >= r.min) ?? RANKS[0];
}

// Generate deterministic gradient avatar from wallet address
function WalletAvatar({ wallet, size = 80 }: { wallet: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !wallet) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = size, h = size;
    canvas.width  = w;
    canvas.height = h;

    // Derive colors from wallet bytes
    const hex  = wallet.replace('0x', '').toLowerCase();
    const r1   = parseInt(hex.slice(0, 2),  16);
    const g1   = parseInt(hex.slice(2, 4),  16);
    const b1   = parseInt(hex.slice(4, 6),  16);
    const r2   = parseInt(hex.slice(6, 8),  16);
    const g2   = parseInt(hex.slice(8, 10), 16);
    const b2   = parseInt(hex.slice(10,12), 16);
    const r3   = parseInt(hex.slice(12,14), 16);
    const g3   = parseInt(hex.slice(14,16), 16);
    const b3   = parseInt(hex.slice(16,18), 16);

    const c1 = `rgb(${r1},${g1},${b1})`;
    const c2 = `rgb(${r2},${g2},${b2})`;
    const c3 = `rgb(${r3},${g3},${b3})`;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0,   c1);
    bg.addColorStop(0.5, c2);
    bg.addColorStop(1,   c3);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Grid pattern from hex pairs
    const cols = 5, rows = 5;
    const cw = w / cols, ch = h / rows;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const byteIdx = ((i * cols + j) * 2) % (hex.length - 2);
        const val     = parseInt(hex.slice(byteIdx, byteIdx + 2), 16);
        if (val > 127) {
          const rb = parseInt(hex.slice((byteIdx + 4) % (hex.length - 2), (byteIdx + 6) % (hex.length - 2) + 2), 16);
          ctx.fillStyle = `rgba(255,255,255,${(val - 127) / 255 * 0.6})`;
          if (rb > 200) {
            ctx.beginPath();
            ctx.arc(j * cw + cw / 2, i * ch + ch / 2, Math.min(cw, ch) * 0.35, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(j * cw + cw * 0.1, i * ch + ch * 0.1, cw * 0.8, ch * 0.8);
          }
        }
      }
    }

    // Center initials overlay
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font      = `bold ${Math.floor(w * 0.2)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(wallet.slice(2, 4).toUpperCase(), w / 2, h / 2);
  }, [wallet, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} className="flex-shrink-0" />;
}

interface ProfilePageProps { onClose?: () => void; }

export function ProfilePage({ onClose }: ProfilePageProps) {
  const { address } = useAccount();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [editingName, setEditingName]   = useState(false);
  const [nameInput, setNameInput]       = useState('');
  const [savingName, setSavingName]     = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setFetchError(false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000); // 15s timeout

    fetch(`/api/profile/${address}`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setProfile(d); setNameInput(d.user?.displayName ?? ''); })
      .catch(() => { setFetchError(true); })
      .finally(() => { clearTimeout(timer); setLoading(false); });

    return () => { controller.abort(); clearTimeout(timer); };
  }, [address]);

  const saveName = async () => {
    if (!address || !nameInput.trim()) return;
    setSavingName(true);
    try {
      await fetch('/api/profile/display-name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, displayName: nameInput.trim() }),
      });
      setProfile(p => p ? { ...p, user: { ...p.user, displayName: nameInput.trim() } } : p);
      setEditingName(false);
    } catch (_) {}
    finally { setSavingName(false); }
  };

  if (!address) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 font-mono text-center">
        <div className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest">CONNECT WALLET TO VIEW PROFILE</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 font-mono flex items-center justify-center gap-3 text-[#FFB800]/40">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-[10px] uppercase tracking-widest animate-pulse">LOADING_PROFILE...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 font-mono text-center space-y-3">
        <div className="text-[10px] text-red-400/60 uppercase tracking-widest">FAILED TO LOAD PROFILE</div>
        <p className="text-[9px] text-[#FFB800]/20 uppercase tracking-widest">Server timeout or connection error. Try again.</p>
        <button
          onClick={() => { setFetchError(false); setLoading(true); fetch(`/api/profile/${address}`).then(r => r.json()).then(d => { setProfile(d); setNameInput(d.user?.displayName ?? ''); }).catch(() => setFetchError(true)).finally(() => setLoading(false)); }}
          className="text-[10px] text-[#FFB800]/40 hover:text-[#FFB800] uppercase tracking-widest border border-[#FFB800]/20 px-4 py-2 transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const rank        = getRank(profile.points.totalPoints);
  const pendingProof = (profile.points.pendingPoints / 100) * 50;
  const claimedProof = (profile.points.claimedPoints / 100) * 50;
  const totalPtsPerDay = profile.vault.positions.reduce((s: number, p: any) => s + (p.ptsPerDay ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-mono space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="border border-[#FFB800]/20 bg-[#050505] p-6">
        <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-[0.3em] mb-4">// ALPHA_PROFILE</div>
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="border-2 border-[#FFB800]/30 overflow-hidden flex-shrink-0">
            <WalletAvatar wallet={address} size={88} />
          </div>

          {/* Name + wallet */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  className="bg-transparent border border-[#FFB800]/40 text-[#FFB800] font-black text-lg px-3 py-1 outline-none focus:border-[#FFB800] transition-colors uppercase tracking-tight w-48"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  maxLength={32}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                />
                <button onClick={saveName} disabled={savingName} className="text-green-400 hover:text-green-300 transition-colors">
                  {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditingName(false)} className="text-red-400 hover:text-red-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2 group">
                <span className="text-xl font-black uppercase tracking-tight text-[#FFB800]">
                  {profile.user.displayName}
                </span>
                <button
                  onClick={() => setEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#FFB800]/30 hover:text-[#FFB800]/70"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="text-[10px] text-[#FFB800]/30 font-mono mb-3">{address}</div>

            {/* Rank badge */}
            <div className={`inline-flex items-center gap-2 border px-3 py-1.5 ${rank.bg} ${rank.border}`}>
              <Shield className={`w-3 h-3 ${rank.color}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${rank.color}`}>{rank.label}</span>
              <span className="text-[8px] text-[#FFB800]/20 uppercase">
                {rank.min === 5000 ? '5000+ PTS' :
                 rank.min === 2000 ? '2000–4999 PTS' :
                 rank.min === 500  ? '500–1999 PTS' : '0–499 PTS'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS GRID ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL POINTS',    value: profile.points.totalPoints.toLocaleString(),  color: 'text-[#FFB800]' },
          { label: 'PENDING POINTS',  value: profile.points.pendingPoints.toLocaleString(), color: 'text-yellow-400' },
          { label: 'HUNTS WON',       value: profile.user.totalHuntsWon,                    color: 'text-green-400' },
          { label: 'VAULT DAYS',      value: profile.user.totalVaultDays,                   color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="border border-[#FFB800]/15 bg-[#080808] p-4 text-center">
            <div className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest mb-2">{stat.label}</div>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── $PROOF SUMMARY ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-[#FFB800]/20 bg-[#080808] p-4">
          <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-2">PENDING $PROOF</div>
          <div className="text-xl font-black text-yellow-400">{pendingProof.toFixed(2)}</div>
          <div className="text-[9px] text-[#FFB800]/20 mt-1">SETTLES NEXT SUNDAY</div>
        </div>
        <div className="border border-[#FFB800]/20 bg-[#080808] p-4">
          <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-2">CLAIMED $PROOF</div>
          <div className="text-xl font-black text-green-400">{claimedProof.toFixed(2)}</div>
          <div className="text-[9px] text-[#FFB800]/20 mt-1">ALL-TIME CLAIMED</div>
        </div>
        <div className="border border-[#FFB800]/20 bg-[#080808] p-4">
          <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-2">VAULT PTS/DAY</div>
          <div className="text-xl font-black text-[#FFB800]">{totalPtsPerDay.toFixed(2)}</div>
          <div className="text-[9px] text-[#FFB800]/20 mt-1">FROM ACTIVE POSITIONS</div>
        </div>
      </div>

      {/* ── RANK PROGRESS ────────────────────────────────────────────────── */}
      <div className="border border-[#FFB800]/15 bg-[#050505] p-5">
        <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-4">RANK PROGRESSION</div>
        <div className="flex items-center gap-0">
          {RANKS.map((r, i) => {
            const isActive = rank.label === r.label;
            const isPast   = profile.points.totalPoints >= r.min;
            return (
              <div key={r.label} className="flex items-center flex-1">
                <div className={`flex flex-col items-center flex-1 ${i === 0 ? '' : ''}`}>
                  <div className={`w-full h-1.5 ${isPast ? 'bg-[#FFB800]' : 'bg-[#FFB800]/10'} transition-all`} />
                  <div className={`text-[8px] mt-1.5 uppercase font-black ${isActive ? r.color : isPast ? 'text-[#FFB800]/50' : 'text-[#FFB800]/15'}`}>
                    {r.label}
                  </div>
                  <div className="text-[7px] text-[#FFB800]/15 uppercase">{r.min.toLocaleString()}+</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── HUNT HISTORY ─────────────────────────────────────────────────── */}
      <div className="border border-[#FFB800]/20 bg-[#050505]">
        <div className="px-5 py-4 border-b border-[#FFB800]/10 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-[#FFB800]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB800]">HUNT HISTORY</span>
          <span className="text-[9px] text-[#FFB800]/20 ml-auto">LAST 10 ROUNDS</span>
        </div>
        {profile.huntHistory.length === 0 ? (
          <div className="px-5 py-6 text-[10px] text-[#FFB800]/15 uppercase tracking-widest">
            NO HUNT HISTORY YET — SUBMIT YOUR FIRST TX IN ALPHA ARENA
          </div>
        ) : (
          <div className="divide-y divide-[#FFB800]/5">
            {profile.huntHistory.map((h, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${h.won ? 'bg-yellow-400 shadow-[0_0_6px_rgba(255,200,0,0.6)]' : 'bg-[#FFB800]/20'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-[#FFB800]/50">{h.date}</div>
                  <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest truncate mt-0.5">{h.verdict}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-black ${h.won ? 'text-yellow-400' : 'text-[#FFB800]'}`}>{h.score}/100</div>
                  {h.won && <div className="text-[8px] text-yellow-400/60 uppercase">WINNER</div>}
                </div>
                <a
                  href={`https://etherscan.io/tx/${h.txHash}`}
                  target="_blank" rel="noreferrer"
                  className="text-[#FFB800]/15 hover:text-[#FFB800]/40 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ACTIVE VAULT POSITIONS ───────────────────────────────────────── */}
      <div className="border border-[#FFB800]/20 bg-[#050505]">
        <div className="px-5 py-4 border-b border-[#FFB800]/10 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#FFB800]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB800]">ACTIVE VAULT POSITIONS</span>
        </div>
        {profile.vault.positions.length === 0 ? (
          <div className="px-5 py-6 text-[10px] text-[#FFB800]/15 uppercase tracking-widest">
            NO ACTIVE POSITIONS
          </div>
        ) : (
          <div className="divide-y divide-[#FFB800]/5">
            {profile.vault.positions.map((pos: any, i: number) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black text-[#FFB800]">{pos.symbol}</div>
                  <div className="text-[9px] text-[#FFB800]/30">{parseFloat(pos.amountHuman || '0').toFixed(4)} tokens</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-green-400 font-black">+{Math.floor(pos.pendingPts ?? 0)} pts accrued</div>
                  <div className="text-[9px] text-[#FFB800]/30">{(pos.ptsPerDay ?? 0).toFixed(2)} pts/day</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DAILY STREAK ─────────────────────────────────────────────────── */}
      <StreakBanner />

      {/* ── REFERRAL PROGRAM ─────────────────────────────────────────────── */}
      <ReferralPanel />

      {/* ── WALLET INTELLIGENCE REPORT ───────────────────────────────────── */}
      <WalletIntelligenceReport />

    </div>
  );
}
