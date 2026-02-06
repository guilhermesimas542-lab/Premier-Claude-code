import { useEffect, useRef } from 'react';
import { startSession, endSession, heartbeatSession, trackEvent } from '@/lib/api';

const SESSION_KEY = 'premier_session_id';
const HEARTBEAT_INTERVAL = 60000; // 1 minuto

export function useSession() {
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Iniciar sessão ao montar
    const initSession = async () => {
      try {
        const response = await startSession();
        if (response.success && response.session_id) {
          sessionIdRef.current = response.session_id;
          localStorage.setItem(SESSION_KEY, response.session_id);
          
          // Registrar evento de app_open
          await trackEvent('app_open');
          
          // Iniciar heartbeat
          heartbeatIntervalRef.current = setInterval(async () => {
            if (sessionIdRef.current) {
              await heartbeatSession(sessionIdRef.current);
            }
          }, HEARTBEAT_INTERVAL);
        }
      } catch (error) {
        console.error('Erro ao iniciar sessão:', error);
      }
    };

    initSession();

    // Cleanup ao desmontar
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  // Encerrar sessão ao fechar/sair
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (sessionIdRef.current) {
        // Usar sendBeacon para garantir que a requisição seja enviada
        const data = JSON.stringify({ action: 'end', session_id: sessionIdRef.current });
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sessions`,
          new Blob([data], { type: 'application/json' })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const endCurrentSession = async () => {
    if (sessionIdRef.current) {
      try {
        await endSession(sessionIdRef.current);
        localStorage.removeItem(SESSION_KEY);
        sessionIdRef.current = null;
      } catch (error) {
        console.error('Erro ao encerrar sessão:', error);
      }
    }
  };

  return {
    sessionId: sessionIdRef.current,
    endSession: endCurrentSession,
  };
}
