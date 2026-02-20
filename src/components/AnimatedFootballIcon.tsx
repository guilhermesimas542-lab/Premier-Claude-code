const AnimatedFootballIcon = () => {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <style>{`
        @keyframes football-kick {
          0% {
            transform: translateX(-4px) rotate(0deg);
            opacity: 1;
          }
          65% {
            transform: translateX(30px) rotate(210deg);
            opacity: 1;
          }
          80% {
            transform: translateX(38px) rotate(260deg) scale(0.6);
            opacity: 0;
          }
          81% {
            transform: translateX(-4px) rotate(0deg) scale(1);
            opacity: 0;
          }
          100% {
            transform: translateX(-4px) rotate(0deg) scale(1);
            opacity: 0;
          }
        }

        @keyframes swoosh-trail {
          0%   { width: 0; opacity: 0; left: 4px; }
          20%  { width: 0; opacity: 0; left: 4px; }
          65%  { width: 22px; opacity: 0.45; left: 6px; }
          80%  { width: 30px; opacity: 0; left: 10px; }
          81%  { width: 0; opacity: 0; left: 4px; }
          100% { width: 0; opacity: 0; left: 4px; }
        }
      `}</style>

      {/* Swoosh trail */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          height: 3,
          borderRadius: 4,
          background: "linear-gradient(90deg, transparent, rgba(0,255,100,0.6))",
          transform: "translateY(-50%)",
          animation: "swoosh-trail 1.8s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Football SVG */}
      <div
        style={{
          position: "absolute",
          left: 0,
          animation: "football-kick 1.8s ease-in-out infinite",
        }}
      >
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="26" height="26">
          <circle cx="50" cy="50" r="46" fill="#FFFFFF" stroke="#CCCCCC" strokeWidth="2" />
          <polygon points="50,28 65,39 60,57 40,57 35,39" fill="#111111" />
          <polygon points="20,20 35,39 18,50 10,33" fill="#111111" />
          <polygon points="80,20 65,39 82,50 90,33" fill="#111111" />
          <polygon points="20,80 40,57 22,44 10,62" fill="#111111" />
          <polygon points="80,80 60,57 78,44 90,62" fill="#111111" />
          <polygon points="50,88 40,57 60,57 58,82 42,82" fill="#111111" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="#BBBBBB" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
};

export default AnimatedFootballIcon;
