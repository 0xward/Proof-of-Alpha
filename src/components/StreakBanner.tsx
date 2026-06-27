import { useAccount } from 'wagmi';
import { useStreak, MILESTONES, BONUS_PTS } from '../hooks/useStreak';
import { Flame } from 'lucide-react';

export function StreakBanner() {
  const { address } = useAccount();
  const info = useStreak(address);

  if (!info || info.streak === 0) return null;

  const pct = info.nextMilestone === info.streak
    ? 100
    : Math.min(100, (info.streak / info.nextMilestone) * 100);

  const bonus = BONUS_PTS[info.nextMilestone as keyof typeof BONUS_PTS] ?? 200;

  return (
    <div className="border border-orange-500/30 bg-orange-500/5 font-mono px-4 py-3 flex items-center gap-3">
      <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
            {info.streak}D STREAK
          </span>
          {info.bonusEarned ? (
            <span className="text-[9px] text-green-400 uppercase tracking-widest font-black">
              BONUS CLAIMED TODAY ✓
            </span>
          ) : (
            <span className="text-[9px] text-orange-400/50 uppercase tracking-widest">
              NEXT: +{bonus} PTS AT DAY {info.nextMilestone}
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full bg-orange-500/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-orange-400/30 uppercase">DAY 1</span>
          {MILESTONES.map(m => (
            <span
              key={m}
              className={`text-[8px] uppercase ${
                info.streak >= m ? 'text-orange-400 font-black' : 'text-orange-400/20'
              }`}
            >
              {m}D
            </span>
          ))}
        </div>
      </div>
      {info.maxStreak > info.streak && (
        <div className="text-right flex-shrink-0">
          <div className="text-[8px] text-orange-400/25 uppercase tracking-widest">BEST</div>
          <div className="text-xs font-black text-orange-400/50">{info.maxStreak}D</div>
        </div>
      )}
    </div>
  );
}
