import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Zap, Trophy, Flame } from 'lucide-react';

interface ActivityData {
  totalPoints: number;
  pendingPoints: number;
  lastHuntDate: string | null;
  lastHuntScore: number | null;
  vaultBalance: string | null; // e.g. "5.00 CELO"
  streak: number;
}

export function MiniActivityFeed() {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<ActivityData | null>(null);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/profile/${address}`)
      .then(r => r.json())
      .then(profile => {
        // Last hunt from huntHistory
        const lastHunt = profile.huntHistory?.[0] ?? null;

        // Vault: sum positions into readable string
        const positions: any[] = profile.vault?.positions ?? [];
        let vaultStr: string | null = null;
        if (positions.length > 0) {
          const first = positions[0];
          const amt = parseFloat(first.amountHuman || '0').toFixed(2);
          vaultStr = `${amt} ${first.symbol}`;
          if (positions.length > 1) vaultStr += ` +${positions.length - 1} more`;
        }

        // Streak: count consecutive days with history entries
        const history: { date: string }[] = profile.points?.history ?? [];
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const d = new Date(today);
          d.setUTCDate(today.getUTCDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          if (history.some(h => h.date === dateStr)) streak++;
          else break;
        }

        setData({
          totalPoints: profile.points?.totalPoints ?? 0,
          pendingPoints: profile.points?.pendingPoints ?? 0,
          lastHuntDate: lastHunt?.date ?? null,
          lastHuntScore: lastHunt?.score ?? null,
          vaultBalance: vaultStr,
          streak,
        });
      })
      .catch(() => {});
  }, [address]);

  if (!isConnected || !address || !data) return null;

  const items = [
    {
      icon: <Zap className="w-3 h-3 text-[#FFB800]" />,
      label: 'TOTAL PTS',
      value: data.totalPoints.toLocaleString(),
    },
    {
      icon: <Trophy className="w-3 h-3 text-yellow-400" />,
      label: 'LAST HUNT',
      value: data.lastHuntDate
        ? `${data.lastHuntDate} · ${data.lastHuntScore}/100`
        : 'NO HUNTS YET',
    },
    {
      icon: <span className="text-emerald-400 text-[10px] font-black">◈</span>,
      label: 'VAULT',
      value: data.vaultBalance ?? 'NO POSITION',
    },
    ...(data.streak > 1
      ? [
          {
            icon: <Flame className="w-3 h-3 text-orange-400" />,
            label: 'STREAK',
            value: `${data.streak}D 🔥`,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full border border-[#FFB800]/15 bg-[#070707] font-mono">
      <div className="px-4 py-2 border-b border-[#FFB800]/10 flex items-center justify-between">
        <span className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">
          // YOUR_ACTIVITY
        </span>
        <span className="text-[9px] text-[#FFB800]/20 uppercase tracking-widest">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#FFB800]/10">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 px-4 py-3">
            {item.icon}
            <div className="min-w-0">
              <div className="text-[8px] text-[#FFB800]/25 uppercase tracking-widest">{item.label}</div>
              <div className="text-[11px] font-black text-[#FFB800] truncate">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
