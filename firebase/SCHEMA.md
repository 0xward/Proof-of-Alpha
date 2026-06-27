# Firebase Firestore — Proof of Alpha Schema
# ─────────────────────────────────────────────────────────────────────────────
# All walletAddress keys are lowercase hex strings (e.g. "0xabc...def")
# All timestamps are Firestore Timestamps (server-side) or ISO strings (client)
# ─────────────────────────────────────────────────────────────────────────────

## Collection: rounds/{YYYY-MM-DD}
#
# Document ID = UTC date string, e.g. "2026-06-08"
#
# Fields:
#   submissions (array of maps):
#     - wallet        : string   (lowercase hex)
#     - txHash        : string
#     - aiScore       : number   (1–100)
#     - aiVerdict     : string   (AI verdict sentence)
#     - aiSummary     : string   (2–3 sentence summary)
#     - aiTier        : string   ("God Mode" | "Elite Scout" | "Initiate")
#     - aiSignals     : string[] (up to 5 signal strings)
#     - timestamp     : Timestamp
#
#   winner (map, written when judged=true):
#     - wallet        : string
#     - txHash        : string
#     - score         : number
#     - decidedAt     : Timestamp
#
#   judged            : boolean  (false until /api/hunt/judge runs)
#   totalSubmissions  : number   (incremented on each valid submit)

## Collection: points/{walletAddress}
#
# Document ID = lowercase wallet address
#
# Fields:
#   totalPoints    : number   (all-time accumulated)
#   pendingPoints  : number   (earned, not yet settled into $PROOF claim)
#   claimedPoints  : number   (settled into $PROOF claims)
#   weeklySnapshot (map):
#     - weekOf     : string   (ISO date of Monday, e.g. "2026-06-08")
#     - points     : number   (points earned this week)
#   history (array of maps, most recent first, capped at 100 entries):
#     - date       : string   (YYYY-MM-DD)
#     - source     : string   ("hunt" | "vault")
#     - points     : number
#     - txHash     : string?  (optional, for vault withdrawals)
#     - asset      : string?  (optional, e.g. "CELO")
#     - amount     : string?  (optional, human-readable)

## Collection: vault/{walletAddress}
#
# Document ID = lowercase wallet address
#
# Fields:
#   positions (array of maps):
#     - asset           : string   (token address)
#     - symbol          : string   ("CELO" | "USDC" | "USDT" | "cUSD" | "WETH")
#     - decimals        : number   (18 for most, 6 for USDC/USDT)
#     - amountWei       : string   (uint256 as decimal string)
#     - depositedAt     : Timestamp
#     - lastSnapshotAt  : Timestamp
#     - depositTxHash   : string
#
#   totalPointsEarned : number   (lifetime vault points)

## Collection: users/{walletAddress}
#
# Document ID = lowercase wallet address
#
# Fields:
#   displayName    : string   (editable; default "0x1234...5678")
#   createdAt      : Timestamp
#   totalHuntsWon  : number
#   totalVaultDays : number   (sum of vault deposit days across all positions)

## Collection: claims/{weekOf}/{walletAddress}
#
# Parent document ID = ISO Monday date string (e.g. "2026-06-08")
# Sub-document ID    = lowercase wallet address
#
# Fields:
#   proofAmount  : number   ($PROOF tokens claimable, in whole tokens)
#   claimed      : boolean
#   claimedAt    : Timestamp?  (null until user claims)
#   txHash       : string?     (onchain claim tx hash)
#   pointsUsed   : number      (pendingPoints consumed to generate this claim)
