import { useEffect, useState } from 'react';

export interface StreakInfo {
  streak: number;         // current consecutive days
  maxStreak: number;      // all-time best
  bonusEarned: boolean;   // true if bonus was applied today
  nextMilestone: number;  // next bonus milestone (3, 7, 14, 30)
}

const MILESTONES = [3, 7, 14, 30];
const BONUS_PTS  = { 3: 50, 7: 100, 14: 150, 30: 200 } as const;

function calcStreak(history: { date: string; source: string }[]): { streak: number; maxStreak: number } {
  if (!history?.length) return { streak: 0, maxStreak: 0 };

  // Unique dates with activity, sorted descending
  const dates = [...new Set(history.map(h => h.date))].sort((a, b) => b.localeCompare(a));

  let streak = 0;
  let maxStreak = 0;
  let current = 0;

  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);

    if (i === 0 && dates[0] !== today && dates[0] !== new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
      // No activity today or yesterday — streak broken
      break;
    }

    if (dates[i] === expectedStr) {
      current++;
      if (i === 0) streak = current;
    } else {
      break;
    }
  }

  // max streak: just iterate all
  let tmp = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) { tmp++; maxStreak = Math.max(maxStreak, tmp); }
    else { tmp = 1; }
  }
  maxStreak = Math.max(maxStreak, current);

  return { streak, maxStreak };
}

export function useStreak(address: string | undefined): StreakInfo | null {
  const [info, setInfo] = useState<StreakInfo | null>(null);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/profile/${address}`)
      .then(r => r.json())
      .then(profile => {
        const history = profile.points?.history ?? [];
        const { streak, maxStreak } = calcStreak(history);

        const today = new Date().toISOString().slice(0, 10);
        const bonusEarned = history.some(
          (h: any) => h.date === today && h.source === 'streak_bonus'
        );

        const nextMilestone = MILESTONES.find(m => m > streak) ?? 30;

        setInfo({ streak, maxStreak, bonusEarned, nextMilestone });
      })
      .catch(() => {});
  }, [address]);

  return info;
}

// ─── Server-side helper (paste into server.ts) ────────────────────────────
// Call this inside /api/forensic or /api/hunt/submit after awarding points.
//
// async function checkAndAwardStreakBonus(db, walletAddress) {
//   const ref = db.collection('points').doc(walletAddress);
//   const doc = await ref.get();
//   if (!doc.exists) return;
//   const data = doc.data();
//   const history = data.history ?? [];
//   const today = new Date().toISOString().slice(0, 10);
//
//   // Already got bonus today?
//   if (history.some(h => h.date === today && h.source === 'streak_bonus')) return;
//
//   // Count streak
//   const dates = [...new Set(history.map(h => h.date))].sort((a,b) => b.localeCompare(a));
//   let streak = 0;
//   for (let i = 0; i < dates.length; i++) {
//     const exp = new Date();
//     exp.setUTCDate(exp.getUTCDate() - i);
//     if (dates[i] === exp.toISOString().slice(0,10)) streak++;
//     else break;
//   }
//
//   const BONUS = { 3: 50, 7: 100, 14: 150, 30: 200 };
//   const bonus = BONUS[streak];
//   if (!bonus) return;
//
//   await ref.update({
//     totalPoints: FieldValue.increment(bonus),
//     pendingPoints: FieldValue.increment(bonus),
//     history: FieldValue.arrayUnion({
//       date: today, source: 'streak_bonus', points: bonus,
//     }),
//   });
//
//   console.log(`[streak] ${walletAddress} day-${streak} bonus: +${bonus} pts`);
// }

export { MILESTONES, BONUS_PTS };
