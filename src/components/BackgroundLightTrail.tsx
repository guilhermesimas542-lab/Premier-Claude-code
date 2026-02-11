const BackgroundLightTrail = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        zIndex: 0,
        outline: "6px solid red",
        background: "rgba(255,255,255,0.35)",
      }}
    >
      <style>{`
        @keyframes trailMoveA {
          0%   { transform: translate3d(-20%, -10%, 0) rotate(0deg); }
          50%  { transform: translate3d(10%, 12%, 0) rotate(12deg); }
          100% { transform: translate3d(-20%, -10%, 0) rotate(0deg); }
        }
        @keyframes trailMoveB {
          0%   { transform: translate3d(15%, 20%, 0) rotate(0deg); }
          50%  { transform: translate3d(-10%, -8%, 0) rotate(-10deg); }
          100% { transform: translate3d(15%, 20%, 0) rotate(0deg); }
        }
        @keyframes trailPulse {
          0%,100% { opacity: 0.10; }
          50%     { opacity: 0.22; }
        }
        @media (prefers-reduced-motion: reduce) {
          .trailA, .trailB { animation: none !important; }
        }
      `}</style>

      {/* Trail A */}
      <div
        className="trailA"
        style={{
          position: "absolute",
          width: "70%",
          height: "220px",
          top: "15%",
          left: "-10%",
          background:
            "radial-gradient(ellipse at center, rgba(180,150,255,0.5) 0%, rgba(140,100,255,0.15) 40%, transparent 70%)",
          filter: "blur(30px)",
          borderRadius: "50%",
          opacity: 1,
          animation: "trailMoveA 12s ease-in-out infinite, trailPulse 6s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />

      {/* Trail B */}
      <div
        className="trailB"
        style={{
          position: "absolute",
          width: "55%",
          height: "180px",
          bottom: "18%",
          right: "-8%",
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.35) 0%, rgba(200,180,255,0.1) 40%, transparent 70%)",
          filter: "blur(30px)",
          borderRadius: "50%",
          opacity: 1,
          animation: "trailMoveB 14s ease-in-out infinite, trailPulse 8s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />
    </div>
  );
};

export default BackgroundLightTrail;
