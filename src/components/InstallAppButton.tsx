import { useState } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InstallAppButtonProps {
  variant?: 'header' | 'mobile-menu';
}

export const InstallAppButton = ({ variant = 'header' }: InstallAppButtonProps) => {
  const { isInstalled, isIOS, showFallback, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleClick = async () => {
    if (showFallback) {
      setShowIOSModal(true);
      return;
    }

    await promptInstall();
  };

  // Always show button - behavior changes based on support
  const showAsInstalled = isInstalled;

  const baseStyles = `
    inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium
    transition-all duration-200 ease-out
    border border-[#00FF7F]/60
    ${showAsInstalled 
      ? 'bg-[#060606]/60 text-[#00FF7F]/60 cursor-default border-[#00FF7F]/30' 
      : 'bg-[#060606]/80 text-[#00FF7F] hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(0,255,127,0.3)] hover:border-[#00FF7F] cursor-pointer'
    }
  `;

  const mobileStyles = variant === 'mobile-menu' 
    ? 'w-full justify-center py-3 text-sm' 
    : '';

  return (
    <>
      <button
        onClick={showAsInstalled ? undefined : handleClick}
        disabled={showAsInstalled}
        className={`${baseStyles} ${mobileStyles}`}
      >
        {showAsInstalled ? (
          <>
            <Check className="w-4 h-4" />
            <span>App instalado</span>
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4" />
            <span>Instalar app</span>
          </>
        )}
      </button>

      {/* iOS Instructions Modal */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent className="bg-[#0C0F14] border-border/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-bold flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#00FF7F]" />
              Instalar Premier Ultra
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Para instalar o app no seu iPhone ou iPad:
            </p>
            
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00FF7F]/20 text-[#00FF7F] flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span className="text-foreground">
                  Toque no botão <strong className="text-[#00FF7F]">Compartilhar</strong> (ícone de quadrado com seta para cima) na barra do Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00FF7F]/20 text-[#00FF7F] flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span className="text-foreground">
                  Role para baixo e toque em <strong className="text-[#00FF7F]">"Adicionar à Tela de Início"</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00FF7F]/20 text-[#00FF7F] flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span className="text-foreground">
                  Confirme tocando em <strong className="text-[#00FF7F]">"Adicionar"</strong>
                </span>
              </li>
            </ol>

            <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
              Instale o atalho do Premier Ultra na tela inicial e volte pro app em 1 toque.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
