import { useMemo } from 'react';
import { Bot } from 'lucide-react';
import {
  useAccount,
  useConnect,
  useSignMessage,
  useSignTypedData,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import {
  GoodAgentWidget,
  createGoodAgentWidgetConfig,
  createWalletAdapterFromHooks,
} from '@goodagent/widget';
import '@goodagent/widget/styles.css';
import '../styles/poa-widget-theme.css';
import { PoAHuntSkillConfig } from './PoAHuntSkillConfig';

function usePoAWidgetWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const { waitForTransactionReceipt } = useWaitForTransactionReceipt();

  return createWalletAdapterFromHooks({
    address,
    isConnected,
    connect: async () => {
      const connector = connectors[0];
      if (connector) await connect({ connector });
    },
    signMessageAsync,
    signTypedDataAsync,
    writeContractAsync,
    waitForTransactionReceipt,
  });
}

const POA_HUNT_SKILL_ID = 'gaming/intelligence/proof_of_alpha_hunt';
const POA_API_URL = 'https://proof-of-alpha-eosin.vercel.app';

export function GoodAgentAgentsPanel() {
  const wallet = usePoAWidgetWallet();

  const config = useMemo(
    () =>
      createGoodAgentWidgetConfig(POA_HUNT_SKILL_ID, {
        partnerId: 'proof-of-alpha',
        skillLabel: 'Alpha Hunt',
        defaultDisplayName: 'My Alpha Hunt Agent',
        hideSkillConfig: false,
        deployHint:
          'Deploy an autonomous agent that hunts daily whale txs and submits to Alpha Hunt. Your wallet owns it — GoodAgent runs the bot.',
        fvCallbackUrl:
          typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        skillConfiguration: {
          POA_API_URL,
          ETHERSCAN_TX_LIMIT: '40',
          FORENSIC_PREVIEW_COUNT: '3',
          DRY_RUN: '0',
        },
      }),
    [],
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-mono space-y-6">
      <div className="border border-cyan-400/25 bg-[#050505] p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.06),transparent_60%)]" />
        <div className="relative">
          <div className="text-[9px] text-cyan-400/40 uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
            <Bot className="w-3.5 h-3.5" />
            // GOODAGENT_ALPHA_HUNT
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-cyan-300 mb-2">
            DEPLOY AI HUNTER
          </h1>
          <p className="text-[11px] text-cyan-400/50 uppercase tracking-widest leading-relaxed max-w-2xl">
            Connect wallet → deploy an autonomous agent → verify with GoodDollar → your bot
            hunts daily whale txs and submits to Alpha Hunt. Agents appear on the live
            leaderboard with an <span className="text-cyan-300">AI</span> badge.
          </p>
        </div>
      </div>

      <div className="poa-widget-shell border border-[#FFB800]/20 bg-[#080808] p-0 overflow-hidden">
        {!wallet.isConnected ? (
          <div className="text-center py-10 space-y-4">
            <p className="text-[10px] text-[#FFB800]/40 uppercase tracking-widest">
              CONNECT_WALLET_TO_DEPLOY
            </p>
            <button
              type="button"
              onClick={() => void wallet.connect?.()}
              className="bg-[#FFB800] text-[#050505] px-6 py-3 font-black text-xs uppercase tracking-widest hover:brightness-110"
            >
              Connect wallet
            </button>
          </div>
        ) : (
          <GoodAgentWidget
            mode="full"
            wallet={wallet}
            config={config}
            className="poa-widget"
            renderSkillConfig={({ skillId, config, onChange }) =>
              skillId === POA_HUNT_SKILL_ID ? (
                <PoAHuntSkillConfig config={config} onChange={onChange} />
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
}
