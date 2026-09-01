const { generateComparison } = require('../../ai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ enabled: false, error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const query = typeof body.query === 'string' ? body.query.trim().slice(0, 120) : '';
    const products = Array.isArray(body.products) ? body.products.slice(0, 12) : [];

    if (!query) return res.status(400).json({ enabled: false, error: 'query is required' });

    const result = await generateComparison({ query, products });
    return res.status(result.enabled ? 200 : 503).json(result);
  } catch (error) {
    console.error('AI comparison error:', error?.message || error);
    return res.status(502).json({ enabled: false, error: 'AI comparison is temporarily unavailable' });
  }
};
