const AnimatedFootballIcon = () => {
  return (
    <div
      style={{
        width: 44,
        height: 34,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes foot-anim {
          0%   { transform: translateX(-30px) rotate(-28deg); }
          30%  { transform: translateX(-5px)  rotate(-12deg); }
          44%  { transform: translateX(4px)   rotate(24deg);  }
          58%  { transform: translateX(-12px) rotate(2deg);   }
          72%  { transform: translateX(-30px) rotate(-28deg); }
          100% { transform: translateX(-30px) rotate(-28deg); }
        }

        @keyframes ball-anim {
          0%   { transform: translateY(-50%) scale(1); }
          44%  { transform: translateY(-50%) scale(0.82, 1.12); }
          52%  { transform: translateY(-50%) scale(1.08); }
          60%  { transform: translateY(-50%) scale(1); }
          100% { transform: translateY(-50%) scale(1); }
        }

        @keyframes flash-anim {
          0%, 42% { opacity: 0; transform: translateY(-50%) scale(0.4); }
          46%     { opacity: 0.7; transform: translateY(-50%) scale(1);  }
          58%     { opacity: 0;   transform: translateY(-50%) scale(1.7);}
          100%    { opacity: 0;   transform: translateY(-50%) scale(0.4);}
        }
      `}</style>

      {/* Ball — right side, vertically centered */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: 2,
          animation: "ball-anim 3s ease-in-out infinite",
          zIndex: 2,
        }}
      >
        <svg viewBox="0 0 100 100" width="24" height="24">
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

      {/* Impact flash */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: 2,
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,80,0.75) 0%, transparent 70%)",
          animation: "flash-anim 3s ease-out infinite",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* Foot / Boot */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 6,
          marginTop: -8,
          animation: "foot-anim 3s ease-in-out infinite",
          transformOrigin: "right center",
          zIndex: 4,
        }}
      >
        <svg viewBox="0 0 30 17" width="30" height="17">
          {/* Boot body */}
          <path
            d="M2,11 Q2,2 7,2 L20,2 Q24,2 28,7 L28,13 Q28,16 25,16 L4,16 Q2,16 2,13 Z"
            fill="#002a00"
            stroke="#00AA00"
            strokeWidth="1"
          />
          {/* Neon toe cap */}
          <path
            d="M20,2 Q25,2 28,7 L28,13 Q28,16 25,16 L19,16 L19,2 Z"
            fill="#007700"
            stroke="#00FF00"
            strokeWidth="0.8"
          />
          {/* Sole */}
          <rect x="1" y="14" width="27" height="3.5" rx="1.8" fill="#001400" />
          {/* Laces */}
          <line x1="7" y1="5" x2="17" y2="5" stroke="#00EE00" strokeWidth="0.8" opacity="0.8" strokeDasharray="2,1.5" />
          <line x1="7" y1="8" x2="17" y2="8" stroke="#00EE00" strokeWidth="0.8" opacity="0.5" strokeDasharray="2,1.5" />
          {/* Studs */}
          <circle cx="5"  cy="17.5" r="1.2" fill="#004400" />
          <circle cx="11" cy="17.5" r="1.2" fill="#004400" />
          <circle cx="17" cy="17.5" r="1.2" fill="#004400" />
          <circle cx="23" cy="17.5" r="1.2" fill="#004400" />
        </svg>
      </div>
    </div>
  );
};

export default AnimatedFootballIcon;
