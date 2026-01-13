// Mock centralizado do usuário para a página de suporte
// Trocar depois pela integração real com backend

export interface MockUserData {
  name: string;
  email: string;
  phone: string;
  plan: {
    name: string;
    isActive: boolean;
  };
}

export const getMockUserData = (): MockUserData => {
  // Tenta pegar dados reais do localStorage
  const storedUser = localStorage.getItem("_user");
  let userMail = "—";
  
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      userMail = parsed?.userMail || "—";
    } catch {
      // Ignora erro de parse
    }
  }

  return {
    name: "—", // Sem nome no sistema atual
    email: userMail,
    phone: "—", // Sem telefone no sistema atual
    plan: {
      name: "Básico", // Placeholder
      isActive: true, // Placeholder
    },
  };
};

// Link de suporte configurável
export const SUPPORT_WHATSAPP_URL = "https://wa.me/5511999999999?text=Olá, preciso de ajuda!";
