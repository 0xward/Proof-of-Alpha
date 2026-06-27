import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Loader2, ShieldCheck, AlertTriangle,
  ExternalLink, ChevronDown, X, Clock, Share2, Trash2,
} from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI, getTier, NFT_TIERS } from '../constants/contract';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import { WhaleTicker } from './WhaleTicker';
import { MyAlpha } from './MyAlpha';
import { useAnalysisHistory } from '../hooks/useAnalysisHistory';
import { isMiniPay } from '../lib/web3';
import { StreakBanner } from './StreakBanner';
import { ShareCardButton } from './ShareCardButton';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ForensicResult {
  score: number;
  tier: string;
  summary: string;
  signals: string[];
  riskFlags: string[];
  verdict: string;
  cached?: boolean;
}

export function ForensicTerminal() {
  const [txHash, setTxHash] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<ForensicResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMiniPayBanner, setShowMiniPayBanner] = useState(!isMiniPay);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending: isMinting } = useWriteContract();
  const { isLoading: isWaitingForTx, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({ hash });
  const { history, addRecord, clearHistory } = useAnalysisHistory();

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isAnalyzing]);

  useEffect(() => {
    if (isMintSuccess) setShowSuccessPopup(true);
  }, [isMintSuccess]);

  const handleAnalyze = async () => {
    if (!txHash.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    const ts = () => new Date().toLocaleTimeString();
    setLogs([
      `[${ts()}] INITIATING_DEEP_SCAN: ${txHash}`,
      `[${ts()}] CONNECTING_TO_NODES...`,
      `[${ts()}] EXTRACTING_INTERACTIONS...`,
    ]);

    try {
      const response = await fetch('/api/forensic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: txHash.trim() }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Analysis request failed.');
      }

      const data: ForensicResult = await response.json();

      setLogs((prev) => [
        ...prev,
        `[${ts()}] NEURAL_PROCESSOR_ENGAGED...`,
        `[${ts()}] ALPHA_VECTORS_CALCULATED.`,
      ]);

      setTimeout(() => {
        setLogs((prev) => [...prev, `[${ts()}] AUDIT_COMPLETE_SUCCESS.`]);
        setAnalysis(data);
        setIsAnalyzing(false);

        // Save to history
        addRecord({
          txHash: txHash.trim(),
          score: data.score,
          tierName: data.tier,
          network: 'CELO',
        });
      }, 1500);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Neural gateway timeout. Forensic engine offline.';
      setError(message);
      setIsAnalyzing(false);
    }
  };

  const handleMint = () => {
    if (!analysis || !isConnected || !address) return;
    const uri = getTier(analysis.score).json;
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'safeMint',
      args: [address as `0x${string}`, uri],
    } as Parameters<typeof writeContract>[0]);
  };

  const handleShare = () => {
    if (!analysis) return;
    const tier = getTier(analysis.score);
    const shareText =
      `Just anchored my Alpha Score on-chain! 🔥\n\n` +
      `Score: ${analysis.score}/100\n` +
      `Rank: ${tier.name}\n\n` +
      `Proof of Alpha on @Celo 🏆\n` +
      `#ProofOfAlpha #Celo #Web3`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const tier = analysis ? getTier(analysis.score) : null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-12 font-mono">

      {/* MiniPay recommendation banner — desktop only */}
      {showMiniPayBanner && (
        <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#FFB800]/20 px-4 py-3 text-[10px] uppercase tracking-widest">
          <span className="text-[#FFB800]/60">
            <span className="text-[#FFB800] mr-2">TIP:</span>
            FOR THE BEST EXPERIENCE, OPEN THIS APP IN MINIPAY.
          </span>
          <button
            onClick={() => setShowMiniPayBanner(false)}
            className="text-[#FFB800]/40 hover:text-[#FFB800] transition-colors ml-4"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* System Status */}
      <div className="border border-[#FFB800]/20 p-4 bg-[#050505]">
        <div className="text-[#FFB800]/40 text-[10px] mb-1 uppercase tracking-widest">System Status</div>
        <div className="flex items-center gap-4 text-xs font-bold flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            ENGINE: <span className="text-green-500 ml-1">ONLINE</span>
          </span>
          <span className="text-white/20">|</span>
          <span className="uppercase text-[#FFB800]">NETWORK: CELO_MAINNET</span>
          <span className="text-white/20">|</span>
          <span className="text-[#FFB800]">
            SBT_EMITTER: <span className="text-green-500">ACTIVE</span>
          </span>
          <span className="text-white/20">|</span>
          <span className="text-[#FFB800]/40">
            AI: <span className="text-[#FFB800]">GROQ_LLAMA_3.3_70B</span>
          </span>
        </div>
      </div>

      {/* My Proof Status */}
      <MyAlpha />

      {/* Daily Streak Bonus */}
      <StreakBanner />

      {/* System Manual */}
      <section className="bg-[#050505] border border-[#FFB800]/20 text-sm text-[#FFB800]/80">
        <button
          onClick={() => setIsManualOpen(!isManualOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-[#FFB800]/5 transition-colors focus:outline-none"
        >
          <span className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> SYSTEM_MANUAL.TXT
          </span>
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-300', isManualOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {isManualOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 pt-0 border-t border-[#FFB800]/10 text-xs text-[#FFB800]/60 leading-relaxed space-y-3">
                <p>
                  Welcome to the Proof of Alpha terminal. This tool analyzes a transaction hash from any
                  EVM-compatible blockchain (Ethereum, Base, Avalanche, Celo, Optimism, BNB Chain, etc.)
                  to evaluate its underlying alpha value and generate an on-chain credential.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li><strong className="text-[#FFB800]/80">Connect Wallet:</strong> Use the connect button in the header (desktop) or open in MiniPay for auto-connect.</li>
                  <li><strong className="text-[#FFB800]/80">Enter Transaction Hash:</strong> Paste any valid EVM transaction hash (0x...).</li>
                  <li><strong className="text-[#FFB800]/80">Run Analysis:</strong> Click RUN_ANALYSIS and wait for the Groq AI forensic engine to score your transaction.</li>
                  <li><strong className="text-[#FFB800]/80">Mint Your SBT:</strong> Once scored, anchor your proof as a Soulbound Token on Celo Mainnet.</li>
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Input Section */}
      <section className="bg-[#0f0f0f] border border-[#FFB800]/40 p-4 rounded-xl">
        <label className="text-[10px] uppercase tracking-widest text-[#FFB800]/40 mb-2 block">
          Transaction Analysis Input
        </label>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 bg-[#050505] flex items-center px-4 rounded-lg border border-[#FFB800]/10 focus-within:border-[#FFB800]/40 transition-colors">
            <span className="text-[#FFB800]/30 mr-3 text-sm">$</span>
            <input
              type="text"
              placeholder="ENTER EVM TX HASH (0x...)"
              className="w-full bg-transparent border-none text-[#FFB800] py-3 focus:ring-0 placeholder:text-[#FFB800]/20 text-sm outline-none"
              value={txHash}
              onChange={(e) => { setTxHash(e.target.value); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !txHash.trim()}
            className="bg-[#FFB800] text-[#050505] px-8 py-3 font-black text-sm hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase rounded-lg min-w-[160px]"
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> RUNNING...
              </span>
            ) : (
              'RUN_ANALYSIS'
            )}
          </button>
        </div>
      </section>

      {/* Analysis History */}
      {history.length > 0 && (
        <section className="border border-[#FFB800]/10 bg-[#050505]">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#FFB800]/5 transition-colors focus:outline-none"
          >
            <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 text-[#FFB800]/60">
              <Clock className="w-3 h-3" /> RECENT_ANALYSES ({history.length})
            </span>
            <ChevronDown className={cn('w-3 h-3 text-[#FFB800]/30 transition-transform', showHistory && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-[#FFB800]/10 p-4 space-y-1.5">
                  {history.map((record) => (
                    <div
                      key={record.txHash + record.timestamp}
                      className="flex items-center justify-between text-[10px] font-mono text-[#FFB800]/40 hover:text-[#FFB800]/60 cursor-pointer transition-colors py-1"
                      onClick={() => setTxHash(record.txHash)}
                    >
                      <span>
                        [{new Date(record.timestamp).toLocaleTimeString()}]{' '}
                        {record.txHash.slice(0, 10)}...{record.txHash.slice(-6)}
                      </span>
                      <span className="text-[#FFB800]/60 ml-4">
                        SCORE: {record.score} | {record.tierName.toUpperCase()}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1 text-[9px] text-red-500/40 hover:text-red-500/70 uppercase tracking-widest mt-2 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> CLEAR HISTORY
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Log Output */}
      {(isAnalyzing || logs.length > 0) && !analysis && (
        <div className="border border-[#FFB800]/20 bg-[#050505] p-4">
          <div
            ref={logContainerRef}
            className="space-y-1 text-[10px] font-mono text-[#FFB800]/60 max-h-40 overflow-y-auto"
          >
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-[#FFB800] mt-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>analyzing_neural_patterns...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Section */}
      <AnimatePresence>
        {analysis && tier && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            {/* Score + Mint */}
            <div className="w-full flex flex-col md:flex-row gap-6">
              {/* NFT Preview */}
              <div className="md:w-1/3 border border-[#FFB800]/20 bg-[#0a0a0a] flex items-center justify-center p-6 relative">
                <div className="absolute top-2 right-2 text-[9px] text-[#FFB800]/30 font-bold uppercase tracking-widest">
                  {tier.name}_RANK
                </div>
                <div className="w-32 h-32 border-2 border-[#FFB800] p-1 shadow-[0_0_15px_rgba(255,184,0,0.1)]">
                  <div className="w-full h-full bg-[#050505] overflow-hidden">
                    <img src={tier.png} alt="Alpha NFT" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Details + Mint Button */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="border border-[#FFB800]/10 bg-[#050505] p-4 text-[10px] space-y-2 flex-grow">
                  <div className="flex justify-between items-center bg-[#FFB800]/10 p-2 border border-[#FFB800]/20">
                    <span className="uppercase tracking-widest font-bold">Alpha_Score</span>
                    <span className="text-[#FFB800] font-black text-sm">{analysis.score}/100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-50 uppercase tracking-widest">Tier_Rank</span>
                    <span className="text-[#FFB800] font-bold uppercase">{analysis.tier}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-50 uppercase tracking-widest">Contract</span>
                    <a
                      href={`https://celoscan.io/address/${CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#FFB800] hover:underline flex items-center gap-1"
                    >
                      VIEW_SCAN <ExternalLink className="w-2 h-2" />
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-40 uppercase tracking-widest">Gas_Cost</span>
                    <span className="text-[#FFB800]">~&lt; $0.01 CELO</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-40 uppercase tracking-widest">Type</span>
                    <span className="text-[#FFB800]">Soulbound_Token_SBT</span>
                  </div>
                </div>

                {/* Verdict */}
                {analysis.verdict && (
                  <div className="border border-[#FFB800]/10 bg-[#0a0a0a] p-3 text-[10px] text-[#FFB800]/60 italic uppercase tracking-widest">
                    &gt;&gt; {analysis.verdict}
                  </div>
                )}

                {!isConnected ? (
                  <div className="p-4 border border-dashed border-[#FFB800]/20 text-center text-[10px] uppercase tracking-widest text-[#FFB800]/40">
                    {isMiniPay
                      ? 'CONNECTING_WALLET...'
                      : 'CONNECT_WALLET_VIA_HEADER_TO_MINT'}
                  </div>
                ) : (
                  <button
                    onClick={handleMint}
                    disabled={isMinting || isWaitingForTx || isMintSuccess}
                    className={cn(
                      'w-full py-4 font-black text-lg transition-all uppercase tracking-tight',
                      isMintSuccess
                        ? 'bg-green-500 text-black cursor-default shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                        : 'bg-[#FFB800] text-[#050505] hover:brightness-110 hover:shadow-[0_0_30px_rgba(255,184,0,0.3)] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed'
                    )}
                  >
                    {isMinting
                      ? 'CONFIRMING...'
                      : isWaitingForTx
                        ? 'MINTING_PROOF...'
                        : isMintSuccess
                          ? 'PROOF_ANCHORED ✓'
                          : 'MINT_PROOF_SBT'}
                  </button>
                )}
              </div>
            </div>

            {/* Forensic Report */}
            <div className="w-full border border-[#FFB800]/20 bg-[#050505] overflow-hidden">
              <div className="bg-[#1a1a1a] px-4 py-1.5 flex justify-between border-b border-[#FFB800]/20">
                <span className="text-[10px] uppercase font-bold tracking-tight">Forensic_Audit_Report.log</span>
                <span className="text-[10px] text-green-500 font-bold">v2.0.0-GROQ_POWERED</span>
              </div>
              <div className="p-5 space-y-4">
                {/* Summary */}
                <div>
                  <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-1">SUMMARY</div>
                  <p className="text-xs text-[#FFB800]/80 leading-relaxed font-mono">{analysis.summary}</p>
                </div>

                {/* Signals */}
                {analysis.signals?.length > 0 && (
                  <div>
                    <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-2">ALPHA SIGNALS DETECTED</div>
                    <div className="space-y-1">
                      {analysis.signals.map((signal, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-green-400 uppercase tracking-widest">
                          <span className="text-green-500">▸</span> {signal}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Flags */}
                {analysis.riskFlags?.length > 0 && (
                  <div>
                    <div className="text-[9px] text-red-500/50 uppercase tracking-widest mb-2">RISK FLAGS</div>
                    <div className="space-y-1">
                      {analysis.riskFlags.map((flag, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-red-400/70 uppercase tracking-widest">
                          <AlertTriangle className="w-3 h-3" /> {flag}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#FFB800]/10 text-[9px] text-white/10 uppercase tracking-widest flex justify-between">
                  <span>Neural consensus achieved</span>
                  <span>End of data stream</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SBT Tiers Preview */}
      <section className="bg-[#050505] border border-[#FFB800]/20 p-6 space-y-4">
        <h2 className="text-[#FFB800] font-bold text-sm uppercase tracking-tight mb-4 flex items-center gap-2">
          PROOF_OF_ALPHA_SBT — TIER_SYSTEM
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(NFT_TIERS).map(([key, t], index) => (
            <div key={key} className="border border-[#FFB800]/20 bg-[#0a0a0a] p-4 flex flex-col items-center group relative overflow-hidden">
              <div className="absolute top-2 right-2 text-[8px] font-bold uppercase tracking-widest text-green-500">
                TIER {index + 1}
              </div>
              <div className="w-24 h-24 border border-[#FFB800]/30 mb-3 overflow-hidden">
                <img
                  src={t.png}
                  alt={t.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
                />
              </div>
              <h3 className="font-black uppercase text-xs mb-1 tracking-wider text-[#FFB800]">{t.name}</h3>
              <p className="text-[10px] text-[#FFB800]/40 tracking-widest border-t border-[#FFB800]/10 pt-1 mt-1 w-full text-center">
                SCORE: {t.range[0]} – {t.range[1]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <WhaleTicker />

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-red-500/30 bg-red-500/5 p-4 text-red-400 text-xs flex items-center gap-2 uppercase tracking-tight"
        >
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          [ERROR]: {error}
        </motion.div>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessPopup && tier && analysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#050505] border-2 border-[#FFB800] p-6 flex flex-col items-center text-center shadow-[0_0_50px_rgba(255,184,0,0.2)]"
            >
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="absolute top-4 right-4 text-[#FFB800]/40 hover:text-[#FFB800] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-36 h-36 border-2 border-[#FFB800] p-1 mb-5 shadow-[0_0_20px_rgba(255,184,0,0.3)]">
                <img src={tier.png} alt="Minted Alpha NFT" className="w-full h-full object-cover" />
              </div>

              <h2 className="text-3xl font-black text-[#FFB800] uppercase mb-1">PROOF ANCHORED</h2>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">
                Soulbound Token Minted Successfully
              </h3>

              <div className="w-full bg-[#1a1a1a] p-4 border border-[#FFB800]/20 mb-5 space-y-3 font-mono text-sm">
                <div className="flex bg-[#FFB800]/10 border border-[#FFB800]/20 p-2 justify-between items-center">
                  <span className="text-[#FFB800]/50 uppercase tracking-widest text-[10px] font-bold">Alpha Score</span>
                  <span className="text-[#FFB800] font-black">{analysis.score}/100</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40">Tier Awarded</span>
                  <span className="text-white font-bold uppercase">{tier.name}</span>
                </div>
                {hash && (
                  <div className="pt-3 border-t border-[#FFB800]/20 text-[10px] space-y-1 text-left">
                    <div className="text-white/30 uppercase tracking-widest">Mint Transaction</div>
                    <a
                      href={`https://celoscan.io/tx/${hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#FFB800] hover:underline flex items-center gap-1 break-all"
                    >
                      {hash} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              <div className="w-full flex gap-3">
                <ShareCardButton
                  score={analysis.score}
                  tier={tier.name}
                  verdict={analysis.verdict ?? ''}
                  txHash={txHash}
                  wallet={address ?? ''}
                />
                <button
                  onClick={() => setShowSuccessPopup(false)}
                  className="flex-1 py-3 bg-[#FFB800] text-black font-black uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
