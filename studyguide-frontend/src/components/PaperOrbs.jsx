// Soft drifting gradient "orbs" on the warm paper background — the light-mode
// analog of arcstone's starfield. Pure CSS, perf-friendly, decorative only.
export default function PaperOrbs() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <style>{`
        .orb { position: absolute; border-radius: 50%; filter: blur(72px); }
        .orb-1 {
          width: 540px; height: 540px; top: -140px; left: -110px;
          background: radial-gradient(circle, rgba(13,148,136,0.28), transparent 70%);
          animation: orbFloat1 24s ease-in-out infinite;
        }
        .orb-2 {
          width: 480px; height: 480px; top: 28%; right: -140px;
          background: radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%);
          animation: orbFloat2 28s ease-in-out infinite;
        }
        .orb-3 {
          width: 420px; height: 420px; bottom: -160px; left: 32%;
          background: radial-gradient(circle, rgba(14,165,164,0.20), transparent 70%);
          animation: orbFloat3 32s ease-in-out infinite;
        }
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(70px,46px)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-56px,34px)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(46px,-58px)} }
        @media (prefers-reduced-motion: reduce) { .orb { animation: none; } }
      `}</style>
    </div>
  )
}
