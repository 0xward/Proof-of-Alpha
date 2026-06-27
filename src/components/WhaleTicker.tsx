import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity } from 'lucide-react';

interface WhaleTx {
  id: string;
  amount: number;
  type: 'EVM_TRANSFER' | 'CEX_TRADE';
  asset: string;
  network: string;
  from?: string;
  to?: string;
  side?: 'buy' | 'sell';
  hash?: string;
  timestamp: number;
}

export function WhaleTicker() {
  const [transactions, setTransactions] = useState<WhaleTx[]>([]);

  useEffect(() => {
    let wsEth: WebSocket;
    let wsBinance: WebSocket;

    const connectEth = () => {
      wsEth = new WebSocket('wss://ethereum-rpc.publicnode.com');
      
      wsEth.onopen = () => {
        wsEth.send(JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_subscribe",
          params: ["logs", {
            address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT on Ethereum
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
          }]
        }));
      };

      wsEth.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.method === 'eth_subscription' && data?.params?.result) {
            const log = data.params.result;
            const amountHex = log.data;
            const amount = parseInt(amountHex, 16) / 1e6; // USDT has 6 decimals
            
            // Only show whales > $100k
            if (amount > 100000) {
              const from = '0x' + log.topics[1].slice(26);
              const to = '0x' + log.topics[2].slice(26);
              
              const newTx: WhaleTx = {
                id: log.transactionHash + log.logIndex,
                amount,
                type: 'EVM_TRANSFER',
                asset: 'USDT',
                network: 'ETH',
                from,
                to,
                hash: log.transactionHash,
                timestamp: Date.now()
              };

              setTransactions(prev => [newTx, ...prev].slice(0, 25)); // Keep last 25
            }
          }
        } catch (err) {
          console.error(err);
        }
      };

      wsEth.onclose = () => {
        setTimeout(connectEth, 5000); // Reconnect
      };
    };

    const connectBinance = () => {
      wsBinance = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade/ethusdt@aggTrade/solusdt@aggTrade/bnbusdt@aggTrade');
      
      wsBinance.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.e === 'aggTrade') {
            const price = parseFloat(data.p);
            const qty = parseFloat(data.q);
            const amount = price * qty;
            
            // Only large volume trades > $50k on Binance
            if (amount > 50000) {
              const asset = data.s.replace('USDT', '');
              const side = data.m ? 'sell' : 'buy'; // If maker is buyer, it's a sell taker
              
              const newTx: WhaleTx = {
                id: `binance-${data.E}-${data.a}`,
                amount,
                type: 'CEX_TRADE',
                asset,
                network: 'BINANCE',
                side,
                timestamp: data.E
              };

              setTransactions(prev => [newTx, ...prev].slice(0, 25));
            }
          }
        } catch (err) {
          console.error(err);
        }
      };

      wsBinance.onclose = () => {
        setTimeout(connectBinance, 5000);
      };
    };

    connectEth();
    connectBinance();

    return () => {
      if (wsEth) wsEth.close();
      if (wsBinance) wsBinance.close();
    };
  }, []);

  return (
    <div className="w-full bg-[#050505] border-y border-[#FFB800]/20 font-mono text-[8px] sm:text-[10px] overflow-hidden relative h-10 flex items-center shadow-inner">
      <div className="absolute left-0 top-0 bottom-0 z-20 bg-[#050505] px-2 sm:px-4 flex items-center gap-1 sm:gap-2 tracking-widest uppercase shadow-[10px_0_20px_rgba(0,0,0,0.9)] whitespace-nowrap border-r border-[#FFB800]/20">
        <Activity className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse text-[#FFB800]" /> 
        <span className="text-[#FFB800] font-black hidden sm:inline">WHALE TX </span>
        <span className="text-[#FFB800] font-black sm:hidden">LIVE </span>
      </div>
      
      <div className="flex-1 min-w-0 overflow-hidden ml-16 sm:ml-36 relative h-full flex items-center mask-image:linear-gradient(to_right,transparent_0%,black_5%,black_95%,transparent_100%)]">
        <AnimatePresence>
          {transactions.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-10 flex items-center text-[#FFB800]/50 tracking-widest uppercase"
            >
              Listening to EVM mainnet for large USDT transfers...
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4 pl-4 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <AnimatePresence>
            {transactions.map((tx) => (
              <motion.div 
                key={tx.id} 
                initial={{ opacity: 0, x: -50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                layout
                className="flex items-center gap-3 text-[#FFB800] bg-[#FFB800]/5 px-3 py-1.5 border border-[#FFB800]/20 flex-shrink-0 hover:bg-[#FFB800]/10 transition-colors rounded-sm"
              >
                {tx.type === 'EVM_TRANSFER' ? (
                  <>
                    <span className={tx.amount > 1000000 ? "text-purple-400 font-bold" : "text-green-400 font-bold"}>
                      {tx.amount > 1000000 ? '🐋 ' : ''}${tx.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="opacity-50 blur-[0.3px]">{tx.asset}</span>
                    <span className="opacity-30">|</span>
                    <span className="text-blue-300 opacity-80">[{tx.from?.slice(0, 4)}..{tx.from?.slice(-4)}]</span>
                    <span className="opacity-40 text-red-500 mx-1">=&gt;</span>
                    <span className="text-blue-300 opacity-80">[{tx.to?.slice(0, 4)}..{tx.to?.slice(-4)}]</span>
                    <a 
                      href={`https://etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-50 hover:opacity-100 hover:text-white ml-1 transition-colors cursor-pointer"
                      title="View on Etherscan"
                    >
                      [ETH_TX]
                    </a>
                  </>
                ) : (
                  <>
                    <span className={tx.amount > 500000 ? "text-purple-400 font-bold" : "text-yellow-400 font-bold"}>
                      {tx.amount > 500000 ? '🐋 ' : ''}${tx.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="opacity-50 blur-[0.3px]">{tx.asset}</span>
                    <span className="opacity-30">|</span>
                    <span className={tx.side === 'buy' ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                      [{tx.side?.toUpperCase()}]
                    </span>
                    <span className="opacity-40 mx-1">@</span>
                    <span className="text-yellow-300 opacity-80">{tx.network}</span>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
