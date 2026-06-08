import express from 'express';
import path from 'path';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { ethers } from 'ethers';

dotenv.config();

// ─── Firebase Admin init ─────────────────────────────────────────────────────
if (!getApps().length) {
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}
const db = getFirestore();

const app = express();
app.use(express.json());

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured.');
  return new Groq({ apiKey });
}

const VAULT_ASSETS: Record<string, { address: string; decimals: number; ptsPerTokenPerDay: number }> = {
  CELO: { address: '0x471EcE3750Da237f93B8E339c536989b8978a438', decimals: 18, ptsPerTokenPerDay: 2 },
  USDC: { address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', decimals: 6,  ptsPerTokenPerDay: 1 },
  USDT: { address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e', decimals: 6,  ptsPerTokenPerDay: 1 },
  cUSD: { address: '0x765DE816845861e75A25fCA122bb6898B8B1282a', decimals: 18, ptsPerTokenPerDay: 1 },
  WETH: { address: '0xD221812de1BD094f35587EE8E174B07B6167D9Af', decimals: 18, ptsPerTokenPerDay: 5 },
};

const CLAIM_MANAGER_ABI = [
  'function setClaimable(address[] calldata wallets, uint256[] calldata amounts) external',
];
const celoProvider = new ethers.JsonRpcProvider('https://forno.celo.org');

function getAdminSigner(): ethers.Wallet {
  const pk = process.env.ADMIN_PRIVATE_KEY;
  if (!pk) throw new Error('ADMIN_PRIVATE_KEY not configured');
  return new ethers.Wallet(pk, celoProvider);
}
function getClaimContract(): ethers.Contract {
  const addr = process.env.CLAIM_CONTRACT_ADDRESS;
  if (!addr) throw new Error('CLAIM_CONTRACT_ADDRESS not configured');
  return new ethers.Contract(addr, CLAIM_MANAGER_ABI, getAdminSigner());
}

async function fetchWithTimeout(url: string, options: RequestInit, ms = 5000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); }
  finally { clearTimeout(timer); }
}

async function rpcCall(url: string, method: string, params: unknown[]) {
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const data = await res.json();
  return data?.result ?? null;
}

const RPC_LIST = [
  { name: 'Ethereum', url: 'https://eth.llamarpc.com' },
  { name: 'Ethereum', url: 'https://rpc.ankr.com/eth' },
  { name: 'Ethereum', url: 'https://cloudflare-eth.com' },
  { name: 'Ethereum', url: 'https://ethereum-rpc.publicnode.com' },
  { name: 'Celo',     url: 'https://forno.celo.org' },
  { name: 'Base',     url: 'https://mainnet.base.org' },
  { name: 'Base',     url: 'https://base.llamarpc.com' },
  { name: 'Arbitrum', url: 'https://arb1.arbitrum.io/rpc' },
  { name: 'Optimism', url: 'https://mainnet.optimism.io' },
  { name: 'Polygon',  url: 'https://polygon-rpc.com' },
  { name: 'BSC',      url: 'https://bsc-dataseed1.binance.org' },
  { name: 'Avalanche',url: 'https://api.avax.network/ext/bc/C/rpc' },
];

async function fetchTxFromRpcs(txHash: string) {
  // Race all RPCs in parallel — return first winner, ignore failures
  const results = await Promise.allSettled(
    RPC_LIST.map(async (rpc) => {
      const tx = await rpcCall(rpc.url, 'eth_getTransactionByHash', [txHash]);
      if (tx && tx.hash) return { network: rpc.name, tx, rpcUrl: rpc.url };
      throw new Error('not found');
    })
  );
  const winner = results.find(
    (r): r is PromiseFulfilledResult<{ network: string; tx: any; rpcUrl: string }> =>
      r.status === 'fulfilled'
  );
  return winner ? winner.value : null;
}

async function fetchTxFromEtherscan(txHash: string) {
  const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
  try {
    const res = await fetchWithTimeout(
      `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`,
      { method: 'GET' }
    );
    const data = await res.json();
    if (data?.result?.hash) return { network: 'Ethereum', tx: data.result, rpcUrl: 'https://cloudflare-eth.com' };
  } catch (_) {}
  return null;
}

async function fetchReceipt(rpcUrl: string, txHash: string) {
  try { return await rpcCall(rpcUrl, 'eth_getTransactionReceipt', [txHash]); }
  catch (_) { return null; }
}

