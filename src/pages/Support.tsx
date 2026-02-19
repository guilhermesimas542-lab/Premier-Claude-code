import { ArrowLeft, User, Mail, Phone, LogOut, CheckCircle, XCircle, MessageCircle, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { clearAuth, isAuthenticated } from "@/lib/auth";
import { getMockUserData, MockUserData, SUPPORT_WHATSAPP_URL } from "@/lib/userMock";
import { BottomNav } from "@/components/BottomNav";

const Support = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<MockUserData | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    // Carrega dados do usuário (mock centralizado)
    const data = getMockUserData();
    setUserData(data);
  }, [navigate]);

  const handleLogout = () => {
    clearAuth();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  const handleOpenSupport = () => {
    window.open(SUPPORT_WHATSAPP_URL, "_blank");
  };

  return (
    <div className="min-h-screen relative overflow-hidden pb-24" style={{ background: "#000000" }}>
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,255,0,0.03)" }} />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: "rgba(0,0,0,0.92)", borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg transition-colors"
              style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.25)" }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: "#00FF00" }} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold" style={{ color: "#FFFFFF" }}>
              Configurações da Conta
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 relative z-10">
        
        {/* Card: Informações Pessoais */}
        <section className="backdrop-blur-sm rounded-2xl p-4 sm:p-5 space-y-4" style={{ background: "rgba(0,15,0,0.6)", border: "1px solid rgba(0,255,0,0.15)" }}>
          <h2 className="text-base sm:text-lg font-semibold" style={{ color: "#FFFFFF" }}>
            Informações Pessoais
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(0,255,0,0.04)", border: "1px solid rgba(0,255,0,0.1)" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,255,0,0.08)" }}>
                <User className="w-4 h-4" style={{ color: "#00FF00" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "#AAAAAA" }}>Nome</p>
                <p className="text-sm font-medium truncate" style={{ color: "#FFFFFF" }}>{userData?.name || "—"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(0,255,0,0.04)", border: "1px solid rgba(0,255,0,0.1)" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,255,0,0.08)" }}>
                <Mail className="w-4 h-4" style={{ color: "#00FF00" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "#AAAAAA" }}>E-mail</p>
                <p className="text-sm font-medium truncate" style={{ color: "#FFFFFF" }}>{userData?.email || "—"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(0,255,0,0.04)", border: "1px solid rgba(0,255,0,0.1)" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,255,0,0.08)" }}>
                <Phone className="w-4 h-4" style={{ color: "#00FF00" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "#AAAAAA" }}>Telefone</p>
                <p className="text-sm font-medium truncate" style={{ color: "#FFFFFF" }}>{userData?.phone || "—"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Card: Status do Plano */}
        <section className="backdrop-blur-sm rounded-2xl p-4 sm:p-5 space-y-4" style={{ background: "rgba(0,15,0,0.6)", border: "1px solid rgba(0,255,0,0.15)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold" style={{ color: "#FFFFFF" }}>
              Status do Plano
            </h2>
            {userData?.plan?.isActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(0,255,0,0.1)", color: "#FFFFFF", border: "1px solid rgba(0,255,0,0.4)" }}>
                <CheckCircle className="w-3 h-3" />
                ATIVO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/40">
                <XCircle className="w-3 h-3" />
                INATIVO
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-sm" style={{ color: "#FFFFFF" }}>
              <span style={{ color: "#AAAAAA" }}>Plano:</span>{" "}
              <span className="font-semibold">{userData?.plan?.name || "—"}</span>
            </p>
            {!userData?.plan?.isActive && (
              <p className="text-xs" style={{ color: "#CCCCCC" }}>
                Para ter acesso às funcionalidades premium, entre em contato com nosso suporte.
              </p>
            )}
          </div>
          
          <button
            onClick={handleOpenSupport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all"
            style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.35)", color: "#FFFFFF", boxShadow: "0 0 15px rgba(0,255,0,0.1)" }}
          >
            <MessageCircle className="w-4 h-4" />
            Falar com Suporte
          </button>
        </section>

        {/* Card: Suporte */}
        <section className="backdrop-blur-sm rounded-2xl p-4 sm:p-5 space-y-4" style={{ background: "rgba(0,15,0,0.6)", border: "1px solid rgba(0,255,0,0.15)" }}>
          <h2 className="text-base sm:text-lg font-semibold" style={{ color: "#FFFFFF" }}>
            Suporte
          </h2>
          <p className="text-sm" style={{ color: "#CCCCCC" }}>
            Precisa de ajuda? Nossa equipe está pronta para atendê-lo. Entre em contato pelo chat de suporte.
          </p>
          <button
            onClick={handleOpenSupport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all"
            style={{ background: "rgba(0,255,0,0.08)", border: "1px solid rgba(0,255,0,0.35)", color: "#FFFFFF" }}
          >
            <Headphones className="w-4 h-4" />
            Abrir Chat de Suporte
          </button>
        </section>

        {/* Card: Sessão */}
        <section className="backdrop-blur-sm rounded-2xl p-4 sm:p-5 space-y-4" style={{ background: "rgba(0,15,0,0.6)", border: "1px solid rgba(0,255,0,0.15)" }}>
          <h2 className="text-base sm:text-lg font-semibold" style={{ color: "#FFFFFF" }}>
            Sessão
          </h2>
          <p className="text-sm" style={{ color: "#CCCCCC" }}>
            Deseja sair da sua conta? Você precisará fazer login novamente para acessar o aplicativo.
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </section>
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
};

export default Support;
