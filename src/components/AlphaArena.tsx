import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Trophy, Zap, ExternalLink, AlertTriangle, Clock, Users, CheckCircle2 } from 'lucide-react';
import { useAccount } from 'wagmi';

interface Submission {
  rank: number;
  wallet: string;
  txHash: string;
  aiScore: number;
  aiVerdict: string;
  aiTier: string;
  network: string;
  timestamp: number | null;
}

interface RoundData {
  date: string;
  submissions: Submission[];
  timeRemaining: number;
  judged: boolean;
  winner: { wallet: string; txHash: string; score: number; decidedAt: any } | null;
  totalSubmissions: number;
}

interface HuntResult {
  score: number;
  tier: string;
  verdict: string;
  summary: string;
  signals: string[];
  riskFlags: string[];
  position: number;
  network: string;
}

const TIER_COLOR: Record<string, string> = {
  'God Mode':    'text-yellow-400',
  'Elite Scout': 'text-blue-400',
  'Initiate':    'text-green-400',
};
const TIER_BG: Record<string, string> = {
  'God Mode':    'bg-yellow-400/10 border-yellow-400/30',
  'Elite Scout': 'bg-blue-400/10 border-blue-400/30',
  'Initiate':    'bg-green-400/10 border-green-400/30',
};

// ── Hitung detik tersisa sampai midnight UTC real-time dari jam lokal ──────────
function secondsUntilMidnightUTC(): number {
  const now     = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1, // besok
    0, 0, 0, 0
  ));
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function truncateWallet(w: string): string {
  return `${w.slice(0, 8)}...${w.slice(-4)}`;
}