function extractJson(text: string): Record<string, unknown> {
  try { return JSON.parse(text); } catch (_) {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch (_) {} }
  return {};
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentWeekOf(): string {
  const now = new Date();
  const day  = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return mon.toISOString().slice(0, 10);
}

function nextSunday(): string {
  const now  = new Date();
  const day  = now.getUTCDay();
  const days = day === 0 ? 7 : 7 - day;
  const sun  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
  return sun.toISOString().slice(0, 10);
}

// ─── HEALTH ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── HUNT TARGET (keep existing) ─────────────────────────────────────────────
const HUNT_TARGETS = [
  { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'vitalik.eth', bio: 'Ethereum co-founder. One of the most studied wallets in crypto history.' },
  { address: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', label: 'Binance Cold Wallet', bio: 'One of the largest exchange cold wallets. Monitors billions in flow.' },
  { address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', label: 'Binance Hot Wallet 7', bio: 'High-frequency exchange operations wallet.' },
  { address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE', label: 'Binance Hot Wallet 1', bio: 'Major exchange operations. High nonce, ultra-active.' },
  { address: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3', label: 'Binance Hot Wallet 8', bio: 'Constant high-value activity across DeFi protocols.' },
  { address: '0x00000000219ab540356cBB839Cbe05303d7705Fa', label: 'ETH2 Deposit Contract', bio: 'The Ethereum staking deposit contract.' },
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', label: 'WETH Contract', bio: 'Wrapped Ether — the backbone of DeFi liquidity.' },
  { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', label: 'Uniswap V2 Router', bio: 'The original Uniswap swap router.' },
  { address: '0x1111111254EEB25477B68fb85Ed929f73A960582', label: '1inch Router V5', bio: 'DEX aggregator routing billions in optimal swaps.' },
  { address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', label: 'Vitalik Personal 2', bio: 'Secondary wallet of Ethereum co-founder.' },
  { address: '0x05067E3b4fBF5F2a4CFA18E13B2cd8e55eBE59e3', label: 'Jump Crypto', bio: 'Major crypto market maker and DeFi power user.' },
  { address: '0x8EB8a3b98659Cce290402893d0123abb75E3ab28', label: 'Justin Sun', bio: 'Tron founder, prolific DeFi whale and NFT collector.' },
];

function getDailyTarget() {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return HUNT_TARGETS[dayIndex % HUNT_TARGETS.length];
}

let cachedTarget: { target: typeof HUNT_TARGETS[0]; date: string; txSamples: string[] } | null = null;

async function fetchRecentTxsFromWallet(address: string): Promise<string[]> {
  if (process.env.ETHERSCAN_API_KEY && process.env.ETHERSCAN_API_KEY !== 'YourApiKeyToken') {
    try {
      const res = await fetchWithTimeout(
        `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=5&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY}`,
        { method: 'GET' }
      );
      const data = await res.json();
      if (data.status === '1' && Array.isArray(data.result)) {
        return data.result.slice(0, 5).map((tx: { hash: string }) => tx.hash);
      }
    } catch (_) {}
  }
  return [];
}

app.get('/api/hunt/target', async (_req, res) => {
  const today = todayUTC();
  if (cachedTarget && cachedTarget.date === today) {
    return res.json({ target: cachedTarget.target, txSamples: cachedTarget.txSamples, date: today });
  }
  const target   = getDailyTarget();
  const txSamples = await fetchRecentTxsFromWallet(target.address);
  cachedTarget   = { target, date: today, txSamples };
  return res.json({ target, txSamples, date: today });
});

// ─── OLD SUBMIT (keep for backward compat) ───────────────────────────────────
app.post('/api/hunt/submit', async (req, res) => {
  const { txHash, walletAddress } = req.body;
  if (!txHash) return res.status(400).json({ error: 'txHash required' });
  const today = todayUTC();
  if (!cachedTarget || cachedTarget.date !== today) {
    cachedTarget = { target: getDailyTarget(), date: today, txSamples: [] };
  }
  const hash = txHash.toLowerCase().trim();
  try {
    let found = await fetchTxFromRpcs(hash);
    if (!found) found = await fetchTxFromEtherscan(hash);
    if (!found) return res.status(400).json({ error: 'Transaction not found on any network.' });
    return res.json({ valid: true, fromAddress: found.tx.from, network: found.network, message: 'TX found on-chain.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Validation error.';
    return res.status(500).json({ error: message });
  }
});

// ─── POST /api/hunt/submit-v2 ─────────────────────────────────────────────────
app.post('/api/hunt/submit-v2', async (req, res) => {
  const { txHash, walletAddress } = req.body as { txHash?: string; walletAddress?: string };
  if (!txHash || !walletAddress) return res.status(400).json({ error: 'txHash and walletAddress required.' });

  const wallet = walletAddress.toLowerCase();
  const hash   = txHash.toLowerCase().trim();
  const today  = todayUTC();

  const roundRef  = db.collection('rounds').doc(today);
  const roundSnap = await roundRef.get();
  const roundData = roundSnap.data();

  if (roundData?.judged) return res.status(409).json({ error: 'ROUND_ENDED', message: 'This round has already been judged.' });

  const existing = (roundData?.submissions as any[] | undefined)?.find((s: any) => s.wallet === wallet);
  if (existing) return res.status(409).json({ error: 'ALREADY_SUBMITTED', message: 'You have already submitted for this round.', submission: existing });

  const txAlreadySubmitted = (roundData?.submissions as any[] | undefined)?.find((s: any) => s.txHash === hash);
  if (txAlreadySubmitted) return res.status(409).json({ error: 'TX_DUPLICATE', message: 'This transaction hash was already submitted.' });

  let found = await fetchTxFromRpcs(hash);
  if (!found) found = await fetchTxFromEtherscan(hash);
  if (!found) return res.status(400).json({ error: 'Transaction not found on any supported network.' });

  const { tx, rpcUrl, network } = found;
  const receipt      = await fetchReceipt(rpcUrl, hash);
  const valueEth     = tx.value    ? (parseInt(tx.value,    16) / 1e18).toFixed(6) : '0';
  const gasLimit     = tx.gas      ? parseInt(tx.gas,       16) : 0;
  const gasPriceGwei = tx.gasPrice ? (parseInt(tx.gasPrice, 16) / 1e9).toFixed(2) : '?';
  const gasUsed      = receipt?.gasUsed    ? parseInt(receipt.gasUsed, 16) : null;
  const blockNum     = tx.blockNumber ? parseInt(tx.blockNumber, 16) : null;
  const status       = receipt?.status === '0x1' ? 'SUCCESS' : receipt?.status === '0x0' ? 'REVERTED' : 'PENDING/UNKNOWN';
  const logs         = receipt?.logs ?? [];
  const inputSnip    = (tx.input || '0x').slice(0, 400);
  const logAddrs     = [...new Set(logs.map((l: any) => l.address))].slice(0, 5);
  const topics0      = logs.slice(0, 5).map((l: any) => l.topics?.[0]).filter(Boolean);

  const txContext = `NETWORK: ${network}\nTX: ${hash}\nFROM: ${tx.from}\nTO: ${tx.to ?? '(deploy)'}\nVALUE: ${valueEth}\nGAS LIMIT: ${gasLimit}\nGAS USED: ${gasUsed ?? 'unknown'}\nGAS PRICE: ${gasPriceGwei} Gwei\nBLOCK: ${blockNum}\nSTATUS: ${status}\nINPUT: ${inputSnip}\nLOGS: ${logs.length}\nLOG ADDRS: ${JSON.stringify(logAddrs)}\nSIGS: ${JSON.stringify(topics0)}\nNONCE: ${tx.nonce ? parseInt(tx.nonce, 16) : 'unknown'}`;

  let aiScore = 35, aiTier = 'Initiate', aiSummary = 'Analysis complete.', aiSignals: string[] = [], aiVerdict = 'TRANSACTION ANALYZED.', aiRiskFlags: string[] = [];
  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are ALPHA-9, elite blockchain forensic AI. Analyze the tx and return ONLY JSON:\n{"score":<1-100>,"tier":"God Mode"|"Elite Scout"|"Initiate","summary":"<2-3 sentences UPPERCASE>","signals":["s1","s2","s3"],"riskFlags":[],"verdict":"<ONE uppercase sentence>"}' },
        { role: 'user',   content: `Analyze:\n${txContext}` },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    const raw    = completion.choices[0]?.message?.content ?? '{}';
    const parsed = extractJson(raw);
    aiScore     = Math.min(100, Math.max(1, parseInt(String(parsed.score)) || 35));
    aiTier      = typeof parsed.tier === 'string' && ['God Mode','Elite Scout','Initiate'].includes(parsed.tier) ? parsed.tier : aiScore >= 76 ? 'God Mode' : aiScore >= 41 ? 'Elite Scout' : 'Initiate';
    aiSummary   = typeof parsed.summary === 'string' ? parsed.summary : aiSummary;
    aiSignals   = Array.isArray(parsed.signals)   ? parsed.signals   : [];
    aiVerdict   = typeof parsed.verdict === 'string' ? parsed.verdict : aiVerdict;
    aiRiskFlags = Array.isArray(parsed.riskFlags) ? parsed.riskFlags : [];
  } catch (e) { console.error('Groq submit-v2:', e); }

  const submission = { wallet, txHash: hash, aiScore, aiVerdict, aiSummary, aiTier, aiSignals, aiRiskFlags, network, timestamp: Timestamp.now() };

  await roundRef.set({ submissions: FieldValue.arrayUnion(submission), totalSubmissions: FieldValue.increment(1), judged: roundData?.judged ?? false }, { merge: true });

  const userRef  = db.collection('users').doc(wallet);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    await userRef.set({ displayName: `${wallet.slice(0,6)}...${wallet.slice(-4)}`, createdAt: Timestamp.now(), totalHuntsWon: 0, totalVaultDays: 0 });
  }

  const freshSnap = await roundRef.get();
  const allSubs   = ((freshSnap.data()?.submissions ?? []) as any[]).sort((a: any, b: any) => b.aiScore - a.aiScore);
  const position  = allSubs.findIndex((s: any) => s.wallet === wallet && s.txHash === hash) + 1;

  return res.json({ score: aiScore, tier: aiTier, verdict: aiVerdict, summary: aiSummary, signals: aiSignals, riskFlags: aiRiskFlags, position, network });
});

// ─── GET /api/hunt/round ──────────────────────────────────────────────────────
app.get('/api/hunt/round', async (_req, res) => {
  const today   = todayUTC();
  const now     = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const timeRemaining = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const roundSnap = await db.collection('rounds').doc(today).get();
  if (!roundSnap.exists) return res.json({ date: today, submissions: [], timeRemaining, judged: false, winner: null, totalSubmissions: 0 });
  const data = roundSnap.data()!;
  const submissions = ((data.submissions ?? []) as any[]).sort((a: any, b: any) => b.aiScore - a.aiScore).map((s: any, i: number) => ({ rank: i + 1, wallet: s.wallet, txHash: s.txHash, aiScore: s.aiScore, aiVerdict: s.aiVerdict, aiTier: s.aiTier, network: s.network, timestamp: s.timestamp?._seconds ?? null }));
  return res.json({ date: today, submissions, timeRemaining, judged: data.judged ?? false, winner: data.winner ?? null, totalSubmissions: data.totalSubmissions ?? 0 });
});

// ─── POST /api/hunt/judge ─────────────────────────────────────────────────────
app.post('/api/hunt/judge', async (req, res) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_CRON_KEY) return res.status(403).json({ error: 'Forbidden' });
  const today     = todayUTC();
  const roundRef  = db.collection('rounds').doc(today);
  const roundSnap = await roundRef.get();
  if (!roundSnap.exists) return res.status(404).json({ error: 'No round found for today.' });
  const data = roundSnap.data()!;
  if (data.judged) return res.status(409).json({ error: 'Round already judged.', winner: data.winner });
  const submissions = (data.submissions ?? []) as any[];
  if (!submissions.length) return res.status(400).json({ error: 'No submissions to judge.' });
  const winner = submissions.reduce((best: any, s: any) => (!best || s.aiScore > best.aiScore ? s : best), null);
  const winnerData = { wallet: winner.wallet, txHash: winner.txHash, score: winner.aiScore, decidedAt: Timestamp.now() };
  await roundRef.update({ judged: true, winner: winnerData });
  const HUNT_PTS = 100;
  const pointsRef  = db.collection('points').doc(winner.wallet);
  const pointsSnap = await pointsRef.get();
  const historyEntry = { date: today, source: 'hunt', points: HUNT_PTS, txHash: winner.txHash };
  if (pointsSnap.exists) {
    await pointsRef.update({ totalPoints: FieldValue.increment(HUNT_PTS), pendingPoints: FieldValue.increment(HUNT_PTS), history: FieldValue.arrayUnion(historyEntry) });
  } else {
    await pointsRef.set({ totalPoints: HUNT_PTS, pendingPoints: HUNT_PTS, claimedPoints: 0, weeklySnapshot: { weekOf: currentWeekOf(), points: HUNT_PTS }, history: [historyEntry] });
  }
  await db.collection('users').doc(winner.wallet).set({ totalHuntsWon: FieldValue.increment(1) }, { merge: true });
  return res.json({ success: true, winner: winnerData, pointsAwarded: HUNT_PTS });
});

// ─── POST /api/vault/deposit-record ──────────────────────────────────────────
app.post('/api/vault/deposit-record', async (req, res) => {
  const { walletAddress, asset, symbol, amountWei, decimals, txHash } = req.body;
  if (!walletAddress || !asset || !symbol || !amountWei || decimals === undefined || !txHash) return res.status(400).json({ error: 'Missing required fields.' });
  const wallet = walletAddress.toLowerCase();
  const now    = Timestamp.now();
  const position = { asset, symbol, decimals, amountWei, depositedAt: now, lastSnapshotAt: now, depositTxHash: txHash };
  const vaultRef = db.collection('vault').doc(wallet);
  await vaultRef.set({ positions: FieldValue.arrayUnion(position), totalPointsEarned: FieldValue.increment(0) }, { merge: true });
  const userSnap = await db.collection('users').doc(wallet).get();
  if (!userSnap.exists) await db.collection('users').doc(wallet).set({ displayName: `${wallet.slice(0,6)}...${wallet.slice(-4)}`, createdAt: now, totalHuntsWon: 0, totalVaultDays: 0 });
  return res.json({ success: true, position });
});

// ─── POST /api/vault/withdraw-record ─────────────────────────────────────────
app.post('/api/vault/withdraw-record', async (req, res) => {
  const { walletAddress, asset, txHash } = req.body;
  if (!walletAddress || !asset || !txHash) return res.status(400).json({ error: 'walletAddress, asset, txHash required.' });
  const wallet    = walletAddress.toLowerCase();
  const vaultRef  = db.collection('vault').doc(wallet);
  const vaultSnap = await vaultRef.get();
  if (!vaultSnap.exists) return res.status(404).json({ error: 'No vault record found.' });
  const positions: any[] = vaultSnap.data()?.positions ?? [];
  const posIdx = positions.findIndex((p: any) => p.asset.toLowerCase() === asset.toLowerCase());
  if (posIdx === -1) return res.status(404).json({ error: 'Position not found.' });
  const pos         = positions[posIdx];
  const assetConfig = Object.values(VAULT_ASSETS).find(a => a.address.toLowerCase() === asset.toLowerCase());
  if (!assetConfig) return res.status(400).json({ error: 'Unsupported asset.' });
  const now          = Date.now();
  const lastSnapshot = pos.lastSnapshotAt?._seconds ? pos.lastSnapshotAt._seconds * 1000 : now;
  const daysSince    = Math.max(0, (now - lastSnapshot) / (1000 * 60 * 60 * 24));
  const amountHuman  = parseFloat(pos.amountWei) / Math.pow(10, pos.decimals);
  const ptsEarned    = Math.floor(daysSince * amountHuman * assetConfig.ptsPerTokenPerDay);
  const depositedAt  = pos.depositedAt?._seconds ? pos.depositedAt._seconds * 1000 : now;
  const totalDays    = Math.floor((now - depositedAt) / (1000 * 60 * 60 * 24));
  await vaultRef.update({ positions: positions.filter((_: any, i: number) => i !== posIdx), totalPointsEarned: FieldValue.increment(ptsEarned) });
  await db.collection('users').doc(wallet).set({ totalVaultDays: FieldValue.increment(Math.max(1, totalDays)) }, { merge: true });
  if (ptsEarned > 0) {
    const historyEntry = { date: todayUTC(), source: 'vault', points: ptsEarned, txHash, asset, amount: amountHuman.toFixed(4) };
    const pointsRef    = db.collection('points').doc(wallet);
    const pointsSnap   = await pointsRef.get();
    if (pointsSnap.exists) {
      await pointsRef.update({ totalPoints: FieldValue.increment(ptsEarned), pendingPoints: FieldValue.increment(ptsEarned), history: FieldValue.arrayUnion(historyEntry) });
    } else {
      await pointsRef.set({ totalPoints: ptsEarned, pendingPoints: ptsEarned, claimedPoints: 0, weeklySnapshot: { weekOf: currentWeekOf(), points: ptsEarned }, history: [historyEntry] });
    }
  }
  return res.json({ success: true, ptsEarned, daysHeld: totalDays });
});

// ─── POST /api/vault/snapshot ─────────────────────────────────────────────────
app.post('/api/vault/snapshot', async (req, res) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_CRON_KEY) return res.status(403).json({ error: 'Forbidden' });
  const vaultDocs = await db.collection('vault').get();
  const today = todayUTC(); const now = Date.now();
  let walletCount = 0, totalPts = 0;
  for (const doc of vaultDocs.docs) {
    const wallet    = doc.id;
    const positions: any[] = doc.data()?.positions ?? [];
    if (!positions.length) continue;
    let ptsForWallet = 0;
    const updatedPositions = positions.map((pos: any) => {
      const cfg = Object.values(VAULT_ASSETS).find(a => a.address.toLowerCase() === pos.asset.toLowerCase());
      if (!cfg) return pos;
      const last       = pos.lastSnapshotAt?._seconds ? pos.lastSnapshotAt._seconds * 1000 : now;
      const days       = Math.max(0, (now - last) / (1000 * 60 * 60 * 24));
      const amount     = parseFloat(pos.amountWei) / Math.pow(10, pos.decimals);
      const pts        = Math.floor(days * amount * cfg.ptsPerTokenPerDay);
      ptsForWallet    += pts;
      return { ...pos, lastSnapshotAt: Timestamp.now() };
    });
    await doc.ref.update({ positions: updatedPositions, totalPointsEarned: FieldValue.increment(ptsForWallet) });
    if (ptsForWallet > 0) {
      const histEntry  = { date: today, source: 'vault', points: ptsForWallet };
      const pointsRef  = db.collection('points').doc(wallet);
      const pointsSnap = await pointsRef.get();
      if (pointsSnap.exists) {
        await pointsRef.update({ totalPoints: FieldValue.increment(ptsForWallet), pendingPoints: FieldValue.increment(ptsForWallet), history: FieldValue.arrayUnion(histEntry) });
      } else {
        await pointsRef.set({ totalPoints: ptsForWallet, pendingPoints: ptsForWallet, claimedPoints: 0, weeklySnapshot: { weekOf: currentWeekOf(), points: ptsForWallet }, history: [histEntry] });
      }
      walletCount++; totalPts += ptsForWallet;
    }
  }
  return res.json({ success: true, walletsProcessed: walletCount, totalPointsDistributed: totalPts, date: today });
});

// ─── POST /api/weekly/settle ──────────────────────────────────────────────────
app.post('/api/weekly/settle', async (req, res) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_CRON_KEY) return res.status(403).json({ error: 'Forbidden' });
  const weekOf    = currentWeekOf();
  const allPoints = await db.collection('points').get();
  const wallets: string[] = [], amounts: bigint[] = [];
  const settled: { wallet: string; proofAmount: number; pointsUsed: number }[] = [];
  for (const doc of allPoints.docs) {
    const pending = doc.data()?.pendingPoints ?? 0;
    if (pending < 1) continue;
    const proof  = (pending / 100) * 50;
    const proofWei = BigInt(Math.floor(proof * 1e18));
    wallets.push(doc.id); amounts.push(proofWei);
    settled.push({ wallet: doc.id, proofAmount: proof, pointsUsed: pending });
  }
  if (!wallets.length) return res.json({ success: true, message: 'No pending points.', weekOf });
  try {
    const contract = getClaimContract();
    const tx = await contract.setClaimable(wallets, amounts);
    await tx.wait();
    const batch = db.batch();
    for (const { wallet, proofAmount, pointsUsed } of settled) {
      batch.update(db.collection('points').doc(wallet), { claimedPoints: FieldValue.increment(pointsUsed), pendingPoints: FieldValue.increment(-pointsUsed), weeklySnapshot: { weekOf, points: 0 } });
      batch.set(db.collection('claims').doc(weekOf).collection(wallet).doc('claim'), { proofAmount, claimed: false, claimedAt: null, txHash: null, pointsUsed, settledAt: Timestamp.now() });
    }
    await batch.commit();
    return res.json({ success: true, weekOf, walletsSettled: settled.length, onchainTx: tx.hash, settled });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'On-chain settle failed' });
  }
});

