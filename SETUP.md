# Proof of Alpha — Complete Setup Guide
# ══════════════════════════════════════════════════════════════════════════════

## OVERVIEW
Stack: React + Wagmi + Express + Firebase Admin + Groq AI + Celo Mainnet
New in v3: ProofClaimManager.sol · Firebase Firestore · Alpha Arena (real) · Alpha Vault (5 assets) · Profile Page · Claim Page

---

## STEP 1 — DEPLOY ProofClaimManager.sol (via Remix — works from Termux too)

### Option A: Remix IDE (Browser)
1. Open https://remix.ethereum.org
2. In the File Explorer, create `/contracts/ProofClaimManager.sol`
3. Paste the full content from `contracts/ProofClaimManager.sol`
4. Click **Solidity Compiler** tab → select compiler `0.8.20` → click **Compile**
5. Click **Deploy & Run** tab:
   - Environment: **Injected Provider - MetaMask** (make sure MetaMask is on Celo Mainnet)
   - Add Celo Mainnet to MetaMask if needed:
     - Network Name: Celo Mainnet
     - RPC URL: https://forno.celo.org
     - Chain ID: 42220
     - Symbol: CELO
     - Explorer: https://celoscan.io
6. Under **Deploy**, in the constructor field enter:
   `proofToken_ = 0xd2a88b9d9f14952b2e79b01b9e26c6a15efc7336`
7. Click **Deploy** → confirm in MetaMask → wait for tx
8. Copy the deployed contract address (shown in Remix console)
9. Save this address — you'll add it to `.env` as `CLAIM_CONTRACT_ADDRESS`

### Option B: Remix from Termux (Android)
```bash
# Install Termux from F-Droid (not Play Store)
pkg update && pkg upgrade -y
pkg install nodejs-lts git -y

# Use Remix CLI
npm install -g @remix-project/remixd

# Serve your contracts folder to Remix
remixd -s ./contracts --remix-ide https://remix.ethereum.org

# Then in Remix browser, connect "localhost" workspace
# Follow same steps as Option A above
```

### After Deployment
```bash
# Fund the contract so claims can be paid out
# In Remix → interact with deployed contract:
# 1. Call approve() on $PROOF token (0xd2a88b9d9f...) with:
#    spender = your deployed ProofClaimManager address
#    amount  = amount in wei (e.g. 1000000000000000000000 = 1000 $PROOF)
# 2. Call fundContract(amount) on ProofClaimManager
```

---

## STEP 2 — FIREBASE SETUP

### Create Firestore database
1. Go to https://console.firebase.google.com
2. Create project (or use existing)
3. Firestore Database → Create database → Start in **production mode**
4. Choose region closest to your users (e.g. `us-central` or `asia-southeast1`)

### Apply Security Rules
1. Firestore → Rules tab
2. Paste content from `firebase/firestore.rules`
3. Click **Publish**

### Get Admin SDK credentials
1. Project Settings (gear icon) → **Service Accounts**
2. Click **Generate new private key** → save the JSON file
3. From the JSON, extract:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

---

## STEP 3 — ENVIRONMENT VARIABLES

```bash
cp .env.example .env
```

Edit `.env` and fill in every value:

| Variable                    | Where to get it                                          |
|-----------------------------|----------------------------------------------------------|
| VITE_REOWN_PROJECT_ID       | https://cloud.reown.com → create project                 |
| GROQ_API_KEY                | https://console.groq.com → API Keys                      |
| ETHERSCAN_API_KEY           | https://etherscan.io/myapikey (optional)                 |
| FIREBASE_PROJECT_ID         | Firebase Console → Project Settings                      |
| FIREBASE_CLIENT_EMAIL       | Firebase service account JSON                            |
| FIREBASE_PRIVATE_KEY        | Firebase service account JSON (keep the \n newlines)     |
| ADMIN_PRIVATE_KEY           | Private key of your admin wallet (deployer of contract)  |
| CLAIM_CONTRACT_ADDRESS      | Address from Step 1                                      |
| VITE_CLAIM_CONTRACT_ADDRESS | Same as above (exposed to frontend via Vite)             |
| ADMIN_CRON_KEY              | Run: `openssl rand -hex 32`                              |

---

## STEP 4 — LOCAL DEVELOPMENT

```bash
# Install dependencies
npm install

# Start dev server (Express + Vite HMR)
npm run dev

# Open http://localhost:3000
```

---

## STEP 5 — CRON JOBS (set up with cron / Vercel Cron / GitHub Actions)

### Daily at 00:00 UTC — Vault Snapshot
```bash
curl -X POST https://YOUR_DOMAIN/api/vault/snapshot \
  -H "x-admin-key: YOUR_ADMIN_CRON_KEY"
```

### Daily at 23:59 UTC — Judge Hunt Round
```bash
curl -X POST https://YOUR_DOMAIN/api/hunt/judge \
  -H "x-admin-key: YOUR_ADMIN_CRON_KEY"
```

### Sunday at 01:00 UTC — Weekly Settle ($PROOF distribution)
```bash
curl -X POST https://YOUR_DOMAIN/api/weekly/settle \
  -H "x-admin-key: YOUR_ADMIN_CRON_KEY"
```

### Vercel Cron (add to vercel.json)
```json
{
  "crons": [
    { "path": "/api/vault/snapshot",  "schedule": "0 0 * * *"   },
    { "path": "/api/hunt/judge",      "schedule": "59 23 * * *" },
    { "path": "/api/weekly/settle",   "schedule": "0 1 * * 0"   }
  ]
}
```
> Note: Vercel cron calls don't support custom headers — wrap endpoints to check a query param instead, or use a GitHub Action.