export function AlphaArena() {
  const { address, isConnected } = useAccount();

  const [round, setRound]           = useState<RoundData | null>(null);
  const [loading, setLoading]       = useState(true);
  // Countdown dihitung real-time dari jam device, bukan dari server
  const [countdown, setCountdown]   = useState<number>(secondsUntilMidnightUTC);

  const [txInput, setTxInput]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [huntResult, setHuntResult]   = useState<HuntResult | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch round data (tidak override countdown dari server) ─────────────────
  const fetchRound = async () => {
    try {
      const r    = await fetch('/api/hunt/round');
      const data: RoundData = await r.json();
      setRound(data);
      // JANGAN setCountdown dari data.timeRemaining — kita hitung sendiri di client
      if (address) {
        const mine = data.submissions.find(
          s => s.wallet.toLowerCase() === address.toLowerCase()
        );
        if (mine) setMySubmission(mine);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRound();
    pollRef.current = setInterval(fetchRound, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [address]);

  // ── Countdown tick — dihitung ulang tiap detik dari UTC clock ───────────────
  useEffect(() => {
    // Sync awal
    setCountdown(secondsUntilMidnightUTC());

    tickRef.current = setInterval(() => {
      setCountdown(secondsUntilMidnightUTC());
    }, 1000);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!txInput.trim() || !address || !isConnected) return;
    setSubmitting(true);
    setSubmitError('');
    setHuntResult(null);

    try {
      const res = await fetch('/api/hunt/submit-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: txInput.trim(), walletAddress: address }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'ALREADY_SUBMITTED' && data.submission) {
          setMySubmission(data.submission);
        }
        setSubmitError(data.message || data.error || 'Submission failed.');
        setSubmitting(false);
        return;
      }

      setHuntResult(data as HuntResult);
      setMySubmission({
        rank:      data.position,
        wallet:    address,
        txHash:    txInput.trim(),
        aiScore:   data.score,
        aiVerdict: data.verdict,
        aiTier:    data.tier,
        network:   data.network,
        timestamp: Date.now() / 1000,
      });
      setTxInput('');
      fetchRound();
    } catch (_) {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasSubmitted = !!mySubmission;
  const isWinner     = round?.winner?.wallet?.toLowerCase() === address?.toLowerCase();

  // Warna countdown — merah kalau < 1 jam
  const countdownColor = countdown < 3600 ? 'text-red-400' : countdown < 10800 ? 'text-orange-400' : 'text-[#FFB800]';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-mono space-y-6">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="border border-[#FFB800]/20 bg-[#050505] p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,184,0,0.05),transparent_60%)]" />
        <div className="relative">
          <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-[0.3em] mb-1">// ALPHA_ARENA_V2</div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-[#FFB800] mb-2">ALPHA HUNT</h1>
          <p className="text-[11px] text-[#FFB800]/50 uppercase tracking-widest leading-relaxed max-w-2xl">
            Submit any transaction hash you think is most alpha. AI forensic engine scores it.
            Highest score per 24h UTC round wins{' '}
            <span className="text-[#FFB800]">100 PTS → 50 $PROOF</span>.
          </p>
        </div>
      </div>

      {/* ── ROUND STATUS CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Countdown — real UTC */}
        <div className="border border-[#FFB800]/15 bg-[#080808] p-4 flex flex-col gap-1">
          <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> ROUND ENDS
          </div>
          <div className={`text-xl font-black tabular-nums tracking-widest ${countdownColor}`}>
            {formatCountdown(countdown)}
          </div>
          <div className="text-[9px] text-[#FFB800]/25">
            {round?.date ?? new Date().toISOString().slice(0, 10)} UTC
          </div>
        </div>

        {/* Submissions */}
        <div className="border border-[#FFB800]/15 bg-[#080808] p-4 flex flex-col gap-1">
          <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest flex items-center gap-1.5">
            <Users className="w-3 h-3" /> SUBMISSIONS
          </div>
          <div className="text-xl font-black text-[#FFB800]">
            {loading ? <span className="animate-pulse">...</span> : round?.totalSubmissions ?? 0}
          </div>
          <div className="text-[9px] text-[#FFB800]/25">this round</div>
        </div>

        {/* Status */}
        <div className="border border-[#FFB800]/15 bg-[#080808] p-4 flex flex-col gap-1">
          <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest flex items-center gap-1.5">
            <Trophy className="w-3 h-3" /> STATUS
          </div>
          <div className={`text-sm font-black uppercase ${round?.judged ? 'text-yellow-400' : 'text-green-400'}`}>
            {round?.judged ? 'JUDGED' : 'LIVE'}
          </div>
          <div className="text-[9px] text-[#FFB800]/25">
            {round?.judged ? 'winner decided' : 'accepting entries'}
          </div>
        </div>
      </div>

      {/* ── WINNER BANNER ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {round?.judged && round.winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border-2 border-yellow-400 bg-[#050505] p-6 shadow-[0_0_60px_rgba(255,200,0,0.2)] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,184,0,0.07),transparent_70%)]" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🏆</span>
                <div>
                  <div className="text-[10px] text-yellow-400/60 uppercase tracking-widest">ROUND WINNER</div>
                  <div className="text-xl font-black text-yellow-400 uppercase tracking-tight">
                    {isWinner ? 'YOU WON! 🎉' : truncateWallet(round.winner.wallet)}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-3xl font-black text-yellow-400">
                    {round.winner.score}
                    <span className="text-lg text-yellow-400/40">/100</span>
                  </div>
                  <div className="text-[9px] text-yellow-400/50 uppercase tracking-widest">ALPHA SCORE</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 border-t border-yellow-400/20 pt-4">
                <div>
                  <div className="text-[9px] text-yellow-400/40 uppercase tracking-widest mb-1">WINNING TX</div>
                  <a
                    href={`https://etherscan.io/tx/${round.winner.txHash}`}
                    target="_blank" rel="noreferrer"
                    className="text-[10px] text-yellow-400/70 hover:text-yellow-400 flex items-center gap-1 transition-colors font-mono truncate"
                  >
                    {round.winner.txHash.slice(0, 20)}... <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
                <div className="border border-yellow-400/20 bg-yellow-400/5 p-3">
                  <div className="text-[9px] text-yellow-400/50 uppercase tracking-widest mb-1">POINTS AWARDED</div>
                  <div className="text-sm font-black text-yellow-400">+100 PTS → 50 $PROOF THIS SUNDAY</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MY SUBMISSION STATUS ────────────────────────────────────────────── */}
      <AnimatePresence>
        {hasSubmitted && mySubmission && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border p-4 ${TIER_BG[mySubmission.aiTier] || 'bg-[#FFB800]/5 border-[#FFB800]/20'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-green-400">SUBMITTED</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-black text-[#FFB800]">
                    {mySubmission.aiScore}
                    <span className="text-sm text-[#FFB800]/40">/100</span>
                  </div>
                  <div className={`text-[9px] uppercase font-black ${TIER_COLOR[mySubmission.aiTier] || 'text-[#FFB800]'}`}>
                    {mySubmission.aiTier}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-[#FFB800]/60 uppercase tracking-wide">{mySubmission.aiVerdict}</div>
            {mySubmission.rank && (
              <div className="mt-2 text-[9px] text-[#FFB800]/30 uppercase tracking-widest">
                CURRENT RANK: #{mySubmission.rank}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HUNT RESULT (setelah submit berhasil) ──────────────────────────── */}
      <AnimatePresence>
        {huntResult && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-[#FFB800] bg-[#050505] p-6 shadow-[0_0_40px_rgba(255,184,0,0.12)]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FFB800]" /> AI_FORENSIC_RESULT
              </span>
              <div className="text-right">
                <div className="text-4xl font-black text-[#FFB800] leading-none">
                  {huntResult.score}<span className="text-xl text-[#FFB800]/40">/100</span>
                </div>
                <div className={`text-[10px] font-black uppercase mt-1 ${TIER_COLOR[huntResult.tier] || 'text-[#FFB800]'}`}>
                  {huntResult.tier}
                </div>
              </div>
            </div>
            <div className="border border-[#FFB800]/20 bg-[#0a0a0a] p-3 mb-4">
              <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-1">VERDICT</div>
              <div className="text-xs text-[#FFB800] font-bold uppercase tracking-wide">{huntResult.verdict}</div>
            </div>
            <p className="text-[11px] text-[#FFB800]/70 leading-relaxed mb-4">{huntResult.summary}</p>
            {huntResult.signals.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {huntResult.signals.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-green-400 uppercase tracking-widest">
                    <span className="text-green-500 mt-px">▸</span> {s}
                  </div>
                ))}
              </div>
            )}
            {huntResult.riskFlags.length > 0 && (
              <div className="space-y-1">
                {huntResult.riskFlags.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-red-400 uppercase tracking-widest">
                    <AlertTriangle className="w-3 h-3" /> {r}
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-[#FFB800]/10 mt-4 pt-3 text-[9px] text-[#FFB800]/30 uppercase tracking-widest">
              RANK #{huntResult.position} — NETWORK: {huntResult.network}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SUBMIT FORM ─────────────────────────────────────────────────────── */}
      {!round?.judged && (
        <div className="border border-[#FFB800]/30 bg-[#080808] p-5">
          <div className="text-[9px] uppercase tracking-widest text-[#FFB800]/40 mb-4">
            {hasSubmitted
              ? '// YOUR_SUBMISSION_LOCKED — ONE TX PER ROUND'
              : '// SUBMIT_TX_HASH — ANY CHAIN, ANY TX YOU THINK IS MOST ALPHA'}
          </div>

          {!isConnected ? (
            <div className="border border-dashed border-[#FFB800]/15 p-5 text-center text-[10px] uppercase tracking-widest text-[#FFB800]/25">
              CONNECT_WALLET_TO_PARTICIPATE
            </div>
          ) : hasSubmitted ? (
            <div className="text-[10px] text-[#FFB800]/40 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              You have submitted your alpha for this round. Check back after midnight UTC.
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-[#050505] flex items-center px-4 border border-[#FFB800]/15 focus-within:border-[#FFB800]/40 transition-colors">
                  <span className="text-[#FFB800]/30 mr-3 text-sm select-none">$</span>
                  <input
                    type="text"
                    placeholder="0x..."
                    className="w-full bg-transparent border-none text-[#FFB800] py-3.5 focus:ring-0 placeholder:text-[#FFB800]/15 text-xs outline-none font-mono"
                    value={txInput}
                    onChange={e => setTxInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !submitting && handleSubmit()}
                    disabled={submitting}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {txInput && (
                    <button
                      onClick={() => setTxInput('')}
                      className="text-[#FFB800]/20 hover:text-[#FFB800]/50 ml-2 text-xs flex-shrink-0 w-5 h-5 flex items-center justify-center"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !txInput.trim()}
                  className="bg-[#FFB800] text-[#050505] px-6 py-3 font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all min-w-[150px] flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />ANALYZING...</>
                    : 'SUBMIT_HUNT'}
                </button>
              </div>

              <AnimatePresence>
                {submitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 flex items-center gap-2 text-[10px] text-red-400 uppercase tracking-widest"
                  >
                    <AlertTriangle className="w-3 h-3" /> {submitError}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      )}

      {/* ── LIVE LEADERBOARD ────────────────────────────────────────────────── */}
      <div className="border border-[#FFB800]/20 bg-[#050505]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#FFB800]/10">
          <span className="text-xs font-black uppercase tracking-widest text-[#FFB800] flex items-center gap-2">
            <Trophy className="w-4 h-4" /> LIVE LEADERBOARD
          </span>
          <span className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">
            {round?.totalSubmissions ?? 0} ENTRIES · UPDATES EVERY 30S
          </span>
        </div>

        {loading ? (
          <div className="px-5 py-8 flex items-center gap-2 text-[#FFB800]/30 text-xs animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" /> LOADING_ROUND_DATA...
          </div>
        ) : !round?.submissions.length ? (
          <div className="px-5 py-8 text-[10px] text-[#FFB800]/20 uppercase tracking-widest text-center">
            NO ENTRIES YET — BE THE FIRST TO SUBMIT ALPHA
          </div>
        ) : (
          <div className="divide-y divide-[#FFB800]/5">
            {round.submissions.map((entry, i) => {
              const isMe = address && entry.wallet.toLowerCase() === address.toLowerCase();
              return (
                <div
                  key={entry.txHash}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${isMe ? 'bg-[#FFB800]/5' : 'hover:bg-white/[0.01]'}`}
                >
                  <div className={`text-sm font-black w-8 flex-shrink-0 ${
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-[#FFB800]/20'
                  }`}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-mono ${isMe ? 'text-[#FFB800]' : 'text-[#FFB800]/60'}`}>
                        {truncateWallet(entry.wallet)}
                      </span>
                      {isMe && (
                        <span className="text-[8px] bg-[#FFB800]/20 text-[#FFB800] px-1.5 py-0.5 uppercase tracking-widest">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-[#FFB800]/20 font-mono">{entry.txHash.slice(0, 16)}...</span>
                      <span className="text-[8px] text-[#FFB800]/15 uppercase">{entry.network}</span>
                      <a
                        href={`https://etherscan.io/tx/${entry.txHash}`}
                        target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[#FFB800]/15 hover:text-[#FFB800]/40 transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                  <div className="hidden md:block flex-1 min-w-0 px-2">
                    <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-wide truncate">{entry.aiVerdict}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-lg font-black ${i === 0 ? 'text-yellow-400' : 'text-[#FFB800]'}`}>
                      {entry.aiScore}<span className="text-[10px] text-[#FFB800]/20">/100</span>
                    </div>
                    <div className={`text-[8px] font-black uppercase ${TIER_COLOR[entry.aiTier] || 'text-[#FFB800]/30'}`}>
                      {entry.aiTier}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── REWARD INFO ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'HUNT WIN',    value: '+100 PTS',  sub: 'per 24h round winner' },
          { label: 'CONVERSION', value: '100 PTS',   sub: '= 50 $PROOF' },
          { label: 'CLAIM DAY',  value: 'SUNDAY',    sub: 'UTC weekly settlement' },
        ].map(stat => (
          <div key={stat.label} className="border border-[#FFB800]/10 bg-[#080808] p-4 text-center">
            <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-1">{stat.label}</div>
            <div className="text-lg font-black text-[#FFB800]">{stat.value}</div>
            <div className="text-[9px] text-[#FFB800]/25 uppercase tracking-widest mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
