const { createClient } = require('@supabase/supabase-js');

async function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
    process.exit(1);
  }
  const sb = createClient(url, key);

  try {
    // 1) Fetch current plates from lorry_plates
    const lp = await sb.from('lorry_plates').select('plate_no');
    if (lp.error) throw lp.error;
    const plates = Array.from(new Set((lp.data || []).map(r => String(r.plate_no).trim()).filter(Boolean)));

    // 2) Fetch existing config_options for lorry_plate
    const co = await sb.from('config_options').select('category,name,active');
    if (co.error) throw co.error;
    const existingActive = new Set((co.data || [])
      .filter(r => r.category === 'lorry_plate' && r.active)
      .map(r => r.name));

    // 3) Compute deactivations for names not present in lorry_plates
    const desiredSet = new Set(plates);
    const toDeactivate = Array.from(existingActive).filter(name => !desiredSet.has(name));

    // 4) Upsert all desired as active rows in config_options
    const rows = plates.map(name => ({ category: 'lorry_plate', name, active: true }));
    if (rows.length) {
      const up = await sb.from('config_options').upsert(rows, { onConflict: 'category,name' });
      if (up.error) throw up.error;
    }

    // 5) Deactivate removed ones in batched updates
    for (const names of await chunkArray(toDeactivate, 50)) {
      if (!names.length) continue;
      const upd = await sb
        .from('config_options')
        .update({ active: false })
        .eq('category', 'lorry_plate')
        .in('name', names);
      if (upd.error) throw upd.error;
    }

    console.log(`Mirrored ${plates.length} plate(s) into config_options. Deactivated ${toDeactivate.length}.`);
  } catch (err) {
    console.error('Mirror error:', err.message || err);
    process.exit(1);
  }
}

main();