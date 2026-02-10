// Mock centralizado do usuário para a página de suporte
import { mockGetUser } from "@/mocks/user";

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
  const user = mockGetUser();

  return {
    name: "—",
    email: user?.email || "—",
    phone: "—",
    plan: {
      name: "Ultra",
      isActive: true,
    },
  };
};

// Link de suporte configurável
export const SUPPORT_WHATSAPP_URL = "https://wa.me/5511999999999?text=Olá, preciso de ajuda!";
