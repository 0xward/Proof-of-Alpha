import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X } from 'lucide-react';
import { useSendTransaction, useConnect, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { DONATION_WALLET } from '../constants/contract';
import { cn } from '../lib/utils';

export function MiniPayDonation() {
  const [isOpen, setIsOpen] = useState(false);
  const { sendTransaction, isPending } = useSendTransaction();
  const { isConnected } = useAccount();

  const handleDonate = (amount: string) => {
    sendTransaction({
      to: DONATION_WALLET as `0x${string}`,
      value: parseEther(amount),
    });
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end group">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="mb-4 p-4 bg-[#0a0a0a] border border-[#FFB800]/30 w-64 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#FFB800] text-[10px] font-bold tracking-widest uppercase">Support_Dev.sh</span>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-[#FFB800]/40 hover:text-[#FFB800] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            
            <p className="text-[#FFB800]/60 text-[10px] mb-4 font-mono lowercase leading-relaxed">
              Forensic engine maintenance requires recurring fuel. Send Celo to support.
            </p>

            <div className="grid grid-cols-1 gap-2">
              <div className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Select Amount</div>
              <div className="grid grid-cols-3 gap-2">
                {['0.1', '1', '5'].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleDonate(amt)}
                    disabled={!isConnected || isPending}
                    className="border border-[#FFB800]/20 text-[#FFB800] text-xs py-2 hover:bg-[#FFB800] hover:text-[#050505] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#FFB800] transition-all font-mono font-bold"
                  >
                    {amt}
                  </button>
                ))}
              </div>
              {!isConnected && (
                <div className="text-[9px] text-red-500 mt-2 uppercase tracking-tight font-mono text-center">
                  Wallet Not Connected
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-[#FFB800]/10 text-center">
               <div className="text-[#FFB800]/40 text-[8px] font-mono uppercase tracking-widest">
                 Connected: Celo Mainnet
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#FFB800] rounded-full flex items-center justify-center text-[#050505] shadow-[0_0_30px_rgba(255,184,0,0.3)] hover:shadow-[0_0_45px_rgba(255,184,0,0.5)] hover:scale-110 active:scale-90 transition-all duration-300"
      >
        <Heart className={cn("w-6 h-6 transition-all", isOpen ? 'fill-current scale-110' : '')} strokeWidth={2.5} />
      </button>
    </div>
  );
}
