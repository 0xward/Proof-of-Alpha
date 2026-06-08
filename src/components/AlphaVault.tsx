import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ExternalLink, AlertTriangle, Zap, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';

// ─── Addresses ───────────────────────────────────────────────────────────────
const AAVE_POOL = '0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402' as const;

const VAULT_ASSET_LIST = [
  {
    symbol: 'CELO', address: '0x471EcE3750Da237f93B8E339c536989b8978a438' as `0x${string}`,
    decimals: 18, ptsPerDay: 2, color: 'text-yellow-400', bg: 'bg-yellow-400/10',
    minSupply: 1,
    // Token logo via CoinGecko CDN
    logo: 'https://assets.coingecko.com/coins/images/11090/small/InjXBNx9_400x400.jpg',
  },
  {
    symbol: 'USDC', address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as `0x${string}`,
    decimals: 6, ptsPerDay: 1, color: 'text-blue-400', bg: 'bg-blue-400/10',
    minSupply: 1,
    logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  },
  {
    symbol: 'USDT', address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as `0x${string}`,
    decimals: 6, ptsPerDay: 1, color: 'text-green-400', bg: 'bg-green-400/10',
    minSupply: 1,
    logo: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  {
    symbol: 'cUSD', address: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`,
    decimals: 18, ptsPerDay: 1, color: 'text-emerald-400', bg: 'bg-emerald-400/10',
    minSupply: 1,
    logo: 'https://assets.coingecko.com/coins/images/13161/small/icon-celo-dollar-color-1000.png',
  },
  {
    symbol: 'WETH', address: '0xD221812de1BD094f35587EE8E174B07B6167D9Af' as `0x${string}`,
    decimals: 18, ptsPerDay: 5, color: 'text-purple-400', bg: 'bg-purple-400/10',
    minSupply: 0.001,
    logo: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
] as const;

type AssetSymbol = typeof VAULT_ASSET_LIST[number]['symbol'];

const ERC20_ABI = [
  { inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

const AAVE_POOL_ABI = [
  { inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'onBehalfOf', type: 'address' }, { name: 'referralCode', type: 'uint16' }], name: 'supply', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'asset', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'to', type: 'address' }], name: 'withdraw', outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' },
] as const;

interface ApyAsset { symbol: string; apy: number; address: string; aTokenAddress?: string; }
interface VaultPosition {
  asset: string; symbol: string; decimals: number;
  amountWei: string; depositedAt: any; lastSnapshotAt: any;
  depositTxHash: string; pendingPts: number; ptsPerDay: number; amountHuman: string;
}
type TxStep = 'idle' | 'approving' | 'approved' | 'supplying' | 'withdrawing' | 'done' | 'error';

function daysSince(ts: any): number {
  if (!ts) return 0;
  const ms = ts._seconds ? ts._seconds * 1000 : typeof ts === 'number' ? ts : Date.now();
  return Math.max(0, (Date.now() - ms) / (1000 * 60 * 60 * 24));
}

// Token logo dengan fallback ke inisial
function TokenLogo({ symbol, logo, size = 28 }: { symbol: string; logo: string; size?: number }) {
  const [err, setErr] = useState(false);
  const asset = VAULT_ASSET_LIST.find(a => a.symbol === symbol);
  if (err || !logo) {
    return (
      <div
        className={`rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${asset?.bg || 'bg-[#FFB800]/10'} ${asset?.color || 'text-[#FFB800]'}`}
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={logo}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full flex-shrink-0 object-cover"
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  );
}

export function AlphaVault() {
  const { address, isConnected } = useAccount();

  const [apyData, setApyData]       = useState<ApyAsset[]>([]);
  const [apyLoading, setApyLoading] = useState(true);
  const [aTokenMap, setATokenMap]   = useState<Record<string, `0x${string}`>>({});

  const [selectedSymbol, setSelectedSymbol] = useState<AssetSymbol>('CELO');
  const [amount, setAmount]                 = useState('');
  const [mode, setMode]                     = useState<'supply' | 'withdraw'>('supply');
  const [txStep, setTxStep]                 = useState<TxStep>('idle');
  const [txError, setTxError]               = useState('');
  const [lastTxHash, setLastTxHash]         = useState<`0x${string}` | undefined>();
  const [showPositions, setShowPositions]   = useState(true);

  const [positions, setPositions]     = useState<VaultPosition[]>([]);
  const [posLoading, setPosLoading]   = useState(false);
  const [posFetched, setPosFetched]   = useState(false); // track if we ever fetched

  const selectedAsset = VAULT_ASSET_LIST.find(a => a.symbol === selectedSymbol)!;
  const amountNum     = parseFloat(amount) || 0;
  const amountWei     = amountNum > 0 ? parseUnits(amount || '0', selectedAsset.decimals) : 0n;
  const minSupply     = selectedAsset.minSupply;
  const belowMinimum  = mode === 'supply' && amountNum > 0 && amountNum < minSupply;

  const { writeContract, data: pendingTxHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed, isLoading: isWaiting }  = useWaitForTransactionReceipt({ hash: pendingTxHash });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedAsset.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, AAVE_POOL] : undefined,
    query: { enabled: !!address },
  });

  const hasEnoughAllowance = allowance !== undefined && amountWei > 0n && (allowance as bigint) >= amountWei;

  // ── Fetch APY ────────────────────────────────────────────────────────────
  useEffect(() => {
    setApyLoading(true);
    fetch('/api/vault/apy')
      .then(r => r.json())
      .then(data => {
        if (data.assets) {
          setApyData(data.assets);
          const map: Record<string, `0x${string}`> = {};
          for (const a of data.assets) {
            if (a.aTokenAddress && a.aTokenAddress !== '0x' + '0'.repeat(40)) {
              map[a.symbol] = a.aTokenAddress as `0x${string}`;
            }
          }
          setATokenMap(map);
        }
      })
      .catch(() => {})
      .finally(() => setApyLoading(false));
  }, []);

  // ── Fetch positions (hanya kalau connected) ───────────────────────────────
  const fetchPositions = useCallback(async () => {
    if (!address) { setPosFetched(true); return; }
    setPosLoading(true);
    try {
      const r = await fetch(`/api/profile/${address}`);
      if (!r.ok) throw new Error('profile fetch failed');
      const d = await r.json();
      setPositions(d.vault?.positions ?? []);
    } catch (_) {
      setPositions([]);
    } finally {
      setPosLoading(false);
      setPosFetched(true);
    }
  }, [address]);

  useEffect(() => {
    if (address) fetchPositions();
    else { setPositions([]); setPosFetched(true); }
  }, [fetchPositions, address]);

  // ── Handle tx confirmed ───────────────────────────────────────────────────
  useEffect(() => {
    if (!txConfirmed || !pendingTxHash) return;
    setLastTxHash(pendingTxHash);

    if (txStep === 'approving') {
      setTxStep('approved');
      refetchAllowance();
    } else if (txStep === 'supplying') {
      (async () => {
        try {
          await fetch('/api/vault/deposit-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: address,
              asset: selectedAsset.address,
              symbol: selectedAsset.symbol,
              amountWei: amountWei.toString(),
              decimals: selectedAsset.decimals,
              txHash: pendingTxHash,
            }),
          });
          fetchPositions();
        } catch (_) {}
      })();
      setTxStep('done');
    } else if (txStep === 'withdrawing') {
      (async () => {
        try {
          await fetch('/api/vault/withdraw-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: address,
              asset: selectedAsset.address,
              txHash: pendingTxHash,
            }),
          });
          fetchPositions();
        } catch (_) {}
      })();
      setTxStep('done');
    }
  }, [txConfirmed]);

  const handleApprove = useCallback(() => {
    if (!address || amountWei === 0n) return;
    setTxStep('approving'); setTxError('');
    writeContract({ address: selectedAsset.address, abi: ERC20_ABI, functionName: 'approve', args: [AAVE_POOL, amountWei] });
  }, [address, amountWei, selectedAsset, writeContract]);

  const handleSupply = useCallback(() => {
    if (!address || amountWei === 0n) return;
    setTxStep('supplying'); setTxError('');
    writeContract({ address: AAVE_POOL, abi: AAVE_POOL_ABI, functionName: 'supply', args: [selectedAsset.address, amountWei, address, 0] });
  }, [address, amountWei, selectedAsset, writeContract]);

  const handleWithdraw = useCallback(() => {
    if (!address || amountWei === 0n) return;
    setTxStep('withdrawing'); setTxError('');
    writeContract({ address: AAVE_POOL, abi: AAVE_POOL_ABI, functionName: 'withdraw', args: [selectedAsset.address, amountWei, address] });
  }, [address, amountWei, selectedAsset, writeContract]);

  const reset = () => { setTxStep('idle'); setTxError(''); setAmount(''); };

  const currentApy   = apyData.find(a => a.symbol === selectedSymbol)?.apy ?? 0;
  const periodYield  = amountNum * currentApy / 100;
  const ptsPerDay    = amountNum * selectedAsset.ptsPerDay;
  const totalPtsPerDay = positions.reduce((sum, p) => sum + (p.ptsPerDay ?? 0), 0);
  const isBusy = isPending || isWaiting || ['approving','supplying','withdrawing'].includes(txStep);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-mono space-y-6">

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="border border-[#FFB800]/20 bg-[#050505] p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,184,0,0.05),transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-[0.3em] mb-1">// ALPHA_VAULT_V2</div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-[#FFB800] mb-2">ALPHA VAULT</h1>
            <p className="text-[11px] text-[#FFB800]/50 uppercase tracking-widest leading-relaxed">
              Supply to Aave V3 on Celo. Earn real DeFi yield +{' '}
              <span className="text-[#FFB800]">$PROOF points</span> daily.
            </p>
          </div>
          {/* Aave logo */}
          <a href="https://app.aave.com/markets/?marketName=proto_celo_v3" target="_blank" rel="noreferrer"
             className="flex-shrink-0 flex flex-col items-center gap-1 group">
            <img
              src="https://assets.coingecko.com/coins/images/12645/small/AAVE.png"
              alt="Aave"
              width={40} height={40}
              className="rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest group-hover:text-[#FFB800]/50 transition-colors">
              AAVE V3
            </span>
          </a>
        </div>
      </div>

      {/* ── LIVE APY CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2">
        {VAULT_ASSET_LIST.map(asset => {
          const apy = apyData.find(a => a.symbol === asset.symbol)?.apy ?? 0;
          return (
            <div
              key={asset.symbol}
              className={`border p-3 text-center transition-all cursor-pointer ${
                selectedSymbol === asset.symbol
                  ? `border-[#FFB800]/50 ${asset.bg}`
                  : 'border-[#FFB800]/10 bg-[#080808] hover:border-[#FFB800]/25'
              }`}
              onClick={() => { setSelectedSymbol(asset.symbol as AssetSymbol); reset(); }}
            >
              {/* Token logo */}
              <div className="flex justify-center mb-2">
                <TokenLogo symbol={asset.symbol} logo={asset.logo} size={32} />
              </div>
              <div className={`text-[10px] font-black ${asset.color}`}>{asset.symbol}</div>
              {apyLoading ? (
                <div className="text-[8px] text-[#FFB800]/20 animate-pulse mt-1">...</div>
              ) : (
                <div className={`text-[11px] font-black mt-0.5 ${apy > 0 ? 'text-green-400' : 'text-[#FFB800]/20'}`}>
                  {apy > 0 ? `${apy.toFixed(2)}%` : 'N/A'}
                </div>
              )}
              <div className="text-[8px] text-[#FFB800]/25 mt-0.5">{asset.ptsPerDay}pts/d</div>
            </div>
          );
        })}
      </div>

      {/* ── APY BAR (detail strip) ───────────────────────────────────────── */}
      <div className="border border-[#FFB800]/10 bg-[#080808] px-4 py-2.5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          <img
            src="https://assets.coingecko.com/coins/images/12645/small/AAVE.png"
            alt="Aave" width={16} height={16}
            className="rounded-full opacity-60"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">AAVE V3 CELO</span>
        </div>
        {apyLoading ? (
          <span className="text-[9px] text-[#FFB800]/20 animate-pulse">FETCHING LIVE RATES...</span>
        ) : (
          VAULT_ASSET_LIST.map(asset => {
            const apy = apyData.find(a => a.symbol === asset.symbol)?.apy ?? 0;
            return (
              <div key={asset.symbol} className="flex items-center gap-1.5">
                <TokenLogo symbol={asset.symbol} logo={asset.logo} size={14} />
                <span className={`text-[9px] font-black ${asset.color}`}>{asset.symbol}</span>
                <span className={`text-[9px] font-black ${apy > 0 ? 'text-green-400' : 'text-[#FFB800]/20'}`}>
                  {apy > 0 ? `${apy.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
            );
          })
        )}
        <a
          href="https://app.aave.com/markets/?marketName=proto_celo_v3"
          target="_blank" rel="noreferrer"
          className="ml-auto text-[9px] text-[#FFB800]/20 hover:text-[#FFB800]/50 flex items-center gap-1 transition-colors flex-shrink-0"
        >
          VIEW ON AAVE <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* ── MY POSITIONS ─────────────────────────────────────────────────── */}
      {isConnected && (
        <div className="border border-[#FFB800]/20 bg-[#050505]">
          <button
            onClick={() => setShowPositions(!showPositions)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#FFB800]/3 transition-colors"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB800] flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              MY POSITIONS
              {posFetched && positions.length > 0 && (
                <span className="bg-[#FFB800]/20 text-[#FFB800] text-[8px] px-1.5 py-0.5">{positions.length}</span>
              )}
            </span>
            <div className="flex items-center gap-4">
              {totalPtsPerDay > 0 && (
                <span className="text-[9px] text-green-400 uppercase tracking-widest">
                  +{totalPtsPerDay.toFixed(2)} PTS/DAY
                </span>
              )}
              {showPositions
                ? <ChevronUp className="w-3.5 h-3.5 text-[#FFB800]/30" />
                : <ChevronDown className="w-3.5 h-3.5 text-[#FFB800]/30" />}
            </div>
          </button>

          <AnimatePresence>
            {showPositions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-[#FFB800]/10">
                  {/* Kalau masih loading DAN belum pernah fetch → tampil shimmer */}
                  {posLoading && !posFetched ? (
                    <div className="px-5 py-5 flex items-center gap-2 text-[#FFB800]/30 text-[10px] animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" /> LOADING POSITIONS...
                    </div>
                  ) : !posFetched || positions.length === 0 ? (
                    <div className="px-5 py-5 text-[10px] text-[#FFB800]/20 uppercase tracking-widest">
                      NO ACTIVE POSITIONS — SUPPLY AN ASSET BELOW
                    </div>
                  ) : (
                    <div className="divide-y divide-[#FFB800]/5">
                      {positions.map((pos, i) => {
                        const assetMeta = VAULT_ASSET_LIST.find(a => a.address.toLowerCase() === pos.asset.toLowerCase());
                        const days      = daysSince(pos.depositedAt);
                        const livePts   = (pos.pendingPts ?? 0) + (pos.ptsPerDay ?? 0) * daysSince(pos.lastSnapshotAt);
                        return (
                          <div key={i} className="px-5 py-4 flex items-center gap-4">
                            <TokenLogo
                              symbol={pos.symbol}
                              logo={assetMeta?.logo ?? ''}
                              size={36}
                            />
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <div className={`text-sm font-black ${assetMeta?.color || 'text-[#FFB800]'}`}>{pos.symbol}</div>
                                <div className="text-[9px] text-[#FFB800]/40">{parseFloat(pos.amountHuman || '0').toFixed(4)}</div>
                              </div>
                              <div>
                                <div className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest">DEPOSITED</div>
                                <div className="text-[10px] text-[#FFB800]/60">{days.toFixed(1)}d ago</div>
                              </div>
                              <div>
                                <div className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest">ACCRUED PTS</div>
                                <div className="text-[10px] text-green-400 font-black">+{Math.floor(livePts)}</div>
                              </div>
                              <div>
                                <div className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest">RATE</div>
                                <div className="text-[10px] text-[#FFB800]/60">{(pos.ptsPerDay ?? 0).toFixed(2)}/day</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── MODE TOGGLE ──────────────────────────────────────────────────── */}
      <div className="flex border border-[#FFB800]/20">
        {(['supply','withdraw'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); reset(); }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              mode === m ? 'bg-[#FFB800] text-[#050505]' : 'text-[#FFB800]/40 hover:text-[#FFB800]/70'
            }`}
          >
            {m === 'supply' ? '▲ SUPPLY' : '▼ WITHDRAW'}
          </button>
        ))}
      </div>

      {/* ── SELECTED ASSET INFO ──────────────────────────────────────────── */}
      <div className={`border ${selectedAsset.bg.replace('/10','/5')} border-[#FFB800]/20 px-4 py-3 flex items-center gap-3`}>
        <TokenLogo symbol={selectedAsset.symbol} logo={selectedAsset.logo} size={40} />
        <div className="flex-1">
          <div className={`text-sm font-black ${selectedAsset.color}`}>{selectedAsset.symbol}</div>
          <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">{selectedAsset.ptsPerDay} pts / token / day</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-black ${currentApy > 0 ? 'text-green-400' : 'text-[#FFB800]/20'}`}>
            {apyLoading ? '...' : currentApy > 0 ? `${currentApy.toFixed(2)}% APY` : 'N/A'}
          </div>
          <div className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest">AAVE V3 CELO</div>
        </div>
      </div>

      {/* ── AMOUNT INPUT ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] uppercase tracking-widest text-[#FFB800]/30">AMOUNT ({selectedSymbol})</div>
          {mode === 'supply' && (
            <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">
              MIN: {minSupply} {selectedSymbol}
            </div>
          )}
        </div>
        <div className={`bg-[#050505] flex items-center px-4 border transition-colors ${belowMinimum ? 'border-red-500/50' : 'border-[#FFB800]/20 focus-within:border-[#FFB800]/40'}`}>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            className="w-full bg-transparent border-none text-[#FFB800] py-4 text-xl font-black focus:ring-0 outline-none placeholder:text-[#FFB800]/10"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <span className="text-[#FFB800]/30 font-black text-xs ml-2 flex-shrink-0">{selectedSymbol}</span>
        </div>
        {belowMinimum && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400 uppercase tracking-widest">
            <AlertTriangle className="w-3 h-3" />
            Minimum supply is {minSupply} {selectedSymbol} (Aave V3 requirement)
          </div>
        )}
      </div>

      {/* ── PROJECTION ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {amountNum > 0 && mode === 'supply' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-[#FFB800]/15 bg-[#0a0a0a] p-5"
          >
            <div className="text-[9px] uppercase tracking-widest text-[#FFB800]/30 mb-3">PROJECTED EARNINGS</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest mb-1">AAVE APY/YR</div>
                <div className={`text-sm font-black ${currentApy > 0 ? 'text-green-400' : 'text-[#FFB800]/20'}`}>
                  {currentApy > 0 ? `≈${periodYield.toFixed(4)} ${selectedSymbol}` : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest mb-1">PTS / DAY</div>
                <div className="text-sm font-black text-[#FFB800]">+{ptsPerDay.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest mb-1">$PROOF/WEEK</div>
                <div className="text-sm font-black text-yellow-400">≈{((ptsPerDay * 7) / 100 * 50).toFixed(2)}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TX AREA ──────────────────────────────────────────────────────── */}
      {!isConnected ? (
        <div className="border border-dashed border-[#FFB800]/15 p-8 text-center text-[10px] uppercase tracking-widest text-[#FFB800]/20">
          CONNECT_WALLET_TO_USE_VAULT
        </div>
      ) : txStep === 'done' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-green-500/30 bg-green-500/5 p-6 text-center space-y-3">
          <div className="text-green-400 font-black text-sm uppercase tracking-widest">TRANSACTION CONFIRMED ✓</div>
          <p className="text-[10px] text-green-400/60 uppercase tracking-widest">
            {mode === 'supply'
              ? 'Position recorded. Points accruing daily — claimable as $PROOF every Sunday.'
              : 'Withdrawal complete. Vault points calculated and added to your balance.'}
          </p>
          {lastTxHash && (
            <a href={`https://celoscan.io/tx/${lastTxHash}`} target="_blank" rel="noreferrer"
               className="text-[10px] text-green-400/50 hover:text-green-400 flex items-center justify-center gap-1 transition-colors">
              VIEW ON CELOSCAN <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button onClick={reset} className="text-[10px] text-[#FFB800]/30 hover:text-[#FFB800] uppercase tracking-widest transition-colors">
            NEW TRANSACTION
          </button>
        </motion.div>
      ) : txStep === 'error' ? (
        <div className="border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-red-400 text-[10px] uppercase tracking-widest mb-2">
            <AlertTriangle className="w-3 h-3" /> TRANSACTION FAILED
          </div>
          <p className="text-[10px] text-red-400/70 mb-3">{txError}</p>
          <button onClick={reset} className="text-[10px] text-[#FFB800]/30 hover:text-[#FFB800] uppercase tracking-widest">TRY AGAIN</button>
        </div>
      ) : mode === 'supply' ? (
        <div className="space-y-3">
          {/* Step indicator */}
          <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest mb-1">
            <span className={`flex items-center gap-1 ${['approved','supplying','done'].includes(txStep) ? 'text-green-400' : txStep==='approving' ? 'text-[#FFB800]' : 'text-[#FFB800]/30'}`}>
              {['approved','supplying','done'].includes(txStep) ? '✓' : '①'} APPROVE
            </span>
            <span className="text-[#FFB800]/15">→</span>
            <span className={`flex items-center gap-1 ${txStep==='done' ? 'text-green-400' : txStep==='supplying' ? 'text-[#FFB800]' : 'text-[#FFB800]/30'}`}>
              {txStep==='done' ? '✓' : '②'} SUPPLY
            </span>
          </div>

          <button
            onClick={handleApprove}
            disabled={!amountNum || isBusy || hasEnoughAllowance || txStep==='approved' || belowMinimum}
            className={`w-full py-4 border font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              hasEnoughAllowance||txStep==='approved'
                ? 'border-green-500/30 text-green-400/60 cursor-default'
                : 'border-[#FFB800]/40 text-[#FFB800] hover:bg-[#FFB800]/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {txStep==='approving'&&(isPending||isWaiting)
              ? <><Loader2 className="w-4 h-4 animate-spin" />{isWaiting?'CONFIRMING...':'WAITING WALLET...'}</>
              : hasEnoughAllowance||txStep==='approved'
                ? '✓ APPROVED'
                : `STEP 1 — APPROVE ${selectedSymbol}`}
          </button>

          <button
            onClick={handleSupply}
            disabled={!amountNum || isBusy || (!hasEnoughAllowance && txStep!=='approved') || belowMinimum}
            className="w-full py-4 bg-[#FFB800] text-[#050505] font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {txStep==='supplying'&&(isPending||isWaiting)
              ? <><Loader2 className="w-4 h-4 animate-spin" />{isWaiting?'CONFIRMING ON CELO...':'WAITING WALLET...'}</>
              : `STEP 2 — SUPPLY ${amount||'0'} ${selectedSymbol} TO AAVE`}
          </button>
        </div>
      ) : (
        <button
          onClick={handleWithdraw}
          disabled={!amountNum || isBusy}
          className="w-full py-4 bg-[#FFB800] text-[#050505] font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isBusy
            ? <><Loader2 className="w-4 h-4 animate-spin" />{isWaiting?'CONFIRMING...':'WAITING WALLET...'}</>
            : `WITHDRAW ${amount||'0'} ${selectedSymbol} FROM AAVE`}
        </button>
      )}

      {/* ── SECURITY ─────────────────────────────────────────────────────── */}
      <div className="border border-[#FFB800]/8 p-4 flex gap-3">
        <Shield className="w-4 h-4 text-[#FFB800]/15 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-[#FFB800]/15 leading-relaxed">
          Funds deposited directly into Aave V3 on Celo Mainnet. Proof of Alpha does not custody assets.
          Pool: <span className="font-mono">{AAVE_POOL.slice(0,14)}...</span>
        </p>
      </div>

    </div>
  );
}