// ─── GET /api/profile/:walletAddress ─────────────────────────────────────────
app.get('/api/profile/:walletAddress', async (req, res) => {
  const wallet = req.params.walletAddress.toLowerCase();
  const now = new Date();

  // Build last-14-days list
  const dayStrings = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    return d.toISOString().slice(0, 10);
  });

  // Fetch user + points + vault + all 14 round docs in ONE parallel batch
  const [userSnap, pointsSnap, vaultSnap, ...roundSnaps] = await Promise.all([
    db.collection('users').doc(wallet).get(),
    db.collection('points').doc(wallet).get(),
    db.collection('vault').doc(wallet).get(),
    ...dayStrings.map(ds => db.collection('rounds').doc(ds).get().catch(() => null)),
  ]);

  const userData   = userSnap.exists   ? userSnap.data()!   : { displayName: `${wallet.slice(0,6)}...${wallet.slice(-4)}`, totalHuntsWon: 0, totalVaultDays: 0, createdAt: null };
  const pointsData = pointsSnap.exists ? pointsSnap.data()! : { totalPoints: 0, pendingPoints: 0, claimedPoints: 0, history: [] };
  const vaultData  = vaultSnap.exists  ? vaultSnap.data()!  : { positions: [], totalPointsEarned: 0 };

  // Build hunt history from the already-fetched round docs (no extra awaits)
  const huntHistory: any[] = [];
  for (let i = 0; i < roundSnaps.length && huntHistory.length < 10; i++) {
    const rSnap = roundSnaps[i];
    if (!rSnap || !rSnap.exists) continue;
    const rData = rSnap.data()!;
    const sub   = (rData.submissions ?? []).find((s: any) => s.wallet === wallet);
    if (sub) huntHistory.push({ date: dayStrings[i], score: sub.aiScore, verdict: sub.aiVerdict, txHash: sub.txHash, won: rData.winner?.wallet === wallet });
  }
  const positions = (vaultData.positions ?? []).map((pos: any) => {
    const cfg          = Object.values(VAULT_ASSETS).find(a => a.address.toLowerCase() === pos.asset.toLowerCase());
    const lastSnapshot = pos.lastSnapshotAt?._seconds ? pos.lastSnapshotAt._seconds * 1000 : Date.now();
    const daysSince    = Math.max(0, (Date.now() - lastSnapshot) / (1000 * 60 * 60 * 24));
    const amountHuman  = parseFloat(pos.amountWei) / Math.pow(10, pos.decimals);
    const pendingPts   = cfg ? Math.floor(daysSince * amountHuman * cfg.ptsPerTokenPerDay) : 0;
    const ptsPerDay    = cfg ? amountHuman * cfg.ptsPerTokenPerDay : 0;
    return { ...pos, pendingPts, ptsPerDay, amountHuman: amountHuman.toFixed(6) };
  });
  return res.json({ wallet, user: userData, points: { totalPoints: pointsData.totalPoints ?? 0, pendingPoints: pointsData.pendingPoints ?? 0, claimedPoints: pointsData.claimedPoints ?? 0, history: (pointsData.history ?? []).slice(-10).reverse() }, vault: { positions, totalPointsEarned: vaultData.totalPointsEarned ?? 0 }, huntHistory, nextClaimDate: nextSunday() });
});

