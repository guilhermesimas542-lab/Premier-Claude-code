const AnimatedFootballIcon = () => {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`
        @keyframes ball-kick {
          0% {
            transform: translateX(-14px) rotate(0deg) scale(1);
            opacity: 1;
          }
          55% {
            transform: translateX(16px) rotate(200deg) scale(1);
            opacity: 1;
          }
          68% {
            transform: translateX(22px) rotate(240deg) scale(0.5);
            opacity: 0;
          }
          69% {
            transform: translateX(-14px) rotate(0deg) scale(1);
            opacity: 0;
          }
          85% {
            transform: translateX(-14px) rotate(0deg) scale(1);
            opacity: 0;
          }
          100% {
            transform: translateX(-14px) rotate(0deg) scale(1);
            opacity: 1;
          }
        }

        @keyframes goal-pop {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          68%  { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          72%  { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
          77%  { opacity: 1; transform: translate(-50%, -50%) scale(0.95); }
          80%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          85%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          93%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          99%  { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
        }

        @keyframes swoosh-kick {
          0%   { width: 0; opacity: 0; }
          20%  { width: 0; opacity: 0; }
          55%  { width: 20px; opacity: 0.5; }
          68%  { width: 0; opacity: 0; }
          100% { width: 0; opacity: 0; }
        }
      `}</style>

      {/* Swoosh trail */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 2,
          height: 2.5,
          borderRadius: 4,
          background: "linear-gradient(90deg, transparent, rgba(0,255,80,0.7))",
          transform: "translateY(-50%)",
          animation: "swoosh-kick 2s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Football SVG */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          animation: "ball-kick 2s ease-in-out infinite",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
        >
          {/* White ball */}
          <circle cx="50" cy="50" r="46" fill="#FFFFFF" />

          {/* Central pentagon */}
          <polygon points="50,22 67,35 61,55 39,55 33,35" fill="#1a1a1a" />

          {/* Top-left patch */}
          <polygon points="14,18 33,35 14,48 6,28" fill="#1a1a1a" />

          {/* Top-right patch */}
          <polygon points="86,18 67,35 86,48 94,28" fill="#1a1a1a" />

          {/* Bottom-left patch */}
          <polygon points="14,82 39,55 19,43 6,64" fill="#1a1a1a" />

          {/* Bottom-right patch */}
          <polygon points="86,82 61,55 81,43 94,64" fill="#1a1a1a" />

          {/* Bottom-center patch */}
          <polygon points="50,92 39,55 61,55 63,85 37,85" fill="#1a1a1a" />

          {/* Outer border */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="#CCCCCC" strokeWidth="2.5" />
        </svg>
      </div>

      {/* GOAL! text */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          animation: "goal-pop 2s ease-out infinite",
          pointerEvents: "none",
          zIndex: 10,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 900,
            color: "#00FF00",
            textShadow:
              "0 0 8px rgba(0,255,0,0.9), 0 0 16px rgba(0,255,0,0.5), 1px 1px 0 #004400, -1px -1px 0 #004400",
            letterSpacing: "0.05em",
            fontFamily: "Arial Black, Arial, sans-serif",
          }}
        >
          GOAL!
        </span>
      </div>
    </div>
  );
};

export default AnimatedFootballIcon;
