import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Preview from "./pages/Preview";

/**
 * Router de desenvolvimento — só serve pra eu (Claude) ver o resultado.
 * Em produção, o `<OnboardingModal />` é montado direto no `Home.tsx` do app.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/preview" element={<Preview />} />
        <Route path="*" element={<Navigate to="/preview" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
