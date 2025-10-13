module.exports = (req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({ SUPABASE_URL: url || null, SUPABASE_ANON_KEY: key || null }));
};