### GitHub Actions Cron (recommended for header-protected endpoints)
Create `.github/workflows/cron.yml`:
```yaml
name: POA Crons
on:
  schedule:
    - cron: '0 0 * * *'   # daily snapshot
    - cron: '59 23 * * *' # daily judge
    - cron: '0 1 * * 0'   # weekly settle
jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - name: Vault Snapshot
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/vault/snapshot \
            -H "x-admin-key: ${{ secrets.ADMIN_CRON_KEY }}"
      - name: Judge Round
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/hunt/judge \
            -H "x-admin-key: ${{ secrets.ADMIN_CRON_KEY }}"
      - name: Weekly Settle (Sundays only)
        if: ${{ github.event.schedule == '0 1 * * 0' }}
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/weekly/settle \
            -H "x-admin-key: ${{ secrets.ADMIN_CRON_KEY }}"
```

---

## STEP 6 — PRODUCTION BUILD

```bash
npm run build
npm run start
```

---

## STEP 7 — VERCEL DEPLOYMENT

```bash
npm install -g vercel
vercel login
vercel --prod
```

Add all `.env` variables in Vercel Dashboard → Project → Settings → Environment Variables.

vercel.json is already configured in the repo.

---

## STEP 8 — FUND THE CLAIM CONTRACT (before first Sunday)

```bash
# In Remix, with your admin wallet connected:

# 1. Go to $PROOF token contract on Celoscan:
#    https://celoscan.io/address/0xd2a88b9d9f14952b2e79b01b9e26c6a15efc7336#writeContract

# 2. Call approve():
#    spender: YOUR_CLAIM_CONTRACT_ADDRESS
#    amount:  10000000000000000000000  (10,000 $PROOF in wei)

# 3. In your deployed ProofClaimManager, call fundContract():
#    amount: 10000000000000000000000

# 4. Verify with contractBalance() — should return the funded amount
```

---

## API ENDPOINTS REFERENCE

| Method | Endpoint                        | Auth              | Description                        |
|--------|---------------------------------|-------------------|------------------------------------|
| GET    | /api/health                     | none              | Health check                       |
| GET    | /api/hunt/target                | none              | Today's hunt target wallet         |
| POST   | /api/hunt/submit                | none              | Legacy submit (compat)             |
| POST   | /api/hunt/submit-v2             | none              | New submit with Firebase + AI      |
| GET    | /api/hunt/round                 | none              | Current round data + leaderboard   |
| POST   | /api/hunt/judge                 | x-admin-key       | Judge today's round                |
| GET    | /api/vault/apy                  | none              | Live Aave V3 Celo APY (all 5)      |
| POST   | /api/vault/deposit-record       | none              | Record deposit in Firebase         |
| POST   | /api/vault/withdraw-record      | none              | Record withdrawal + calc pts       |
| POST   | /api/vault/snapshot             | x-admin-key       | Daily points snapshot              |
| POST   | /api/weekly/settle              | x-admin-key       | Sunday $PROOF settlement           |
| GET    | /api/profile/:wallet            | none              | Full profile data                  |
| GET    | /api/claim/:wallet              | none              | Claim page data                    |
| POST   | /api/claim/mark-claimed         | none              | Mark claim as done (post on-chain) |
| PUT    | /api/profile/display-name       | none              | Update display name                |
| POST   | /api/forensic                   | none              | AI forensic analysis               |

---

## POINTS SYSTEM

| Source        | Rate                    | Notes                        |
|---------------|-------------------------|------------------------------|
| Alpha Hunt    | 100 pts / win           | Per 24h UTC round            |
| CELO vault    | 2 pts / token / day     | Via daily snapshot           |
| USDC vault    | 1 pt  / token / day     | Via daily snapshot           |
| USDT vault    | 1 pt  / token / day     | Via daily snapshot           |
| cUSD vault    | 1 pt  / token / day     | Via daily snapshot           |
| WETH vault    | 5 pts / token / day     | Via daily snapshot           |
| Settlement    | 100 pts = 50 $PROOF     | Every Sunday UTC             |

---

## SMART CONTRACT FUNCTIONS

```solidity
// Owner calls this every Sunday (called automatically by /api/weekly/settle)
setClaimable(address[] wallets, uint256[] amounts)

// User calls this to receive their $PROOF
claim()

// Owner funds contract before Sunday
fundContract(uint256 amount)  // requires prior approve() on $PROOF token

// Safety drain
withdrawUnclaimed(uint256 amount)

// View helpers
contractBalance() → uint256
getClaimable(address wallet) → uint256
```

---

## TROUBLESHOOTING

**Firebase PRIVATE_KEY has \\n literally in env:**
```bash
# In .env, use double quotes and actual \n:
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

**Aave supply fails — approval not recognized:**
- The Approve tx must be confirmed (not just sent) before calling Supply
- AlphaVault.tsx uses `useWaitForTransactionReceipt` and checks `hasEnoughAllowance` via `useReadContract` — this is handled automatically

**Weekly settle fails — contract underfunded:**
- Call `contractBalance()` on ProofClaimManager
- If 0 or insufficient, call `fundContract()` with enough $PROOF after approving

**TX not found on any RPC:**
- Some very new txs may not be indexed yet — wait ~30s and retry
- Ensure the hash is from a supported chain (ETH, Celo, Base, Arb, OP, Polygon, BSC, Avax)
