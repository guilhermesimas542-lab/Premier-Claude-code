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
          60% {
            transform: translateX(16px) rotate(210deg) scale(1);
            opacity: 1;
          }
          72% {
            transform: translateX(22px) rotate(250deg) scale(0.45);
            opacity: 0;
          }
          73% {
            transform: translateX(-14px) rotate(0deg) scale(1);
            opacity: 0;
          }
          90% {
            transform: translateX(-14px) rotate(0deg) scale(1);
            opacity: 0;
          }
          100% {
            transform: translateX(-14px) rotate(0deg) scale(1);
            opacity: 1;
          }
        }

        @keyframes swoosh-kick {
          0%   { width: 0px; opacity: 0; }
          25%  { width: 0px; opacity: 0; }
          60%  { width: 22px; opacity: 0.55; }
          72%  { width: 0px; opacity: 0; }
          100% { width: 0px; opacity: 0; }
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
          animation: "swoosh-kick 3s ease-in-out infinite",
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
          animation: "ball-kick 3s ease-in-out infinite",
        }}
      >
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
          <circle cx="50" cy="50" r="46" fill="#FFFFFF" />
          <polygon points="50,22 67,35 61,55 39,55 33,35" fill="#1a1a1a" />
          <polygon points="14,18 33,35 14,48 6,28" fill="#1a1a1a" />
          <polygon points="86,18 67,35 86,48 94,28" fill="#1a1a1a" />
          <polygon points="14,82 39,55 19,43 6,64" fill="#1a1a1a" />
          <polygon points="86,82 61,55 81,43 94,64" fill="#1a1a1a" />
          <polygon points="50,92 39,55 61,55 63,85 37,85" fill="#1a1a1a" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="#CCCCCC" strokeWidth="2.5" />
        </svg>
      </div>
    </div>
  );
};

export default AnimatedFootballIcon;