// ─── GET /api/claim/:walletAddress ────────────────────────────────────────────
app.get('/api/claim/:walletAddress', async (req, res) => {
  const wallet = req.params.walletAddress.toLowerCase();
  const weekOf = currentWeekOf();
  const now    = new Date();

  // Build list of last 12 Monday week-strings (most recent first)
  const weekStrings = Array.from({ length: 12 }, (_, w) => {
    const d    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - w * 7));
    const day  = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon  = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
    return mon.toISOString().slice(0, 10);
  });

  // Fetch current claim + all 12 history weeks + points doc in ONE parallel batch
  const [currentSnap, pointsSnap, ...histSnaps] = await Promise.all([
    db.collection('claims').doc(weekOf).collection(wallet).doc('claim').get().catch(() => null),
    db.collection('points').doc(wallet).get(),
    ...weekStrings.map(ws =>
      db.collection('claims').doc(ws).collection(wallet).doc('claim').get().catch(() => null)
    ),
  ]);

  const currentClaim = currentSnap?.exists ? currentSnap.data() ?? null : null;

  const claimHistory: any[] = [];
  for (let i = 0; i < histSnaps.length; i++) {
    const snap = histSnaps[i];
    if (snap?.exists) claimHistory.push({ weekOf: weekStrings[i], ...snap.data() });
  }

  const pendingPoints = pointsSnap.exists ? (pointsSnap.data()?.pendingPoints ?? 0) : 0;
  const pendingProof  = (pendingPoints / 100) * 50;
  return res.json({ wallet, weekOf, currentClaim, claimHistory, pendingPoints, pendingProof, nextClaimDate: nextSunday() });
});

