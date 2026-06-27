import { useState, useEffect, useCallback } from 'react';

// ─── Aave V3 Celo Pool Data Provider ─────────────────────────────────────────
// Uses Aave's official subgraph for Celo (Goldsky-hosted)
const AAVE_CELO_SUBGRAPH = 'https://api.goldsky.com/api/public/project_clk74pd7lueg738tw9t3i1p9a/subgraphs/aave-v3-celo/1.0.0/gn';

const AAVE_QUERY = `{
  reserves(where: { isActive: true, isFrozen: false }, first: 10, orderBy: totalLiquidity, orderDirection: desc) {
    id
    symbol
    name
    decimals
    liquidityRate
    variableBorrowRate
    totalLiquidity
    availableLiquidity
    utilizationRate
    price { priceInEth }
    totalCurrentVariableDebt
    underlyingAsset
  }
}`;

// Fallback static data if subgraph is unavailable
const FALLBACK_ASSETS = [
  { symbol: 'USDC', name: 'USD Coin',       supplyAPY: 4.82, borrowAPY: 7.21, tvlUSD: 3_420_000, utilization: 78, logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/0xcebA9300f2b948710d2653dD7B07f33A8B32118C/logo.png' },
  { symbol: 'CELO', name: 'Celo',           supplyAPY: 2.14, borrowAPY: 4.87, tvlUSD: 2_190_000, utilization: 52, logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/0x471EcE3750Da237f93B8E339c536989b8978a438/logo.png' },
  { symbol: 'USDT', name: 'Tether USD',     supplyAPY: 5.11, borrowAPY: 8.03, tvlUSD: 1_870_000, utilization: 81, logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e/logo.png' },
  { symbol: 'WETH', name: 'Wrapped Ether',  supplyAPY: 1.93, borrowAPY: 3.44, tvlUSD: 980_000,  utilization: 45, logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png' },
  // cUSD rebranded to USDm (Mento Dollar) — same contract 0x765DE816...
  { symbol: 'cUSD', name: 'Mento Dollar', supplyAPY: 3.77, borrowAPY: 6.22, tvlUSD: 750_000, utilization: 69, logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/0x765DE816845861e75A25fCA122bb6898B8B1282a/logo.png' },
];

// Display name overrides — symbol stays as-is internally, only display differs
const DISPLAY_NAME: Record<string, string> = {
  cUSD: 'USDm',
};
const DISPLAY_FULLNAME: Record<string, string> = {
  cUSD: 'Mento Dollar',
};
const TOKEN_LOGOS: Record<string, string> = {
  USDC:  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/0xcebA9300f2b948710d2653dD7B07f33A8B32118C/logo.png',
  USDT:  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e/logo.png',
  CELO:  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/0x471EcE3750Da237f93B8E339c536989b8978a438/logo.png',
  WETH:  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
  WBTC:  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
  // cUSD = USDm (Mento Dollar) — rebranded, same contract
  cUSD:  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/0x765DE816845861e75A25fCA122bb6898B8B1282a/logo.png',
  USDm:  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/0x765DE816845861e75A25fCA122bb6898B8B1282a/logo.png',
  cEUR:  'https://assets.coingecko.com/coins/images/16490/small/cEUR.png',
  DAI:   'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
  WMATIC:'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270/logo.png',
};

interface AaveAsset {
  symbol: string;
  name: string;
  supplyAPY: number;
  borrowAPY: number;
  tvlUSD: number;
  utilization: number;
  logo: string;
}

// Ray = 1e27 in Aave
const rayToPercent = (ray: string): number => {
  const val = parseFloat(ray) / 1e25; // convert to percentage (1e27 / 1e2)
  return Math.round(val * 100) / 100;
};

const formatTVL = (usd: number): string => {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000)     return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
};

const formatTotalTVL = (usd: number): string => {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  if (usd >= 1_000_000)     return `$${(usd / 1_000_000).toFixed(2)}M`;
  return `$${(usd / 1_000).toFixed(1)}K`;
};

// Approximate USD price map for Celo ecosystem tokens (rough fallback)
const APPROX_PRICE: Record<string, number> = {
  USDC: 1, USDT: 1, DAI: 1, cUSD: 1, cEUR: 1.09,
  CELO: 0.58, WETH: 3400, WBTC: 65000, WMATIC: 0.72,
};

export function AaveLiveMarket() {
  const [assets, setAssets]     = useState<AaveAsset[]>([]);
  const [totalTVL, setTotalTVL] = useState<number>(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tick, setTick]         = useState(0); // pulse animation trigger

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(AAVE_CELO_SUBGRAPH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: AAVE_QUERY }),
      });

      if (!res.ok) throw new Error('Subgraph fetch failed');
      const json = await res.json();

      if (!json.data?.reserves?.length) throw new Error('No data');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reserves: any[] = json.data.reserves;

      const parsed: AaveAsset[] = reserves
        .filter((r) => parseFloat(r.liquidityRate) > 0 || parseFloat(r.totalLiquidity) > 0)
        .slice(0, 6)
        .map((r) => {
          const sym = r.symbol.replace(/^[Aa]/, '') || r.symbol; // strip 'a' prefix if present
          const cleanSym = r.symbol;
          const decimals = parseInt(r.decimals, 10) || 18;
          const price = APPROX_PRICE[cleanSym] ?? APPROX_PRICE[sym] ?? 1;
          const rawLiq = parseFloat(r.totalLiquidity) / Math.pow(10, decimals);
          const tvlUSD = rawLiq * price;

          return {
            symbol:     cleanSym,
            name:       r.name || cleanSym,
            supplyAPY:  rayToPercent(r.liquidityRate),
            borrowAPY:  rayToPercent(r.variableBorrowRate),
            tvlUSD,
            utilization: Math.round(parseFloat(r.utilizationRate) * 100),
            logo: TOKEN_LOGOS[cleanSym] ?? TOKEN_LOGOS[sym] ?? `https://assets.coingecko.com/coins/images/1/small/bitcoin.png`,
          };
        });

      const total = parsed.reduce((s, a) => s + a.tvlUSD, 0);
      setAssets(parsed);
      setTotalTVL(total);
      setLastUpdate(new Date());
      setError(false);
    } catch {
      // Use fallback
      setAssets(FALLBACK_ASSETS);
      setTotalTVL(FALLBACK_ASSETS.reduce((s, a) => s + a.tvlUSD, 0));
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
      setTick((t) => t + 1);
    }, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Pulse tick for animated numbers
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const topAPY = assets.length ? Math.max(...assets.map((a) => a.supplyAPY)) : 0;
  const topAsset = assets.find((a) => a.supplyAPY === topAPY);

  return (
    <section className="py-16 px-4 border-t border-[#FFB800]/20 bg-[#020202] relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#FFB800 1px, transparent 1px), linear-gradient(90deg, #FFB800 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Aave glow orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #B6509E 0%, transparent 70%)' }} />

      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {/* Aave logo */}
              <img
                src="https://assets.coingecko.com/coins/images/12645/small/AAVE.png"
                alt="Aave"
                className="w-7 h-7 rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-[10px] uppercase tracking-widest text-[#B6509E] font-mono font-bold">
                AAVE V3 // CELO MAINNET
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] text-green-400 font-mono uppercase tracking-widest">LIVE</span>
              </span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-[#FFB800]">
              REAL-TIME MARKET DATA
            </h2>
            <p className="text-[10px] text-[#FFB800]/40 font-mono uppercase tracking-widest mt-1">
              {error
                ? 'CACHED DATA // SUBGRAPH UNAVAILABLE'
                : lastUpdate
                  ? `LAST SYNC: ${lastUpdate.toLocaleTimeString()} // AUTO-REFRESH: 30s`
                  : 'FETCHING LIVE DATA...'}
            </p>
          </div>

          {/* Total TVL Hero */}
          <div className="border border-[#B6509E]/40 bg-[#B6509E]/5 px-6 py-4 text-right relative overflow-hidden">
            <div className="absolute inset-0 opacity-5"
              style={{ background: 'linear-gradient(135deg, #B6509E, transparent)' }} />
            <div className="text-[9px] text-[#B6509E]/70 uppercase tracking-widest font-mono mb-1">
              TOTAL TVL // AAVE CELO
            </div>
            {loading ? (
              <div className="text-2xl font-black text-[#B6509E] tracking-tight animate-pulse">——</div>
            ) : (
              <div
                key={tick}
                className="text-2xl font-black tracking-tight"
                style={{ color: '#B6509E', textShadow: '0 0 20px rgba(182,80,158,0.5)' }}
              >
                {formatTotalTVL(totalTVL)}
              </div>
            )}
            {topAsset && (
              <div className="text-[9px] text-[#FFB800]/50 font-mono mt-1">
                BEST APY: {DISPLAY_NAME[topAsset.symbol] ?? topAsset.symbol} @ <span className="text-green-400 font-bold">{topAPY.toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Asset Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-[#FFB800]/10 bg-[#0a0a0a] p-4 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFB800]/10" />
                  <div className="h-3 w-16 bg-[#FFB800]/10 rounded" />
                </div>
                <div className="h-4 w-12 bg-[#FFB800]/10 rounded mb-2" />
                <div className="h-3 w-20 bg-[#FFB800]/5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {assets.map((asset, i) => {
              const isTopAPY = asset.supplyAPY === topAPY;
              return (
                <div
                  key={asset.symbol}
                  className={`border bg-[#0a0a0a] p-4 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] ${
                    isTopAPY
                      ? 'border-green-500/40 hover:border-green-500/70'
                      : 'border-[#FFB800]/15 hover:border-[#FFB800]/40'
                  }`}
                >
                  {isTopAPY && (
                    <div className="absolute top-2 right-2 text-[8px] text-green-400 font-black uppercase tracking-widest border border-green-500/30 px-1.5 py-0.5">
                      TOP APY
                    </div>
                  )}

                  {/* Subtle hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at top left, rgba(255,184,0,0.04), transparent 60%)' }} />

                  {/* Token header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[#FFB800]/20 flex-shrink-0 bg-[#111]">
                      <img
                        src={asset.logo}
                        alt={asset.symbol}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          t.style.display = 'none';
                          (t.parentElement as HTMLElement).innerHTML =
                            `<span class="text-[10px] text-[#FFB800] font-black flex items-center justify-center h-full">${asset.symbol.slice(0,2)}</span>`;
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#FFB800] tracking-wider">{DISPLAY_NAME[asset.symbol] ?? asset.symbol}</div>
                      <div className="text-[8px] text-[#FFB800]/30 uppercase tracking-widest truncate max-w-[80px]">{DISPLAY_FULLNAME[asset.symbol] ?? asset.name}</div>
                    </div>
                  </div>

                  {/* APY */}
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <div className="text-[8px] text-[#FFB800]/30 uppercase tracking-widest font-mono">SUPPLY APY</div>
                      <div
                        key={`apy-${asset.symbol}-${tick}`}
                        className="text-lg font-black leading-none"
                        style={{ color: isTopAPY ? '#4ade80' : '#FFB800', textShadow: isTopAPY ? '0 0 10px rgba(74,222,128,0.4)' : 'none' }}
                      >
                        {asset.supplyAPY.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] text-[#FFB800]/30 uppercase tracking-widest font-mono">BORROW</div>
                      <div className="text-sm font-black text-[#FFB800]/60">{asset.borrowAPY.toFixed(2)}%</div>
                    </div>
                  </div>

                  {/* TVL */}
                  <div className="border-t border-[#FFB800]/10 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest font-mono">TVL</div>
                        <div className="text-[11px] font-bold text-[#FFB800]/70">{formatTVL(asset.tvlUSD)}</div>
                      </div>
                      {/* Utilization bar */}
                      <div className="w-16">
                        <div className="text-[7px] text-[#FFB800]/25 uppercase tracking-widest font-mono text-right mb-0.5">
                          UTIL {asset.utilization}%
                        </div>
                        <div className="h-1 bg-[#FFB800]/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${Math.min(asset.utilization, 100)}%`,
                              background: asset.utilization > 80 ? '#f87171' : asset.utilization > 60 ? '#fb923c' : '#4ade80',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Entry index */}
                  <div className="absolute bottom-2 right-2 text-[30px] font-black text-[#FFB800]/[0.03] leading-none pointer-events-none select-none">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer bar */}
        <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 text-[9px] text-[#FFB800]/25 font-mono uppercase tracking-widest">
            <span>DATA: AAVE V3 SUBGRAPH</span>
            <span>NETWORK: CELO MAINNET</span>
            <span className={error ? 'text-orange-500/50' : 'text-green-500/50'}>
              {error ? '⚠ CACHED' : '● LIVE'}
            </span>
          </div>
          <a
            href="https://app.aave.com/?marketName=proto_celo_v3"
            target="_blank"
            rel="noreferrer"
            className="text-[9px] font-black uppercase tracking-widest text-[#B6509E]/60 hover:text-[#B6509E] border border-[#B6509E]/20 hover:border-[#B6509E]/50 px-3 py-1.5 transition-all"
          >
            OPEN AAVE APP ↗
          </a>
        </div>
      </div>
    </section>
  );
}
