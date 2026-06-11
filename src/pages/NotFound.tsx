import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#000000" }}>
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold" style={{ color: "#eac064", textShadow: "0 0 30px rgba(234, 192, 100,0.5)" }}>404</h1>
        <p className="text-xl" style={{ color: "#00AA00" }}>Página não encontrada</p>
        <a href="/" className="inline-block px-6 py-3 rounded-xl font-medium transition-all" style={{ background: "rgba(234, 192, 100,0.08)", border: "1px solid rgba(234, 192, 100,0.35)", color: "#eac064" }}>
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
