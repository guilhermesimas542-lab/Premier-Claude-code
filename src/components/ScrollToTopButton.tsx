import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 200);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        @keyframes scrollTopUpPulse {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(-3px); opacity: 0.7; }
        }
      `}</style>
      <button
        onClick={handleClick}
        aria-label="Voltar ao topo"
        className="md:hidden"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "calc(64px + env(safe-area-inset-bottom))",
          height: 36,
          background: "#00FF7F",
          color: "#000000",
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          border: "none",
          borderTop: "1px solid rgba(0,0,0,0.15)",
          cursor: "pointer",
          zIndex: 40,
          display: visible ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: visible ? 1 : 0,
          transition: "opacity 200ms ease-out",
          boxShadow: "0 -2px 8px rgba(0, 255, 127, 0.25)",
        }}
      >
        <ChevronUp
          size={16}
          style={{ animation: "scrollTopUpPulse 1.4s ease-in-out infinite" }}
        />
        Voltar ao topo
        <ChevronUp
          size={16}
          style={{ animation: "scrollTopUpPulse 1.4s ease-in-out infinite" }}
        />
      </button>
    </>
  );
}
