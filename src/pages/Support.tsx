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
    <div className="min-h-screen bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] relative overflow-hidden pb-24">
      {/* Purple glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0D0A1A]/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-purple-300" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-white">
              Configurações da Conta
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 relative z-10">
        
        {/* Card: Informações Pessoais */}
        <section className="bg-[#1A1030]/60 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Informações Pessoais
          </h2>
          
          <div className="space-y-3">
            {/* Nome */}
            <div className="flex items-center gap-3 p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
              <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <User className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-purple-300/70">Nome</p>
                <p className="text-sm font-medium text-white truncate">
                  {userData?.name || "—"}
                </p>
              </div>
            </div>
            
            {/* E-mail */}
            <div className="flex items-center gap-3 p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
              <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Mail className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-purple-300/70">E-mail</p>
                <p className="text-sm font-medium text-white truncate">
                  {userData?.email || "—"}
                </p>
              </div>
            </div>
            
            {/* Telefone */}
            <div className="flex items-center gap-3 p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
              <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Phone className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-purple-300/70">Telefone</p>
                <p className="text-sm font-medium text-white truncate">
                  {userData?.phone || "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Card: Sessão */}
        <section className="bg-[#1A1030]/60 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Sessão
          </h2>
          
          <p className="text-sm text-purple-300/70">
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

        {/* Card: Status do Plano */}
        <section className="bg-[#1A1030]/60 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Status do Plano
            </h2>
            
            {/* Badge de status */}
            {userData?.plan?.isActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/40">
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
            <p className="text-sm text-white">
              <span className="text-purple-300/70">Plano:</span>{" "}
              <span className="font-semibold">{userData?.plan?.name || "—"}</span>
            </p>
            
            {!userData?.plan?.isActive && (
              <p className="text-xs text-purple-300/60">
                Para ter acesso às funcionalidades premium, entre em contato com nosso suporte.
              </p>
            )}
          </div>
          
          <button
            onClick={handleOpenSupport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com Suporte
          </button>
        </section>

        {/* Card: Suporte */}
        <section className="bg-[#1A1030]/60 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Suporte
          </h2>
          
          <p className="text-sm text-purple-300/70">
            Precisa de ajuda? Nossa equipe está pronta para atendê-lo. Entre em contato pelo chat de suporte.
          </p>
          
          <button
            onClick={handleOpenSupport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors font-medium"
          >
            <Headphones className="w-4 h-4" />
            Abrir Chat de Suporte
          </button>
        </section>
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
};

export default Support;
