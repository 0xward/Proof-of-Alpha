export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#FFB800] font-mono px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-[10px] uppercase tracking-widest text-[#FFB800]/40 hover:text-[#FFB800] transition-colors mb-8 inline-block">
          ← BACK TO APP
        </a>

        <div className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest mb-2">// LEGAL</div>
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">PRIVACY POLICY</h1>
        <p className="text-[10px] text-[#FFB800]/30 uppercase tracking-widest mb-12">
          LAST UPDATED: JUNE 2026 // TERMINAL_V2.0.0
        </p>

        <div className="space-y-10 text-sm text-[#FFB800]/70 leading-relaxed">
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3 border-b border-[#FFB800]/20 pb-2">
              1. OVERVIEW
            </h2>
            <p>
              Proof of Alpha ("we", "us", "the Service") is committed to protecting your privacy.
              This Privacy Policy explains what data we collect, how we use it, and what we do not do with it.
              Because this is a blockchain-based application, some data is inherently public by nature.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3 border-b border-[#FFB800]/20 pb-2">
              2. DATA WE COLLECT
            </h2>
            <p className="mb-3">The following data is processed when you use the Service:</p>
            <div className="space-y-4">
              <div className="border border-[#FFB800]/20 p-4 bg-[#0a0a0a]">
                <div className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">WALLET ADDRESS (PUBLIC)</div>
                <p className="text-xs text-[#FFB800]/50">
                  Your wallet address is a public blockchain identifier. It is used to display your connected
                  wallet in the UI and to send your minted SBT to the correct address. We do not associate
                  your wallet address with any personally identifiable information.
                </p>
              </div>
              <div className="border border-[#FFB800]/20 p-4 bg-[#0a0a0a]">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#FFB800] mb-1">TRANSACTION HASH (SUBMITTED)</div>
                <p className="text-xs text-[#FFB800]/50">
                  When you submit a transaction hash for analysis, it is sent to our server and to the
                  Groq AI API for processing. Transaction hashes are public blockchain data. We may temporarily
                  cache analysis results server-side to improve performance and reduce redundant AI calls.
                </p>
              </div>
              <div className="border border-[#FFB800]/20 p-4 bg-[#0a0a0a]">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#FFB800] mb-1">ANALYSIS HISTORY (LOCAL)</div>
                <p className="text-xs text-[#FFB800]/50">
                  Your recent analysis history (transaction hashes and scores) is stored locally in your
                  browser's localStorage. This data never leaves your device and is not transmitted to our servers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3 border-b border-[#FFB800]/20 pb-2">
              3. DATA WE DO NOT COLLECT
            </h2>
            <p className="mb-3">We explicitly do not collect:</p>
            <ul className="list-none space-y-2 text-[#FFB800]/50 pl-4">
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">Private keys or seed phrases — never, under any circumstances</li>
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">Names, email addresses, or any personal identification information</li>
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">IP addresses or device fingerprints for tracking purposes</li>
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">Cookies or cross-site tracking identifiers</li>
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">Financial account information of any kind</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3 border-b border-[#FFB800]/20 pb-2">
              4. HOW WE USE YOUR DATA
            </h2>
            <p className="mb-3">Data collected is used exclusively to:</p>
            <ul className="list-none space-y-2 text-[#FFB800]/50 pl-4">
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">Process transaction hash analysis requests via the Groq AI API</li>
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">Cache analysis results to reduce server load and improve response times</li>
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">Facilitate on-chain SBT minting on the Celo Mainnet</li>
            </ul>
            <p className="mt-3">
              We do not sell, rent, or trade any data to third parties. Cached analysis data is not used for
              advertising, profiling, or any purpose beyond operational necessity.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3 border-b border-[#FFB800]/20 pb-2">
              5. THIRD-PARTY SERVICES
            </h2>
            <p className="mb-3">The Service integrates with the following third-party providers:</p>
            <ul className="list-none space-y-2 text-[#FFB800]/50 pl-4">
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">
                <strong className="text-[#FFB800]/70">Groq API</strong> — receives transaction hashes for AI analysis.
                Subject to Groq's own privacy policy at groq.com.
              </li>
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">
                <strong className="text-[#FFB800]/70">Reown / WalletConnect</strong> — used for wallet connections on desktop.
                Subject to Reown's privacy policy.
              </li>
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">
                <strong className="text-[#FFB800]/70">Pinata / IPFS</strong> — hosts NFT metadata and images.
                Content is publicly accessible by design.
              </li>
              <li className="before:content-['//'] before:mr-2 before:text-[#FFB800]/30">
                <strong className="text-[#FFB800]/70">Celo Mainnet RPC (forno.celo.org)</strong> — used for blockchain read/write operations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3 border-b border-[#FFB800]/20 pb-2">
              6. BLOCKCHAIN DATA — INHERENTLY PUBLIC
            </h2>
            <p>
              Any SBT you mint is recorded permanently on the Celo blockchain and is publicly visible.
              Your wallet address, token ID, and metadata URI are public on-chain data. This is by design —
              the purpose of Proof of Alpha is to create a verifiable, public on-chain credential.
              We cannot delete or modify on-chain records.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3 border-b border-[#FFB800]/20 pb-2">
              7. DATA RETENTION
            </h2>
            <p>
              Server-side cached analysis data is retained for a limited period for performance purposes and
              may be purged at any time. LocalStorage data (your analysis history) is stored only in your
              browser and can be cleared by you at any time through your browser settings or within the app.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3 border-b border-[#FFB800]/20 pb-2">
              8. YOUR RIGHTS AND DATA REQUESTS
            </h2>
            <p>
              Given that we collect minimal identifying data, most data requests may be addressed by clearing
              your browser storage. For questions about data held server-side, or to request deletion of any
              cached data associated with a transaction hash or wallet address, contact us at:
            </p>
            <p className="mt-3">
              <a href="mailto:support@proofofal.pha" className="text-[#FFB800] hover:underline">
                support@proofofal.pha
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFB800] mb-3 border-b border-[#FFB800]/20 pb-2">
              9. CHANGES TO THIS POLICY
            </h2>
            <p>
              We may update this Privacy Policy at any time. Changes will be posted on this page with an
              updated date. Continued use of the Service following any changes constitutes acceptance of
              the revised policy.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-[#FFB800]/20 text-center text-[10px] text-white/20 uppercase tracking-widest">
          © 2026 PROOF OF ALPHA // TERMINAL_V2.0.0
        </div>
      </div>
    </div>
  );
}
