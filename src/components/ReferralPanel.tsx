import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Copy, Check, Users } from 'lucide-react';

// ─── Hook ────────────────────────────────────────────────────────────────────
export interface ReferralStats {
  referralCode: string;       // = wallet address (no extra DB needed)
  referredCount: number;      // how many people used this code
  pointsEarned: number;       // total pts from referrals
}

export function useReferral() {
  const { address } = useAccount();
  const [stats, setStats] = useState<ReferralStats | null>(null);

  // Detect ?ref= on first visit and save to localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref !== address) {
      localStorage.setItem('poa_ref', ref.toLowerCase());
    }
  }, [address]);

  // Send referral attribution when user connects wallet
  useEffect(() => {
    if (!address) return;
    const ref = localStorage.getItem('poa_ref');
    if (!ref || ref === address.toLowerCase()) return;

    // Fire once — server will deduplicate
    fetch('/api/referral/attribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referee: address.toLowerCase(), referrer: ref }),
    })
      .then(r => r.json())
      .then(d => { if (d.ok) localStorage.removeItem('poa_ref'); })
      .catch(() => {});
  }, [address]);

  // Load stats
  useEffect(() => {
    if (!address) return;
    fetch(`/api/referral/stats/${address.toLowerCase()}`)
      .then(r => r.json())
      .then(d =>
        setStats({
          referralCode: address.toLowerCase(),
          referredCount: d.referredCount ?? 0,
          pointsEarned: d.pointsEarned ?? 0,
        })
      )
      .catch(() => {});
  }, [address]);

  return stats;
}

// ─── UI Component ─────────────────────────────────────────────────────────────
export function ReferralPanel() {
  const { address, isConnected } = useAccount();
  const stats = useReferral();
  const [copied, setCopied] = useState(false);

  if (!isConnected || !address || !stats) return null;

  const link = `${window.location.origin}/?ref=${address.toLowerCase()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-[#FFB800]/20 bg-[#050505] font-mono">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#FFB800]/10">
        <Users className="w-3.5 h-3.5 text-[#FFB800]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB800]">
          REFERRAL PROGRAM
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* How it works */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="border border-[#FFB800]/10 bg-[#080808] px-3 py-3">
            <div className="text-lg font-black text-[#FFB800]">+100</div>
            <div className="text-[8px] text-[#FFB800]/30 uppercase tracking-widest mt-0.5">
              PTS FOR YOU PER REFERRAL
            </div>
          </div>
          <div className="border border-[#FFB800]/10 bg-[#080808] px-3 py-3">
            <div className="text-lg font-black text-yellow-400">+50</div>
            <div className="text-[8px] text-[#FFB800]/30 uppercase tracking-widest mt-0.5">
              PTS FOR THEM ON SIGNUP
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between px-1">
          <div>
            <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">REFERRED</div>
            <div className="text-xl font-black text-[#FFB800]">{stats.referredCount}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">PTS EARNED</div>
            <div className="text-xl font-black text-[#FFB800]">+{stats.pointsEarned}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">VALUE</div>
            <div className="text-xl font-black text-yellow-400">
              ~{((stats.pointsEarned / 100) * 50).toFixed(0)} $PROOF
            </div>
          </div>
        </div>

        {/* Link */}
        <div className="border border-[#FFB800]/20 flex items-stretch">
          <div className="flex-1 px-3 py-2.5 text-[10px] text-[#FFB800]/50 font-mono truncate">
            {link}
          </div>
          <button
            onClick={handleCopy}
            className="px-4 border-l border-[#FFB800]/20 text-[#FFB800] hover:bg-[#FFB800]/10 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="text-[9px] uppercase tracking-widest font-black">
              {copied ? 'COPIED' : 'COPY'}
            </span>
          </button>
        </div>

        <p className="text-[9px] text-[#FFB800]/20 uppercase tracking-widest">
          BONUS CREDITED WHEN YOUR REFERRAL MINTS THEIR FIRST SBT
        </p>
      </div>
    </div>
  );
}

// ─── Server endpoints to add to server.ts ────────────────────────────────────
//
// ## Collection: referrals/{referrerAddress}
// Fields:
//   referredWallets : string[]   (deduped list of referee addresses)
//   totalReferred   : number
//   totalPtsEarned  : number
//
// POST /api/referral/attribute
//   body: { referee, referrer }
//   - Check referrals/{referrer}.referredWallets doesn't include referee
//   - If new: arrayUnion referee, increment totalReferred
//   - Award +50 pts to referee (pendingPoints), +100 pts to referrer
//   - Return { ok: true }
//
// GET /api/referral/stats/:wallet
//   - Return referrals/{wallet} or { referredCount: 0, pointsEarned: 0 }