// ─── POST /api/claim/mark-claimed ─────────────────────────────────────────────
app.post('/api/claim/mark-claimed', async (req, res) => {
  const { walletAddress, txHash } = req.body;
  if (!walletAddress || !txHash) return res.status(400).json({ error: 'walletAddress and txHash required.' });
  const wallet = walletAddress.toLowerCase();
  const weekOf = currentWeekOf();
  try {
    const claimRef = db.collection('claims').doc(weekOf).collection(wallet).doc('claim');
    const snap     = await claimRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'No claim record found.' });
    if (snap.data()?.claimed) return res.status(409).json({ error: 'Already claimed.' });
    await claimRef.update({ claimed: true, claimedAt: Timestamp.now(), txHash });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to mark claim.' });
  }
});

// ─── PUT /api/profile/display-name ───────────────────────────────────────────
app.put('/api/profile/display-name', async (req, res) => {
  const { walletAddress, displayName } = req.body;
  if (!walletAddress || !displayName) return res.status(400).json({ error: 'walletAddress and displayName required.' });
  if (displayName.length > 32) return res.status(400).json({ error: 'Max 32 chars.' });
  await db.collection('users').doc(walletAddress.toLowerCase()).set({ displayName: displayName.trim() }, { merge: true });
  return res.json({ success: true, displayName: displayName.trim() });
});

