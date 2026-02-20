import robotImage from "@/assets/robot-football.png";

const AnimatedFootballIcon = () => {
  return (
    <div
      style={{
        width: 90,
        height: 90,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`
        @keyframes ball-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes robot-bob {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-1px) scale(1.01); }
        }
        @keyframes ball-glow-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* Robot image fills the container */}
      <img
        src={robotImage}
        alt="Robot mascot"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center top",
          animation: "robot-bob 2.4s ease-in-out infinite",
          display: "block",
        }}
      />

      {/* Spinning ball overlay — positioned top-left where the ball is in the image */}
      <div
        style={{
          position: "absolute",
          top: 1,
          left: 1,
          width: 20,
          height: 20,
          borderRadius: "50%",
          animation: "ball-spin 1.2s linear infinite",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <svg viewBox="0 0 100 100" width="20" height="20">
          {/* Ball base */}
          <circle cx="50" cy="50" r="48" fill="#FFFFFF" />
          {/* Pentagon patches — rotated each frame by CSS */}
          <polygon points="50,10 68,26 62,48 38,48 32,26" fill="#111111" />
          <polygon points="10,38 32,26 38,48 18,62 4,48"   fill="#111111" />
          <polygon points="90,38 68,26 62,48 82,62 96,48"  fill="#111111" />
          <polygon points="22,84 38,48 18,62 6,80 16,94"   fill="#111111" />
          <polygon points="78,84 62,48 82,62 94,80 84,94"  fill="#111111" />
          <polygon points="50,96 38,48 62,48 60,90 40,90"  fill="#111111" />
          {/* Neon green seam lines */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="#00FF44" strokeWidth="2.5" opacity="0.7" />
          <line x1="50" y1="2" x2="50" y2="98" stroke="#00FF44" strokeWidth="0.8" opacity="0.3" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="#00FF44" strokeWidth="0.8" opacity="0.3" />
        </svg>
      </div>

      {/* Subtle neon glow ring at ball position */}
      <div
        style={{
          position: "absolute",
          top: -1,
          left: -1,
          width: 22,
          height: 22,
          borderRadius: "50%",
          boxShadow: "0 0 6px rgba(0,255,68,0.7)",
          animation: "ball-glow-pulse 1.2s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export default AnimatedFootballIcon;
