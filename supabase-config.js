// ============================================================================
// CONFIGURAÇÃO DO SUPABASE — SISTEMA DE DEMANDAS / DFD (IAD / UFJF)
// Conexão unificada com o projeto da Secretaria Virtual do IAD
// ============================================================================

const SUPABASE_URL = 'https://ctjntgierhsjxuwkiyzz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0am50Z2llcmhzanh1d2tpeXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDA3NzQsImV4cCI6MjA4NDYxNjc3NH0.NnEUMEQkhJXV2816-h2k1ElhjmkSWJ-mYfnu_hs8CL8';

// Exporta globalmente para uso direto em fetch
if (typeof window !== 'undefined') {
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_KEY = SUPABASE_KEY;
}

// Inicialização segura do cliente Supabase
if (typeof window !== 'undefined') {
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      console.log('✓ Supabase conectado com sucesso! (Projeto ctjntgierhsjxuwkiyzz)');
    } else {
      console.warn('Biblioteca Supabase JS ainda não carregada no escopo global.');
      window.supabaseClient = null;
    }
  } catch (err) {
    console.error('Erro ao inicializar Supabase:', err);
    window.supabaseClient = null;
  }
}
