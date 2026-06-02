// Mock Sports Data - Dados locais sem backend

export interface MockSport {
  id: number;
  name: string;
  enabled: boolean;
  isproplan: boolean;
  background: string;
  tipo: number; // 0 = premium, 1 = em desenvolvimento, 2 = pré-venda
}

export const MOCK_SPORTS: MockSport[] = [
  { id: 1, name: "Fútbol", enabled: true, isproplan: false, background: "cyberbet_3ef04120-9b39-44f5-9e4e-0127a76326bb", tipo: 0 },
  { id: 2, name: "MMA", enabled: true, isproplan: false, background: "cyberbet_76a934f8-71c1-41a2-a9fe-93c36359dd7f", tipo: 1 },
  { id: 3, name: "Baloncesto", enabled: true, isproplan: false, background: "cyberbet_20d5c209-1849-49d0-9475-4eabf2541b07", tipo: 1 },
  { id: 4, name: "Tenis", enabled: true, isproplan: false, background: "cyberbet_75203e34-3699-4203-9063-24bb8b805083", tipo: 1 },
  { id: 5, name: "Futsal", enabled: true, isproplan: false, background: "cyberbet_3164bd85-f9f8-4113-b776-fb37acf872a3", tipo: 1 },
  { id: 6, name: "Vóley", enabled: true, isproplan: false, background: "cyberbet_55e38087-eeb7-4031-9a11-a326b50db79f", tipo: 1 },
  { id: 8, name: "Hockey", enabled: true, isproplan: false, background: "cyberbet_255695b8-2046-4b5b-b6c5-17e7bb5e3df2", tipo: 1 },
  { id: 9, name: "E-Sports", enabled: true, isproplan: false, background: "cyberbet_3ef04120-9b39-44f5-9e4e-0127a76326bb", tipo: 1 },
  { id: 12, name: "Premier Ultra - IA", enabled: true, isproplan: false, background: "futsal-custom", tipo: 1 },
];