// ─── GET /api/vault/apy ───────────────────────────────────────────────────────
app.get('/api/vault/apy', async (_req, res) => {
  const AAVE_POOL = '0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402';
  const CELO_RPC  = 'https://forno.celo.org';
  const assetsToQuery = [
    { symbol: 'CELO', address: '0x471EcE3750Da237f93B8E339c536989b8978a438' },
    { symbol: 'USDC', address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' },
    { symbol: 'USDT', address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' },
    { symbol: 'cUSD', address: '0x765DE816845861e75A25fCA122bb6898B8B1282a' },
    { symbol: 'WETH', address: '0xD221812de1BD094f35587EE8E174B07B6167D9Af' },
  ];
  const results: { symbol: string; apy: number; address: string; aTokenAddress?: string }[] = [];
  for (const asset of assetsToQuery) {
    try {
      const padded  = asset.address.replace('0x','').toLowerCase().padStart(64,'0');
      const callData = '0x35ea6a75' + padded;
      const raw      = await rpcCall(CELO_RPC, 'eth_call', [{ to: AAVE_POOL, data: callData }, 'latest']);
      if (raw && raw !== '0x') {
        const hex    = raw.slice(2);
        const slot3  = hex.slice(3*64, 4*64);
        const ray    = BigInt('0x'+slot3);
        const RAY    = BigInt('1000000000000000000000000000');
        const apy    = Number((ray * BigInt(10000)) / RAY) / 100;
        let aToken: string | undefined;
        if (hex.length >= 9*64) aToken = '0x' + hex.slice(8*64, 9*64).slice(24);
        results.push({ symbol: asset.symbol, apy: Math.min(apy,99), address: asset.address, aTokenAddress: aToken });
      } else {
        results.push({ symbol: asset.symbol, apy: 0, address: asset.address });
      }
    } catch (_) { results.push({ symbol: asset.symbol, apy: 0, address: asset.address }); }
  }
  return res.json({ assets: results, pool: AAVE_POOL, chain: 'celo', timestamp: Date.now() });
});

// ─── POST /api/forensic ───────────────────────────────────────────────────────
app.post('/api/forensic', async (req, res) => {
  const { txHash } = req.body;
  if (!txHash) return res.status(400).json({ error: 'Transaction hash is required.' });
  const hash = txHash.toLowerCase().trim();
  try {
    let found = await fetchTxFromRpcs(hash);
    if (!found) found = await fetchTxFromEtherscan(hash);
    let txContext = ''; let dataFound = false;
    if (found) {
      dataFound = true;
      const { tx, rpcUrl, network } = found;
      const receipt      = await fetchReceipt(rpcUrl, hash);
      const valueEth     = tx.value    ? (parseInt(tx.value,    16)/1e18).toFixed(6) : '0';
      const gasLimit     = tx.gas      ? parseInt(tx.gas,       16) : 0;
      const gasPriceGwei = tx.gasPrice ? (parseInt(tx.gasPrice, 16)/1e9).toFixed(2) : '?';
      const gasUsed      = receipt?.gasUsed    ? parseInt(receipt.gasUsed,16) : null;
      const blockNum     = tx.blockNumber ? parseInt(tx.blockNumber,16) : null;
      const status       = receipt?.status === '0x1' ? 'SUCCESS' : receipt?.status === '0x0' ? 'REVERTED' : 'PENDING/UNKNOWN';
      const logs         = receipt?.logs ?? [];
      const inputSnip    = (tx.input||'0x').slice(0,400);
      const logAddrs     = [...new Set(logs.map((l:any) => l.address))].slice(0,5);
      const topics0      = logs.slice(0,5).map((l:any) => l.topics?.[0]).filter(Boolean);
      txContext = `NETWORK: ${network}\nTX: ${hash}\nFROM: ${tx.from}\nTO: ${tx.to??'(deploy)'}\nVALUE: ${valueEth}\nGAS LIMIT: ${gasLimit}\nGAS USED: ${gasUsed??'unknown'}\nGAS PRICE: ${gasPriceGwei} Gwei\nBLOCK: ${blockNum}\nSTATUS: ${status}\nCONTRACT CREATION: ${!tx.to}\nINPUT: ${inputSnip}\nLOGS: ${logs.length}\nLOG ADDRS: ${JSON.stringify(logAddrs)}\nSIGS: ${JSON.stringify(topics0)}\nNONCE: ${tx.nonce?parseInt(tx.nonce,16):'unknown'}`;
    } else { txContext = `NO ON-CHAIN DATA FOUND FOR: ${hash}`; }
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are ALPHA-9, elite blockchain forensic AI.\nSCORING:\n- 90-100: Historically famous\n- 75-89: Major DeFi / whale\n- 50-74: Solid DeFi activity\n- 25-49: Standard tx\n- 1-24: Minimal\nReturn ONLY JSON:\n{"score":<1-100>,"tier":"God Mode"|"Elite Scout"|"Initiate","summary":"<UPPERCASE 2-3 sentences>","signals":["s1","s2","s3"],"riskFlags":[],"verdict":"<ONE uppercase sentence>"}' },
        { role: 'user', content: dataFound ? `Analyze:\n${txContext}` : `Analyze hash, no raw data:\nHASH: ${hash}` },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });
    const raw    = completion.choices[0]?.message?.content ?? '{}';
    const result = extractJson(raw);
    const score  = Math.min(100,Math.max(1,parseInt(String(result.score))||35));
    const tier   = typeof result.tier==='string'&&['God Mode','Elite Scout','Initiate'].includes(result.tier) ? result.tier : score>=76?'God Mode':score>=41?'Elite Scout':'Initiate';
    return res.json({ score, tier, summary: typeof result.summary==='string'?result.summary:'Analysis complete.', signals: Array.isArray(result.signals)?result.signals:[], riskFlags: Array.isArray(result.riskFlags)?result.riskFlags:[], verdict: typeof result.verdict==='string'?result.verdict:'TRANSACTION ANALYZED.', cached: false });
  } catch (err: unknown) {
    return res.status(500).json({ error: `Forensic engine error: ${err instanceof Error ? err.message : 'Internal error.'}` });
  }
});

// ─── Middleware ───────────────────────────────────────────────────────────────
const setupMiddleware = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
};
setupMiddleware();

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
