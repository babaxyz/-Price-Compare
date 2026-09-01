module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ configured: false, error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return res.status(200).json({ configured: Boolean(url && key), url, key: key || null });
};
