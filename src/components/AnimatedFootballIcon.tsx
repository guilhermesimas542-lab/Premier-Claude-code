const AnimatedFootballIcon = () => {
  return (
    <div style={{ width: 44, height: 44, position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes leg-kick {
          0%   { transform: translateX(-44px) rotate(-40deg); }
          30%  { transform: translateX(-16px) rotate(-20deg); }
          44%  { transform: translateX(-2px)  rotate(28deg);  }
          57%  { transform: translateX(-24px) rotate(-6deg);  }
          72%  { transform: translateX(-44px) rotate(-40deg); }
          100% { transform: translateX(-44px) rotate(-40deg); }
        }

        @keyframes ball-fly {
          0%   { transform: translate(0,0) scale(1);            opacity: 1; }
          40%  { transform: translate(0,0) scale(1);            opacity: 1; }
          43%  { transform: translate(0,0) scale(0.82, 1.14);   opacity: 1; }
          52%  { transform: translate(12px,-18px) scale(0.72);  opacity: 0.65; }
          63%  { transform: translate(34px,-42px) scale(0.3);   opacity: 0; }
          64%  { transform: translate(0,0) scale(0.3);          opacity: 0; }
          78%  { transform: translate(0,0) scale(1.08);         opacity: 0.9; }
          86%  { transform: translate(0,0) scale(1);            opacity: 1; }
          100% { transform: translate(0,0) scale(1);            opacity: 1; }
        }

        @keyframes kick-glow {
          0%, 41% { opacity: 0; transform: scale(0.4); }
          46%     { opacity: 0.8; transform: scale(1);  }
          57%     { opacity: 0;   transform: scale(2);  }
          100%    { opacity: 0;   transform: scale(0.4);}
        }

        @keyframes swoosh-leg {
          0%, 30% { opacity: 0; width: 0; }
          44%     { opacity: 0.6; width: 18px; }
          55%     { opacity: 0; width: 0; }
          100%    { opacity: 0; width: 0; }
        }
      `}</style>

      {/* Ball */}
      <div
        style={{
          position: "absolute",
          top: 11,
          left: 16,
          animation: "ball-fly 3s ease-in-out infinite",
          zIndex: 2,
        }}
      >
        <svg viewBox="0 0 100 100" width="22" height="22">
          <circle cx="50" cy="50" r="46" fill="#FFFFFF" />
          <polygon points="50,22 67,35 61,55 39,55 33,35" fill="#1a1a1a" />
          <polygon points="14,18 33,35 14,48 6,28"       fill="#1a1a1a" />
          <polygon points="86,18 67,35 86,48 94,28"       fill="#1a1a1a" />
          <polygon points="14,82 39,55 19,43 6,64"        fill="#1a1a1a" />
          <polygon points="86,82 61,55 81,43 94,64"       fill="#1a1a1a" />
          <polygon points="50,92 39,55 61,55 63,85 37,85" fill="#1a1a1a" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="#CCCCCC" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Impact glow */}
      <div
        style={{
          position: "absolute",
          top: 11,
          left: 16,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,80,0.85) 0%, transparent 70%)",
          animation: "kick-glow 3s ease-out infinite",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* Swoosh trail */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 14,
          height: 2.5,
          borderRadius: 4,
          background: "linear-gradient(90deg, transparent, rgba(0,255,80,0.65))",
          animation: "swoosh-leg 3s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Full Leg + Boot */}
      <div
        style={{
          position: "absolute",
          top: 2,
          left: 0,
          transformOrigin: "12px 0px",
          animation: "leg-kick 3s ease-in-out infinite",
          zIndex: 4,
        }}
      >
        <svg viewBox="0 0 26 52" width="26" height="52">
          {/* Thigh */}
          <rect x="5" y="0" width="13" height="23" rx="6.5"
                fill="#1a3520" stroke="#00AA00" strokeWidth="0.8" />

          {/* Knee joint */}
          <ellipse cx="12" cy="23" rx="5" ry="4"
                   fill="#122812" stroke="#009900" strokeWidth="0.8" />

          {/* Shin */}
          <rect x="7" y="23" width="11" height="16" rx="4.5"
                fill="#1a3520" stroke="#00AA00" strokeWidth="0.8" />

          {/* Boot body */}
          <path d="M4,38 Q4,31 8,31 L18,31 Q22,31 22,36 L22,42 Q22,45 19,45 L6,45 Q4,45 4,42 Z"
                fill="#002200" stroke="#00AA00" strokeWidth="1" />

          {/* Neon toe cap */}
          <path d="M16,31 Q21,31 22,36 L22,42 Q22,45 19,45 L15,45 L15,31 Z"
                fill="#006600" stroke="#00FF00" strokeWidth="0.8" />

          {/* Sole */}
          <rect x="3" y="43.5" width="19.5" height="3.2" rx="1.6" fill="#001100" />

          {/* Laces */}
          <line x1="7" y1="34" x2="14" y2="34" stroke="#00EE00" strokeWidth="0.75"
                opacity="0.85" strokeDasharray="1.5,1" />
          <line x1="7" y1="37.5" x2="14" y2="37.5" stroke="#00EE00" strokeWidth="0.75"
                opacity="0.55" strokeDasharray="1.5,1" />

          {/* Studs */}
          <circle cx="6"  cy="46.7" r="1.1" fill="#004400" />
          <circle cx="11" cy="46.7" r="1.1" fill="#004400" />
          <circle cx="16" cy="46.7" r="1.1" fill="#004400" />
          <circle cx="21" cy="46.7" r="1.1" fill="#004400" />
        </svg>
      </div>
    </div>
  );
};

export default AnimatedFootballIcon;
