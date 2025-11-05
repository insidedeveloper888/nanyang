// Supabase client and helpers (extracted from logistics-planner.html)
// Provides global functions for backward compatibility
(function () {
  // Global Supabase client
  window.sb = window.sb || null;

  // Initialize Supabase using serverless /api/config first, then local fallback
  async function initSupabase() {
    try {
      // Try serverless config first (Vercel/prod)
      const res = await fetch('/api/config', { cache: 'no-store' });
      const env = await res.json();
      const url = env.SUPABASE_URL || env.url;
      const key = env.SUPABASE_ANON_KEY || env.key;
      if (url && key) {
        // Disable session persistence to avoid localStorage/IndexedDB quota issues
        window.sb = window.supabase.createClient(url, key, { auth: { persistSession: false } });
        window.__SB = window.sb;
        return;
      }
    } catch (_) {
      // fall through to local fallback
    }
    // Local fallback: allow testing without serverless /api/config
    try {
      const url = window.__SUPABASE_URL || localStorage.getItem('SUPABASE_URL');
      const key = window.__SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_ANON_KEY');
      if (url && key) {
        // Disable session persistence to avoid localStorage/IndexedDB quota issues
        window.sb = window.supabase.createClient(url, key, { auth: { persistSession: false } });
        window.__SB = window.sb;
        return;
      }
    } catch (_) { }
  // No Supabase available; continue in local-only mode
  window.sb = null;
  // Removed console warning for production cleanliness
}

  function loadSupabaseLocalConfig() {
    try {
      const url = window.__SUPABASE_URL || localStorage.getItem('SUPABASE_URL') || '';
      const key = window.__SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_ANON_KEY') || '';
      return { url, key };
    } catch (_) { return { url: '', key: '' }; }
  }

  function saveSupabaseLocalConfig(url, key) {
    try {
      localStorage.setItem('SUPABASE_URL', url);
      localStorage.setItem('SUPABASE_ANON_KEY', key);
      window.__SUPABASE_URL = url;
      window.__SUPABASE_ANON_KEY = key;
      return true;
    } catch (e) {
      console.error('Failed to save Supabase local config', e);
      return false;
    }
  }

  function clearSupabaseLocalConfig() {
    try {
      localStorage.removeItem('SUPABASE_URL');
      localStorage.removeItem('SUPABASE_ANON_KEY');
      window.__SUPABASE_URL = '';
      window.__SUPABASE_ANON_KEY = '';
      return true;
    } catch (e) {
      console.error('Failed to clear Supabase local config', e);
      return false;
    }
  }

  async function testSupabaseConnection(url, key) {
    try {
      const client = window.supabase.createClient(url, key);
      const { count, error } = await client.from('config_options').select('*', { count: 'exact', head: true });
      if (!error) return { ok: true };
      return { ok: false, error };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  // Expose globals
  window.initSupabase = window.initSupabase || initSupabase;
  window.loadSupabaseLocalConfig = window.loadSupabaseLocalConfig || loadSupabaseLocalConfig;
  window.saveSupabaseLocalConfig = window.saveSupabaseLocalConfig || saveSupabaseLocalConfig;
  window.clearSupabaseLocalConfig = window.clearSupabaseLocalConfig || clearSupabaseLocalConfig;
  window.testSupabaseConnection = window.testSupabaseConnection || testSupabaseConnection;
})();
