const AnimatedFootballIcon = () => {
  return (
    <div style={{ width: 30, height: 30, animation: "football-spin 2.5s linear infinite" }}>
      <style>{`
        @keyframes football-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="30" height="30">
        {/* White ball base */}
        <circle cx="50" cy="50" r="46" fill="#FFFFFF" stroke="#DDDDDD" strokeWidth="1" />

        {/* Central pentagon (black) */}
        <polygon
          points="50,28 65,39 60,57 40,57 35,39"
          fill="#111111"
        />

        {/* Surrounding patches */}
        {/* Top-left */}
        <polygon points="20,20 35,39 18,50 10,33" fill="#111111" />
        {/* Top-right */}
        <polygon points="80,20 65,39 82,50 90,33" fill="#111111" />
        {/* Bottom-left */}
        <polygon points="20,80 40,57 22,44 10,62" fill="#111111" />
        {/* Bottom-right */}
        <polygon points="80,80 60,57 78,44 90,62" fill="#111111" />
        {/* Bottom */}
        <polygon points="50,88 40,57 60,57 58,82 42,82" fill="#111111" />

        {/* Outer circle border */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="#BBBBBB" strokeWidth="2" />
      </svg>
    </div>
  );
};

export default AnimatedFootballIcon;
