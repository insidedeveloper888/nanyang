const { createClient } = require('@supabase/supabase-js');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
    process.exit(1);
  }
  const sb = createClient(url, key);
  const { count, error } = await sb.from('lorry_plates').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Count error:', error.message || error);
    process.exit(1);
  }
  console.log(`lorry_plates total rows: ${count}`);
}

main();