import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ExternalLink, AlertTriangle, Clock, Gift } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// ProofClaimManager ABI (minimal — only what frontend needs)
const CLAIM_MANAGER_ABI = [
  {
    inputs: [],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'wallet', type: 'address' }],
    name: 'getClaimable',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Deployed ProofClaimManager address (set via env at build time)
const CLAIM_CONTRACT = (import.meta.env.VITE_CLAIM_CONTRACT_ADDRESS || '') as `0x${string}`;

interface ClaimData {
  wallet: string;
  weekOf: string;
  currentClaim: { proofAmount: number; claimed: boolean; claimedAt?: any; txHash?: string; pointsUsed?: number } | null;
  claimHistory: { weekOf: string; proofAmount: number; claimed: boolean; claimedAt?: any; txHash?: string }[];
  pendingPoints: number;
  pendingProof: number;
  nextClaimDate: string;
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  } catch { return isoDate; }
}

export function ClaimPage() {
  const { address, isConnected } = useAccount();

  const [claimData, setClaimData]   = useState<ClaimData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [claimError, setClaimError] = useState('');
  const [claimDone, setClaimDone]   = useState(false);
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>();

  const { writeContract, data: pendingTxHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed, isLoading: isWaiting }  = useWaitForTransactionReceipt({ hash: pendingTxHash });

  // Fetch claim data
  const fetchClaim = async () => {
    if (!address) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/claim/${address}`);
      if (!r.ok) throw new Error('fetch failed');
      const d = await r.json();
      setClaimData(d);
    } catch (_) {
      setClaimData(null);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (address) fetchClaim();
    else setLoading(false);
  }, [address]);

  // Handle tx confirmed
  useEffect(() => {
    if (!txConfirmed || !pendingTxHash) return;
    setClaimTxHash(pendingTxHash);
    setClaimDone(true);
    // Mark claimed in Firebase
    if (address) {
      fetch('/api/claim/mark-claimed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, txHash: pendingTxHash }),
      }).then(() => fetchClaim()).catch(() => {});
    }
  }, [txConfirmed, pendingTxHash]);

  const handleClaim = () => {
    if (!CLAIM_CONTRACT || !address) return;
    setClaimError('');
    try {
      writeContract({
        address: CLAIM_CONTRACT,
        abi: CLAIM_MANAGER_ABI,
        functionName: 'claim',
      });
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : 'Claim failed.');
    }
  };

  const currentWeekClaim = claimData?.currentClaim;
  const canClaim         = currentWeekClaim && !currentWeekClaim.claimed && currentWeekClaim.proofAmount > 0;
  const alreadyClaimed   = currentWeekClaim?.claimed === true;
  const isBusy           = isPending || isWaiting;

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 font-mono text-center">
        <div className="text-[10px] text-[#FFB800]/25 uppercase tracking-widest">CONNECT_WALLET_TO_VIEW_CLAIMS</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-mono space-y-6">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="border border-[#FFB800]/20 bg-[#050505] p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,184,0,0.06),transparent_60%)]" />
        <div className="relative">
          <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-[0.3em] mb-1">// CLAIM_$PROOF</div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-[#FFB800] mb-2">CLAIM $PROOF</h1>
          <p className="text-[11px] text-[#FFB800]/50 uppercase tracking-widest leading-relaxed">
            Points settle every Sunday UTC. 100 pts = 50 $PROOF.
            Claim directly from the smart contract on Celo.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-[#FFB800]/30">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[10px] uppercase tracking-widest animate-pulse">LOADING CLAIM DATA...</span>
        </div>
      ) : (
        <>
          {/* ── PENDING POINTS TRACKER ────────────────────────────────────── */}
          <div className="border border-yellow-400/20 bg-yellow-400/5 p-5">
            <div className="text-[9px] text-yellow-400/50 uppercase tracking-widest mb-3">PENDING SETTLEMENT</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-black text-yellow-400">
                  {(claimData?.pendingPoints ?? 0).toLocaleString()}
                </div>
                <div className="text-[9px] text-yellow-400/40 uppercase tracking-widest mt-1">POINTS PENDING</div>
              </div>
              <div>
                <div className="text-3xl font-black text-yellow-400">
                  {(claimData?.pendingProof ?? 0).toFixed(2)}
                </div>
                <div className="text-[9px] text-yellow-400/40 uppercase tracking-widest mt-1">$PROOF THIS SUNDAY</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[9px] text-yellow-400/30 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              NEXT SETTLEMENT: {formatDate(claimData?.nextClaimDate ?? '')}
            </div>
          </div>

          {/* ── CURRENT WEEK CLAIM ─────────────────────────────────────────── */}
          <div className="border border-[#FFB800]/20 bg-[#050505] p-5 space-y-5">
            <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">
              THIS WEEK — {formatDate(claimData?.weekOf ?? '')}
            </div>

            {!currentWeekClaim ? (
              <div className="text-[10px] text-[#FFB800]/20 uppercase tracking-widest">
                NO CLAIMABLE $PROOF THIS WEEK YET. EARN POINTS IN THE HUNT OR VAULT.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest mb-1">CLAIMABLE AMOUNT</div>
                    <div className="text-4xl font-black text-[#FFB800]">
                      {currentWeekClaim.proofAmount.toFixed(2)}
                      <span className="text-xl text-[#FFB800]/40 ml-2">$PROOF</span>
                    </div>
                    {currentWeekClaim.pointsUsed && (
                      <div className="text-[9px] text-[#FFB800]/25 mt-1 uppercase tracking-widest">
                        FROM {currentWeekClaim.pointsUsed} POINTS
                      </div>
                    )}
                  </div>

                  {alreadyClaimed && (
                    <div className="border border-green-500/30 bg-green-500/5 px-4 py-2 text-center">
                      <div className="text-green-400 font-black text-[10px] uppercase tracking-widest">CLAIMED ✓</div>
                      {currentWeekClaim.txHash && (
                        <a
                          href={`https://celoscan.io/tx/${currentWeekClaim.txHash}`}
                          target="_blank" rel="noreferrer"
                          className="text-[8px] text-green-400/40 hover:text-green-400 flex items-center gap-1 mt-1 transition-colors"
                        >
                          TX <ExternalLink className="w-2 h-2" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* CLAIM NOW button */}
                {!alreadyClaimed && !claimDone && (
                  <>
                    {!CLAIM_CONTRACT ? (
                      <div className="text-[10px] text-red-400/70 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        VITE_CLAIM_CONTRACT_ADDRESS not configured — add to .env
                      </div>
                    ) : (
                      <button
                        onClick={handleClaim}
                        disabled={!canClaim || isBusy}
                        className="w-full py-5 bg-[#FFB800] text-[#050505] font-black text-sm uppercase tracking-widest hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                      >
                        {isBusy ? (
                          <><Loader2 className="w-5 h-5 animate-spin" />{isWaiting ? 'CONFIRMING ON CELO...' : 'WAITING FOR WALLET...'}</>
                        ) : (
                          <><Gift className="w-5 h-5" />CLAIM NOW — {currentWeekClaim.proofAmount.toFixed(2)} $PROOF</>
                        )}
                      </button>
                    )}

                    <AnimatePresence>
                      {claimError && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-[10px] text-red-400 uppercase tracking-widest"
                        >
                          <AlertTriangle className="w-3 h-3" /> {claimError}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

                {/* Success state */}
                <AnimatePresence>
                  {claimDone && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border border-green-500/30 bg-green-500/5 p-5 text-center space-y-2"
                    >
                      <div className="text-green-400 font-black text-sm uppercase tracking-widest">🎉 CLAIM SUCCESSFUL!</div>
                      <p className="text-[10px] text-green-400/60 uppercase tracking-widest">
                        ${currentWeekClaim.proofAmount.toFixed(2)} $PROOF transferred to your wallet.
                      </p>
                      {claimTxHash && (
                        <a
                          href={`https://celoscan.io/tx/${claimTxHash}`}
                          target="_blank" rel="noreferrer"
                          className="text-[10px] text-green-400/50 hover:text-green-400 flex items-center justify-center gap-1 transition-colors"
                        >
                          VIEW ON CELOSCAN <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* ── CLAIM HISTORY ─────────────────────────────────────────────── */}
          <div className="border border-[#FFB800]/15 bg-[#050505]">
            <div className="px-5 py-4 border-b border-[#FFB800]/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB800]">CLAIM HISTORY</span>
            </div>
            {!claimData?.claimHistory.length ? (
              <div className="px-5 py-6 text-[10px] text-[#FFB800]/15 uppercase tracking-widest">
                NO PREVIOUS CLAIMS
              </div>
            ) : (
              <div className="divide-y divide-[#FFB800]/5">
                {claimData.claimHistory.map((c, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.claimed ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-[#FFB800]/50 font-mono">Week of {formatDate(c.weekOf)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-[#FFB800]">{c.proofAmount.toFixed(2)} $PROOF</div>
                      <div className={`text-[9px] uppercase ${c.claimed ? 'text-green-400' : 'text-yellow-400'}`}>
                        {c.claimed ? 'CLAIMED' : 'UNCLAIMED'}
                      </div>
                    </div>
                    {c.txHash && (
                      <a
                        href={`https://celoscan.io/tx/${c.txHash}`}
                        target="_blank" rel="noreferrer"
                        className="text-[#FFB800]/15 hover:text-[#FFB800]/40 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── INFO BOX ──────────────────────────────────────────────────── */}
          <div className="border border-[#FFB800]/8 p-4 space-y-2">
            <div className="text-[9px] text-[#FFB800]/20 uppercase tracking-widest mb-2">HOW IT WORKS</div>
            {[
              'Earn points via Alpha Hunt wins (100 pts) or Alpha Vault deposits (1–5 pts/token/day)',
              'Every Sunday UTC, pending points are converted: 100 pts = 50 $PROOF',
              'Admin calls setClaimable() on ProofClaimManager contract with your amount',
              'Click CLAIM NOW to receive $PROOF directly from the contract to your wallet',
              '$PROOF token: 0xd2a88b9d9f14952b2e79b01b9e26c6a15efc7336 on Celo Mainnet',
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-[9px] text-[#FFB800]/20 uppercase tracking-widest">
                <span className="text-[#FFB800]/15 flex-shrink-0">▸</span> {s}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
