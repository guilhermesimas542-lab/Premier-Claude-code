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
        <h1 className="text-6xl font-bold" style={{ color: "#00FF00", textShadow: "0 0 30px rgba(0,255,0,0.5)" }}>404</h1>
        <p className="text-xl" style={{ color: "#00AA00" }}>Página no encontrada</p>
        <a href="/" className="inline-block px-6 py-3 rounded-xl font-medium transition-all" style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.35)", color: "#00FF00" }}>
          Volver al inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
