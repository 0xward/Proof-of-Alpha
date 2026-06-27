import { useCallback } from 'react';
import { Share2 } from 'lucide-react';

interface ShareCardProps {
  score: number;
  tier: string;          // "God Mode" | "Elite Scout" | "Initiate"
  verdict: string;
  txHash: string;
  wallet: string;
}

// ─── Draw card to canvas and trigger share ──────────────────────────────────
function drawCard(canvas: HTMLCanvasElement, props: ShareCardProps) {
  const { score, tier, verdict, txHash, wallet } = props;
  const W = 1200, H = 630;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,184,0,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Border
  ctx.strokeStyle = 'rgba(255,184,0,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Corner accents
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 30);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 30, y);
    ctx.stroke();
  };
  ctx.strokeStyle = '#FFB800';
  ctx.lineWidth = 3;
  corner(24, 24, 1, 1);
  corner(W - 24, 24, -1, 1);
  corner(24, H - 24, 1, -1);
  corner(W - 24, H - 24, -1, -1);

  // Brand tag
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = 'rgba(255,184,0,0.3)';
  ctx.fillText('PROOF OF ALPHA // FORENSIC TERMINAL', 48, 64);

  // Score
  ctx.font = 'bold 180px monospace';
  const tierColor = score >= 76 ? '#FFB800' : score >= 41 ? '#a78bfa' : '#94a3b8';
  ctx.fillStyle = tierColor;
  ctx.textAlign = 'right';
  ctx.fillText(String(score), W - 48, H / 2 + 60);

  // /100
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = 'rgba(255,184,0,0.3)';
  ctx.fillText('/100', W - 48, H / 2 + 115);

  // Tier badge
  ctx.textAlign = 'left';
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = tierColor;
  ctx.fillText(tier.toUpperCase(), 48, H / 2 - 20);

  // Verdict (wrapped)
  ctx.font = '18px monospace';
  ctx.fillStyle = 'rgba(255,184,0,0.55)';
  const words = verdict.split(' ');
  let line = '';
  let y = H / 2 + 30;
  const maxW = W * 0.55;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line !== '') {
      ctx.fillText('>> ' + line.trim(), 48, y);
      line = word + ' ';
      y += 28;
      if (y > H - 120) break;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText('>> ' + line.trim(), 48, y);

  // Wallet + tx
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,184,0,0.2)';
  ctx.fillText(`WALLET: ${wallet.slice(0, 10)}...${wallet.slice(-6)}`, 48, H - 70);
  ctx.fillText(`TX: ${txHash.slice(0, 20)}...${txHash.slice(-10)}`, 48, H - 48);

  // proofofal.pha watermark (bottom right)
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = 'rgba(255,184,0,0.15)';
  ctx.fillText('proofofal.pha', W - 48, H - 48);
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ShareCardButton(props: ShareCardProps) {
  const handleShare = useCallback(() => {
    const canvas = document.createElement('canvas');
    drawCard(canvas, props);

    canvas.toBlob(blob => {
      if (!blob) return fallbackShare(props);

      // Try Web Share API (MiniPay / mobile)
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'alpha.png', { type: 'image/png' })] })) {
        navigator
          .share({
            files: [new File([blob], 'proof-of-alpha.png', { type: 'image/png' })],
            title: `My Alpha Score: ${props.score}/100`,
            text: `I scored ${props.score}/100 on Proof of Alpha — ${props.tier}. Analyze your transactions at proofofal.pha`,
          })
          .catch(() => fallbackShare(props));
      } else {
        // Desktop: download image + open tweet
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proof-of-alpha-${props.score}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        setTimeout(() => fallbackShare(props), 500);
      }
    }, 'image/png');
  }, [props]);

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-5 py-2.5 border border-[#FFB800]/40 text-[#FFB800] font-black uppercase tracking-widest text-[10px] hover:bg-[#FFB800]/10 active:scale-95 transition-all font-mono"
    >
      <Share2 className="w-3.5 h-3.5" />
      SHARE CARD
    </button>
  );
}

function fallbackShare(props: ShareCardProps) {
  const text = `I scored ${props.score}/100 on Proof of Alpha — Tier: ${props.tier}\n\n>> ${props.verdict}\n\nProve your alpha on-chain 👇`;
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    '_blank'
  );
}
