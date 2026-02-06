// Cliente Supabase EXTERNO - INFLUENCE PASS
// Este arquivo IGNORA o Lovable Cloud e aponta diretamente para o Supabase do usuário

import { createClient } from '@supabase/supabase-js';

// Credenciais do Supabase externo (INFLUENCE PASS)
// IMPORTANTE: Estas são as credenciais do projeto do usuário, NÃO do Lovable Cloud
export const EXTERNAL_SUPABASE_URL = 'https://kkbmmwzmozzazqtoauua.supabase.co';
export const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrYm1td3ptb3p6YXpxdG9hdXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODc5NTYsImV4cCI6MjA4NTk2Mzk1Nn0.cxKfWF-60ZT30eURjBz6kpdOt02C5jVcVcp57EPP8ow';

// Cliente Supabase externo
export const supabaseExternal = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// URL base para Edge Functions do Supabase externo
export const EXTERNAL_API_BASE_URL = `${EXTERNAL_SUPABASE_URL}/functions/v1`;

// Helper para verificar qual backend está sendo usado
export function getActiveBackendInfo() {
  return {
    url: EXTERNAL_SUPABASE_URL,
    projectRef: 'kkbmmwzmozzazqtoauua',
    name: 'INFLUENCE PASS (Externo)',
  };
}
