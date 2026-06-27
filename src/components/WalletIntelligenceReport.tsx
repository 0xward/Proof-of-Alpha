import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Loader2, Lock, Brain, ExternalLink } from 'lucide-react';
import { CONTRACT_ADDRESS, CONTRACT_ABI, getTier } from '../constants/contract';

interface WalletReport {
  summary: string;          // 3-4 sentence narrative
  activityProfile: string;  // e.g. "DeFi Power User"
  riskScore: number;        // 0-100
  topProtocols: string[];
  estimatedAge: string;     // e.g. "~3 years"
  oneliner: string;         // punchy 1-line label
}

// Fake score for SBT check — we just need balance
const REQUIRED_TIER = 'God Mode'; // score >= 76

export function WalletIntelligenceReport() {
  const { address, isConnected } = useAccount();
  const [targetWallet, setTargetWallet] = useState('');
  const [report, setReport] = useState<WalletReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if current user has a God Mode SBT (score >= 76)
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // For now: any SBT holder gets access (can tighten to tier-check later via API)
  const hasAccess = isConnected && balance !== undefined && balance > 0n;

  const analyze = async () => {
    if (!targetWallet.match(/^0x[0-9a-fA-F]{40}$/)) {
      setError('Enter a valid EVM wallet address (0x...)');
      return;
    }
    setError('');
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch('/api/wallet-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: targetWallet, requester: address }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setReport(data);
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="border border-[#FFB800]/15 bg-[#050505] p-6 font-mono text-center">
        <Lock className="w-5 h-5 text-[#FFB800]/20 mx-auto mb-2" />
        <div className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest">CONNECT WALLET TO ACCESS</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="border border-[#FFB800]/20 bg-[#050505] p-6 font-mono">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-[#FFB800]/30" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB800]/40">
            SBT REQUIRED
          </span>
        </div>
        <p className="text-[11px] text-[#FFB800]/30 leading-relaxed mb-4">
          Wallet Intelligence Report is exclusive to SBT holders. Analyze a transaction in the
          Forensic Terminal to mint your Soulbound Token and unlock this feature.
        </p>
        <div className="grid grid-cols-3 gap-3 opacity-40 pointer-events-none blur-[1px]">
          {['ACTIVITY PROFILE', 'TOP PROTOCOLS', 'RISK SCORE'].map(l => (
            <div key={l} className="border border-[#FFB800]/15 bg-[#080808] p-3 text-center">
              <div className="text-[8px] text-[#FFB800]/30 uppercase tracking-widest">{l}</div>
              <div className="text-lg font-black text-[#FFB800] mt-1">—</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#FFB800]/20 bg-[#050505] font-mono">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#FFB800]/10">
        <Brain className="w-3.5 h-3.5 text-[#FFB800]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB800]">
          WALLET INTELLIGENCE REPORT
        </span>
        <span className="ml-auto text-[8px] text-[#FFB800]/20 uppercase tracking-widest bg-[#FFB800]/5 border border-[#FFB800]/10 px-2 py-0.5">
          SBT EXCLUSIVE
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Input */}
        <div className="flex gap-2">
          <input
            value={targetWallet}
            onChange={e => setTargetWallet(e.target.value)}
            placeholder="0x... target wallet address"
            className="flex-1 bg-[#080808] border border-[#FFB800]/20 text-[#FFB800] placeholder:text-[#FFB800]/15 font-mono text-[11px] px-3 py-2.5 outline-none focus:border-[#FFB800]/50 transition-colors"
          />
          <button
            onClick={analyze}
            disabled={loading}
            className="bg-[#FFB800] text-[#050505] font-black uppercase tracking-widest text-[10px] px-5 py-2.5 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ANALYZE'}
          </button>
        </div>

        {error && (
          <div className="text-[10px] text-red-400/70 uppercase tracking-widest">[ERROR]: {error}</div>
        )}

        {loading && (
          <div className="space-y-2 py-4">
            {['FETCHING TRANSACTION HISTORY...', 'SCANNING PROTOCOL INTERACTIONS...', 'GENERATING INTELLIGENCE PROFILE...'].map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-[#FFB800]/40 uppercase tracking-widest">
                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                {msg}
              </div>
            ))}
          </div>
        )}

        {report && !loading && (
          <div className="space-y-4 border-t border-[#FFB800]/10 pt-4">
            {/* One-liner */}
            <div className="text-lg font-black text-[#FFB800] uppercase leading-tight">
              {report.oneliner}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-[#FFB800]/15 bg-[#080808] p-3 text-center">
                <div className="text-[8px] text-[#FFB800]/30 uppercase tracking-widest mb-1">PROFILE</div>
                <div className="text-[11px] font-black text-[#FFB800]">{report.activityProfile}</div>
              </div>
              <div className="border border-[#FFB800]/15 bg-[#080808] p-3 text-center">
                <div className="text-[8px] text-[#FFB800]/30 uppercase tracking-widest mb-1">RISK SCORE</div>
                <div className={`text-xl font-black ${report.riskScore >= 70 ? 'text-red-400' : report.riskScore >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {report.riskScore}
                </div>
              </div>
              <div className="border border-[#FFB800]/15 bg-[#080808] p-3 text-center">
                <div className="text-[8px] text-[#FFB800]/30 uppercase tracking-widest mb-1">EST. AGE</div>
                <div className="text-[11px] font-black text-[#FFB800]">{report.estimatedAge}</div>
              </div>
            </div>

            {/* Top protocols */}
            {report.topProtocols.length > 0 && (
              <div>
                <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-2">TOP PROTOCOLS</div>
                <div className="flex flex-wrap gap-2">
                  {report.topProtocols.map(p => (
                    <span key={p} className="text-[10px] font-black uppercase tracking-widest text-[#FFB800] border border-[#FFB800]/20 bg-[#FFB800]/5 px-2.5 py-1">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div>
              <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-2">INTELLIGENCE SUMMARY</div>
              <p className="text-[11px] text-[#FFB800]/60 leading-relaxed">{report.summary}</p>
            </div>

            {/* View on explorer */}
            <a
              href={`https://celoscan.io/address/${targetWallet}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[9px] text-[#FFB800]/30 hover:text-[#FFB800]/60 uppercase tracking-widest transition-colors w-fit"
            >
              VIEW ON CELOSCAN <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Server endpoint to add to server.ts ─────────────────────────────────────
//
// POST /api/wallet-intelligence
// body: { wallet: string, requester: string }
//
// 1. Verify requester has SBT: balanceOf(requester) > 0 via contract call
// 2. Rate limit: max 5 reports per requester per day (Firebase)
// 3. Fetch recent txs from Etherscan for `wallet` (last 50)
// 4. Call Groq with prompt asking for:
//    - activityProfile (1 label)
//    - riskScore (0-100)
//    - topProtocols (array of up to 5 names)
//    - estimatedAge (string)
//    - oneliner (punchy label)
//    - summary (3-4 sentences)
// 5. Return parsed JSON
