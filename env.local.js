// Local Supabase config for development.
// Paste your Supabase URL and anon key below.
// Example:
//   window.__SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
//   window.__SUPABASE_ANON_KEY = 'ey...';

window.__SUPABASE_URL = 'https://zyjxjpghiiymyuzibmym.supabase.co';
window.__SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5anhqcGdoaWl5bXl1emlibXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTg1OTMsImV4cCI6MjA3NzczNDU5M30.K3oLCK0oNDNZ9RfM3xoyAAkHEGD7BmsNsmM1RxVBb5I';

(function () {
  try {
    // Non-destructive: retain values if set via localStorage
    var url = window.__SUPABASE_URL || localStorage.getItem('SUPABASE_URL') || '';
    var key = window.__SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_ANON_KEY') || '';
    window.__SUPABASE_URL = url;
    window.__SUPABASE_ANON_KEY = key;
  } catch (_) { /* noop */ }
})();
