import { Outlet } from "react-router-dom";

/**
 * Moldura do app para o usuário final.
 *
 * MOBILE: não muda NADA — as classes `md:` não se aplicam, então cada tela
 * ocupa a largura inteira, exatamente como antes.
 *
 * DESKTOP (>=768px): centraliza o app numa coluna com largura de celular
 * (~480px), com fundo escuro nas laterais e uma sombra sutil. O app deixa de
 * ficar esticado/largo e vira uma coluna central elegante — e como a coluna
 * limita a largura, todas as telas ficam contidas de uma vez (não precisa
 * ajustar `max-w` tela por tela).
 *
 * Modais (`fixed inset-0`) e a barra inferior fixa NÃO ficam presos a esta
 * coluna de propósito: os modais cobrem a viewport toda e a BottomNav se
 * recentraliza sozinha no desktop (ver BottomNav.tsx).
 */
export function UserShell() {
  return (
    <div className="md:flex md:justify-center md:min-h-screen md:bg-black">
      <div className="relative w-full md:max-w-[480px] md:min-h-screen md:bg-[#060D1E] md:shadow-[0_0_80px_rgba(0,0,0,0.7)]">
        <Outlet />
      </div>
    </div>
  );
}
