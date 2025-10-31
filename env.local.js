// Dev placeholder for local testing.
// This file exists to avoid 404 errors when logistics-planner.html tries to load ../env.local.js
// If you have real Supabase credentials, you can set them here:
//   window.__SUPABASE_URL = 'https://xxxxx.supabase.co';
//   window.__SUPABASE_ANON_KEY = 'eyJ...';
(function(){
  try {
    // Non-destructive: only fill if not already set
    var url = window.__SUPABASE_URL || localStorage.getItem('SUPABASE_URL') || '';
    var key = window.__SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_ANON_KEY') || '';
    window.__SUPABASE_URL = url;
    window.__SUPABASE_ANON_KEY = key;
  } catch (e) {
    // noop
  }
})();

