import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY = 'poa_onboarded_v1';

const STEPS = [
  {
    icon: '🔍',
    title: 'FORENSIC TERMINAL',
    desc: 'Paste any EVM transaction hash. Our AI engine scores it 1–100 and tells you exactly what happened on-chain — gas behavior, value flows, contract interactions.',
    sub: 'Supports Celo, Ethereum, Base, Arbitrum & more.',
  },
  {
    icon: '⚔',
    title: 'ALPHA ARENA',
    desc: 'Every 24 hours, a new target wallet is revealed. Find their best transaction, submit it, and compete for the top spot on the daily leaderboard.',
    sub: 'Win the Hunt → earn 100 pts → convert to $PROOF.',
  },
  {
    icon: '◈',
    title: 'ALPHA VAULT',
    desc: 'Supply USDm, USDT, CELO or WETH to Aave V3 on Celo and earn real DeFi yield — directly from this app. Withdraw anytime.',
    sub: 'Every token you supply also earns daily $PROOF points.',
  },
];

interface Props {
  onDone: () => void;
}

export function MiniPayOnboarding({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, '1');
      setVisible(false);
      onDone();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onDone();
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22 }}
          className="w-full max-w-sm bg-[#0a0a0a] border border-[#FFB800]/30 font-mono"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#FFB800]/10">
            <span className="text-[9px] text-[#FFB800]/30 uppercase tracking-widest">
              WELCOME TO PROOF OF ALPHA
            </span>
            <button
              onClick={handleSkip}
              className="text-[9px] text-[#FFB800]/20 hover:text-[#FFB800]/50 uppercase tracking-widest transition-colors"
            >
              SKIP
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-6 min-h-[200px]">
            <div className="text-4xl mb-4">{current.icon}</div>
            <div className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3">
              {current.title}
            </div>
            <p className="text-[11px] text-[#FFB800]/60 leading-relaxed mb-3">
              {current.desc}
            </p>
            <p className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest">
              {current.sub}
            </p>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex items-center justify-between">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === step ? 'bg-[#FFB800]' : 'bg-[#FFB800]/15'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="bg-[#FFB800] text-[#050505] px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
            >
              {step < STEPS.length - 1 ? 'NEXT →' : 'LETS GO →'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
