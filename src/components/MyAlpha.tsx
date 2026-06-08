import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI, getTier } from '../constants/contract';
import { ExternalLink, ShieldCheck, ShieldOff } from 'lucide-react';

export function MyAlpha() {
  const { address, isConnected } = useAccount();

  const { data: balance, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  if (!isConnected || !address) return null;

  return (
    <section className="bg-[#050505] border border-[#FFB800]/20 p-6">
      <h2 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-4 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" /> MY_PROOF_STATUS
      </h2>

      {isLoading ? (
        <div className="text-[10px] text-[#FFB800]/40 uppercase tracking-widest animate-pulse">
          QUERYING_CHAIN...
        </div>
      ) : balance !== undefined && balance > 0n ? (
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e] animate-pulse" />
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-green-500">
              PROOF EXISTS ON-CHAIN
            </div>
            <div className="text-[10px] text-[#FFB800]/40 mt-0.5 uppercase tracking-widest">
              {Number(balance)} SBT ANCHORED TO THIS WALLET
            </div>
          </div>
          <a
            href={`https://celoscan.io/address/${address}#tokentxnsErc721`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-[10px] text-[#FFB800]/50 hover:text-[#FFB800] flex items-center gap-1 uppercase tracking-widest transition-colors"
          >
            VIEW ON CELOSCAN <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <ShieldOff className="w-4 h-4 text-[#FFB800]/20" />
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[#FFB800]/40">
              NO PROOF FOUND
            </div>
            <div className="text-[10px] text-[#FFB800]/25 mt-0.5 uppercase tracking-widest">
              ANALYZE A TRANSACTION ABOVE TO EARN YOUR ON-CHAIN CREDENTIAL
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
